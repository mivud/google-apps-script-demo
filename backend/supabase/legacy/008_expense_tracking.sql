-- Module "expense-tracking": payment methods, fixed expense templates and expenses.
-- Access is claim based: claim permission=expense.read (select) and permission=expense.write (insert/update/delete);
-- the admin role passes both. Audit columns come from the JWT by trigger (set_audit_columns, 004).
-- Domain violations raise the stable code as the exception message (payment_method_in_use, ...).
-- Depends on 003-007. Idempotent.
-- True when the verified Google caller is admin or has the effective claim (key, value).
-- Reuses identity_effective_claims from 007, so own claims override role claims of the same key.
create or replace function public.has_claim(p_key text, p_value text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select public.current_app_role() = 'admin'
         or exists (
              select 1
                from jsonb_array_elements(public.identity_effective_claims(u.id)) c
               where c ->> 'key' = p_key and c ->> 'value' = p_value)
       from public.users u
      where u.active
        and lower(u.email) = lower(auth.jwt() ->> 'email')
        and public.is_google_login()
      limit 1),
    false);
$$;

revoke all on function public.has_claim(text, text) from public, anon;
grant execute on function public.has_claim(text, text) to authenticated;

create table if not exists public.payment_methods (
  id text primary key,
  name text not null,
  active boolean not null default true,
  statement_closing_day integer check (statement_closing_day between 1 and 31),
  color text check (color is null or color ~ '^#[0-9a-f]{6}$'),
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  constraint payment_method_id_format check (id ~ '^[a-z0-9_-]{1,40}$'),
  constraint payment_method_name_invalid check (char_length(btrim(name)) between 1 and 100)
);

create unique index if not exists payment_methods_name_lower_key on public.payment_methods (lower(name));

create table if not exists public.fixed_expense_templates (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount bigint check (amount is null or amount > 0),
  payment_method_id text references public.payment_methods (id) on delete restrict,
  active boolean not null default true,
  total_months integer check (total_months is null or total_months >= 1),
  months_added integer not null default 0 check (months_added >= 0),
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  constraint fixed_template_description_invalid check (char_length(btrim(description)) between 1 and 200)
);

-- Server-owned counters; the guard trigger below blocks client writes to months_added.
create or replace function public.fixed_templates_guard_write()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    new.months_added := 0;
  elsif new.months_added is distinct from old.months_added
        and coalesce(current_setting('app.generating_fixed', true), '') <> 'on' then
    new.months_added := old.months_added;
  end if;
  if new.total_months is not null and new.total_months < new.months_added then
    raise exception 'total_months_below_added';
  end if;
  return new;
end
$$;

drop trigger if exists fixed_expense_templates_guard_write on public.fixed_expense_templates;
create trigger fixed_expense_templates_guard_write before insert or update on public.fixed_expense_templates
  for each row execute function public.fixed_templates_guard_write();

