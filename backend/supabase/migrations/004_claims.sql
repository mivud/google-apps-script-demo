-- Identity module "claims": shared audit/caller helpers and the claims catalog.
-- Domain violations raise exceptions whose MESSAGE is the stable domain code (same codes as the Sheets backend).
-- Depends on 003 (is_google_login, current_app_role). Idempotent.

-- Email of the verified caller (lowercase), empty when there is no JWT (SQL editor, service role).
create or replace function public.caller_email()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Internal helper: only triggers and other definer functions use it.
revoke all on function public.caller_email() from public, anon, authenticated;

-- Audit columns come from the verified JWT and the server clock, never from the client.
-- Millisecond precision keeps the value stable when a JS client round-trips it (optimistic concurrency).
create or replace function public.set_audit_columns()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'system');
  stamp timestamptz := date_trunc('milliseconds', clock_timestamp());
begin
  if tg_op = 'INSERT' then
    new.created := stamp;
    new.created_by := actor;
  else
    new.created := old.created;
    new.created_by := old.created_by;
  end if;
  new.last_modified := stamp;
  new.last_modified_by := actor;
  return new;
end
$$;

revoke all on function public.set_audit_columns() from public, anon, authenticated;

create table if not exists public.claims (
  key text not null,
  value text not null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (key, value),
  constraint claim_key_invalid check (key ~ '^[a-z][a-z0-9_.:-]{0,63}$'),
  constraint claim_value_invalid check (char_length(value) between 1 and 200 and value !~ '[[:cntrl:]]')
);

alter table public.claims enable row level security;

drop trigger if exists claims_audit on public.claims;
create trigger claims_audit
  before insert or update on public.claims
  for each row execute function public.set_audit_columns();

create or replace function public.claims_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.claims c where c.key = new.key and c.value = new.value) then
    raise exception 'claim_duplicate';
  end if;
  return new;
end
$$;

revoke all on function public.claims_guard_insert() from public, anon, authenticated;

drop trigger if exists claims_guard_insert on public.claims;
create trigger claims_guard_insert
  before insert on public.claims
  for each row execute function public.claims_guard_insert();

-- Claims are immutable (create or delete only). claim_in_use is enforced in 006 once the usage tables exist.
revoke all on public.claims from anon, authenticated;
grant select, insert, delete on public.claims to authenticated;

drop policy if exists "admin read" on public.claims;
create policy "admin read" on public.claims
  for select to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "admin insert" on public.claims;
create policy "admin insert" on public.claims
  for insert to authenticated
  with check (public.current_app_role() = 'admin');

drop policy if exists "admin delete" on public.claims;
create policy "admin delete" on public.claims
  for delete to authenticated
  using (public.current_app_role() = 'admin');
