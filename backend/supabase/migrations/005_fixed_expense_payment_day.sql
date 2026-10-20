-- Module "expense-tracking": payment day on fixed expense templates and a paid flag on fixed expenses.
-- Existing grants and RLS policies (004) are table-level, so the new columns are covered without changes.
-- Domain violations raise the stable code as the exception message (payment_day_invalid, expense_not_fixed).
-- Depends on 004_expense_tracking.sql. Idempotent.

alter table public.fixed_expense_templates
  add column if not exists payment_day smallint check (payment_day is null or payment_day between 1 and 31);

alter table public.expenses
  add column if not exists paid_at timestamptz;

-- Runs before the check constraint, so clients get the stable code instead of a raw constraint error.
create or replace function public.fixed_templates_guard_payment_day()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.payment_day is not null and new.payment_day not between 1 and 31 then
    raise exception 'payment_day_invalid';
  end if;
  return new;
end
$$;

drop trigger if exists fixed_expense_templates_guard_payment_day on public.fixed_expense_templates;
create trigger fixed_expense_templates_guard_payment_day before insert or update on public.fixed_expense_templates
  for each row execute function public.fixed_templates_guard_payment_day();

-- Only fixed expenses can be marked as paid.
create or replace function public.expenses_guard_paid_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.paid_at is not null and not new.is_fixed then
    raise exception 'expense_not_fixed';
  end if;
  return new;
end
$$;

drop trigger if exists expenses_guard_paid_at on public.expenses;
create trigger expenses_guard_paid_at before insert or update on public.expenses
  for each row execute function public.expenses_guard_paid_at();

-- Same as 004, but spent_on follows the template payment day (capped to the month length; the 1st when
-- null). statement_month stays p_month: the 004 default trigger only fills it when it is null.
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

  perform set_config('app.generating_fixed', 'on', true);

  return query
  with due as (
    select t.id, t.description, t.amount, t.payment_method_id,
           least((p_month || '-01')::date + (coalesce(t.payment_day, 1) - 1),
                 ((p_month || '-01')::date + interval '1 month - 1 day')::date) as due_on
      from public.fixed_expense_templates t
     where t.active
       and (t.total_months is null or t.months_added < t.total_months)
       and not exists (select 1 from public.expenses e
                        where e.template_id = t.id and e.statement_month = p_month)
  ),
  created as (
    insert into public.expenses
      (description, amount, payment_method_id, spent_on, statement_month, is_fixed, template_id)
    select d.description, d.amount, d.payment_method_id, d.due_on, p_month, true, d.id
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