create index if not exists fixed_expense_templates_payment_method_idx
  on public.fixed_expense_templates (payment_method_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount bigint check ((amount is null and template_id is not null) or amount > 0),
  payment_method_id text references public.payment_methods (id) on delete restrict,
  spent_on date not null,
  statement_month text not null,
  is_fixed boolean not null default false,
  template_id uuid references public.fixed_expense_templates (id) on delete set null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  constraint expense_description_invalid check (char_length(btrim(description)) between 1 and 200),
  constraint expense_payment_method_required check (payment_method_id is not null or template_id is not null),
  constraint expense_statement_month_invalid check (statement_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

create index if not exists expenses_statement_month_idx on public.expenses (statement_month, spent_on);
create index if not exists expenses_payment_method_idx on public.expenses (payment_method_id);

-- Makes generate_fixed_expenses idempotent, also under concurrent calls.
create unique index if not exists expenses_template_month_key
  on public.expenses (template_id, statement_month) where template_id is not null;

-- The id is user entered and permanent: validate it with a stable code and block changes.
create or replace function public.payment_methods_guard_write()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'payment_method_id_invalid';
  end if;
  if new.statement_closing_day is not null and new.statement_closing_day not between 1 and 31 then
    raise exception 'payment_method_closing_day_invalid';
  end if;
  if new.color is not null and new.color !~ '^#[0-9a-f]{6}$' then
    raise exception 'payment_method_color_invalid';
  end if;
  if new.id is null or new.id !~ '^[a-z0-9_-]{1,40}$' then
    raise exception 'payment_method_id_invalid';
  end if;
  return new;
end
$$;

drop trigger if exists payment_methods_guard_write on public.payment_methods;
create trigger payment_methods_guard_write before insert or update on public.payment_methods
  for each row execute function public.payment_methods_guard_write();

-- Audit triggers.
drop trigger if exists payment_methods_audit on public.payment_methods;
create trigger payment_methods_audit before insert or update on public.payment_methods
  for each row execute function public.set_audit_columns();

drop trigger if exists fixed_expense_templates_audit on public.fixed_expense_templates;
create trigger fixed_expense_templates_audit before insert or update on public.fixed_expense_templates
  for each row execute function public.set_audit_columns();

drop trigger if exists expenses_audit on public.expenses;
create trigger expenses_audit before insert or update on public.expenses
  for each row execute function public.set_audit_columns();

-- Stable code instead of a raw foreign key error when a payment method is still referenced.
create or replace function public.payment_methods_guard_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.expenses e where e.payment_method_id = old.id)
     or exists (select 1 from public.fixed_expense_templates t where t.payment_method_id = old.id) then
    raise exception 'payment_method_in_use';
  end if;
  return old;
end
$$;

revoke all on function public.payment_methods_guard_delete() from public, anon, authenticated;

drop trigger if exists payment_methods_guard_delete on public.payment_methods;
create trigger payment_methods_guard_delete before delete on public.payment_methods
  for each row execute function public.payment_methods_guard_delete();

-- Creates the missing fixed expenses of a month from the active templates that still have months left
-- (spent on the 1st), bumps months_added in the same statement and returns only the rows it created.
-- A repeated run inserts nothing and increments nothing. Security invoker: RLS applies (expense.write).
create or replace function public.generate_fixed_expenses(p_month text)
returns setof public.expenses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.has_claim('permission', 'expense.write') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_month is null or p_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then
    raise exception 'statement_month_invalid';
  end if;

  -- Transaction-local switch that lets the guard trigger accept the months_added increment below.
  perform set_config('app.generating_fixed', 'on', true);

  return query
  with due as (
    select t.id, t.description, t.amount, t.payment_method_id
      from public.fixed_expense_templates t
     where t.active
       and (t.total_months is null or t.months_added < t.total_months)
       and not exists (select 1 from public.expenses e
                        where e.template_id = t.id and e.statement_month = p_month)
  ),
  created as (
    insert into public.expenses
      (description, amount, payment_method_id, spent_on, statement_month, is_fixed, template_id)
    select d.description, d.amount, d.payment_method_id, (p_month || '-01')::date, p_month, true, d.id
      from due d
    on conflict (template_id, statement_month) where template_id is not null do nothing
    returning *
  ),
  bumped as (
    update public.fixed_expense_templates t
       set months_added = t.months_added + 1
     where t.id in (select c.template_id from created c)
    returning t.id
  )
  select c.* from created c;

  perform set_config('app.generating_fixed', 'off', true);
end
$$;

revoke all on function public.generate_fixed_expenses(text) from public, anon;
grant execute on function public.generate_fixed_expenses(text) to authenticated;

-- RLS: read needs expense.read, writes need expense.write. No anon access.
do $$
declare
  t text;
begin
  foreach t in array array['payment_methods', 'fixed_expense_templates', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists "expense read" on public.%I', t);
    execute format(
      'create policy "expense read" on public.%I for select to authenticated
         using (public.has_claim(''permission'', ''expense.read''))', t);

    execute format('drop policy if exists "expense insert" on public.%I', t);
    execute format(
      'create policy "expense insert" on public.%I for insert to authenticated
         with check (public.has_claim(''permission'', ''expense.write''))', t);

    execute format('drop policy if exists "expense update" on public.%I', t);
    execute format(
      'create policy "expense update" on public.%I for update to authenticated
         using (public.has_claim(''permission'', ''expense.write''))
         with check (public.has_claim(''permission'', ''expense.write''))', t);

    execute format('drop policy if exists "expense delete" on public.%I', t);
    execute format(
      'create policy "expense delete" on public.%I for delete to authenticated
         using (public.has_claim(''permission'', ''expense.write''))', t);
  end loop;
end
$$;

-- Statement month of a spending: the billing cycle closes on closing_day (capped to the month length);
-- spending after that day belongs to the next month's statement. Null closing day = calendar month.
create or replace function public.resolve_statement_month(p_spent_on date, p_closing_day integer)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select to_char(
    case
      when p_closing_day is null then p_spent_on
      when extract(day from p_spent_on) <=
           least(p_closing_day,
                 extract(day from (date_trunc('month', p_spent_on) + interval '1 month - 1 day'))::integer)
        then p_spent_on
      else (date_trunc('month', p_spent_on) + interval '1 month')::date
    end,
    'YYYY-MM');
$$;

-- Fills statement_month on insert when the client sent none. Definer so a writer without expense.read
-- can still resolve the closing day. Updates never recompute it.
create or replace function public.expenses_default_statement_month()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.statement_month is null then
    new.statement_month := public.resolve_statement_month(
    -- A null payment method finds no row, so the calendar month applies.
      new.spent_on,
      (select p.statement_closing_day from public.payment_methods p where p.id = new.payment_method_id));
  end if;
  return new;
end
$$;

revoke all on function public.expenses_default_statement_month() from public, anon, authenticated;

drop trigger if exists expenses_default_statement_month on public.expenses;
create trigger expenses_default_statement_month before insert on public.expenses
  for each row execute function public.expenses_default_statement_month();

-- Only template-generated rows may be pending (null amount); a set amount can never be cleared again.
create or replace function public.expenses_guard_amount()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.amount is null and (new.template_id is null or (tg_op = 'UPDATE' and old.amount is not null)) then
    raise exception 'expense_amount_required';
  end if;
  return new;
end
$$;

drop trigger if exists expenses_guard_amount on public.expenses;
create trigger expenses_guard_amount before insert or update on public.expenses
  for each row execute function public.expenses_guard_amount();

-- Only template-generated rows may lack a payment method; a set one can never be cleared again.
create or replace function public.expenses_guard_payment_method()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.payment_method_id is null
     and (new.template_id is null or (tg_op = 'UPDATE' and old.payment_method_id is not null)) then
    raise exception 'expense_payment_method_required';
  end if;
  return new;
end
$$;

drop trigger if exists expenses_guard_payment_method on public.expenses;
create trigger expenses_guard_payment_method before insert or update on public.expenses
  for each row execute function public.expenses_guard_payment_method();
