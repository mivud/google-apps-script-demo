-- Identity modules "users": audit columns on users, user_roles, role_claims, user_claims and all
-- cross-table invariants (last_admin, self_lockout, role_in_use, claim_in_use, claim_unknown, limits).
-- Exception MESSAGE = stable domain code. Depends on 003, 004, 005. Idempotent.
--
-- KNOWN GAP (phase 1 legacy fallback): until phase 2 backfills user_roles from users.role (see the top of
-- phase2/008), a legacy user with NO user_roles rows stays admin through the users.role fallback, even after
-- their last explicit role is unassigned. This matches the Sheets behavior and is intentional until phase 2.

-- 1. users: rename timestamps to the audit names, add *_by, relax the legacy role column.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'created_at')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'created') then
    alter table public.users rename column created_at to created;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'updated_at')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'last_modified') then
    alter table public.users rename column updated_at to last_modified;
  end if;
end
$$;

alter table public.users add column if not exists created_by text not null default 'system';
alter table public.users add column if not exists last_modified_by text not null default 'system';

-- Legacy role: new code writes it empty, so '' must be allowed (removed in phase 2, file 008).
alter table public.users alter column role set default '';
alter table public.users drop constraint if exists users_role_check;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_role_legacy_check'
                 and conrelid = 'public.users'::regclass) then
    alter table public.users add constraint users_role_legacy_check check (role in ('admin', 'viewer', ''));
  end if;
  -- NOT VALID: enforced for new writes without failing on rows created before this migration.
  if not exists (select 1 from pg_constraint where conname = 'user_email_invalid'
                 and conrelid = 'public.users'::regclass) then
    alter table public.users add constraint user_email_invalid
      check (char_length(email) <= 254 and email !~ '[[:cntrl:]]'
             and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') not valid;
  end if;
end
$$;

-- 2. New tables.
create table if not exists public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (user_id, role_id)
);

create table if not exists public.role_claims (
  role_id uuid not null references public.roles (id) on delete cascade,
  key text not null,
  value text not null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (role_id, key, value)
);

create table if not exists public.user_claims (
  user_id uuid not null references public.users (id) on delete cascade,
  key text not null,
  value text not null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (user_id, key, value)
);

create index if not exists user_roles_role_id_idx on public.user_roles (role_id);

-- Composite FKs: a concurrent claim delete can never leave a dangling role/user claim. The guard triggers below
-- report the stable codes first; the FK is the race-proof backstop.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'role_claims_claim_fk'
                 and conrelid = 'public.role_claims'::regclass) then
    alter table public.role_claims add constraint role_claims_claim_fk
      foreign key (key, value) references public.claims (key, value) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_claims_claim_fk'
                 and conrelid = 'public.user_claims'::regclass) then
    alter table public.user_claims add constraint user_claims_claim_fk
      foreign key (key, value) references public.claims (key, value) on delete restrict;
  end if;
end
$$;

-- 3. Internal helpers (definer, not callable by clients).
-- Role names of a user: names from user_roles; LEGACY FALLBACK (phase 1) to users.role when none.
create or replace function public.identity_role_names(p_user_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select array_agg(r.name order by r.name collate "C")
       from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.user_id = p_user_id),
    (select array[u.role] from public.users u where u.id = p_user_id and u.role in ('admin', 'viewer')),
    '{}'::text[]
  );
$$;

-- Primary role (legacy-compatible): admin > viewer > '' (refused).
create or replace function public.identity_primary_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when 'admin' = any (public.identity_role_names(p_user_id)) then 'admin'
    when 'viewer' = any (public.identity_role_names(p_user_id)) then 'viewer'
    else ''
  end;
$$;

-- Same rule as the Sheets AdminLockoutRule: only an ACTIVE ADMIN is protected. Raises last_admin when it is the
-- only active admin, and self_lockout when the caller is that admin. A non-admin (or inactive) user never raises.
-- The advisory lock serializes concurrent admin removals so two sessions cannot both pass the count check.
create or replace function public.identity_assert_admin_removable(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target record;
  admin_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('identity_admin'));

  select u.email, u.active into target from public.users u where u.id = p_user_id;
  if not found or not target.active or public.identity_primary_role(p_user_id) <> 'admin' then
    return;
  end if;

  select count(*) into admin_count
    from public.users u where u.active and public.identity_primary_role(u.id) = 'admin';
  if admin_count <= 1 then
    raise exception 'last_admin';
  end if;

  if public.caller_email() <> '' and public.caller_email() = lower(target.email) then
    raise exception 'self_lockout';
  end if;
end
$$;

-- Changing the email of the caller's own admin row would cut them off (the token email no longer matches).
create or replace function public.identity_assert_admin_email_change_allowed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target record;
begin
  perform pg_advisory_xact_lock(hashtext('identity_admin'));

  select u.email, u.active into target from public.users u where u.id = p_user_id;
  if not found or not target.active or public.identity_primary_role(p_user_id) <> 'admin' then
    return;
  end if;
  if public.caller_email() <> '' and public.caller_email() = lower(target.email) then
    raise exception 'self_lockout';
  end if;
end
$$;

-- True when the user is still admin once the given role assignment is removed: the other explicit roles contain
-- admin, or none are left and the legacy users.role fallback says admin (same as Sheets EffectiveAccess).
create or replace function public.identity_stays_admin_without_role(p_user_id uuid, p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                  where ur.user_id = p_user_id and ur.role_id <> p_role_id) then
      exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
               where ur.user_id = p_user_id and ur.role_id <> p_role_id and r.name = 'admin')
    else coalesce((select u.role = 'admin' from public.users u where u.id = p_user_id), false)
  end;
$$;

revoke all on function public.identity_role_names(uuid) from public, anon, authenticated;
revoke all on function public.identity_primary_role(uuid) from public, anon, authenticated;
revoke all on function public.identity_assert_admin_removable(uuid) from public, anon, authenticated;
revoke all on function public.identity_assert_admin_email_change_allowed(uuid) from public, anon, authenticated;
revoke all on function public.identity_stays_admin_without_role(uuid, uuid) from public, anon, authenticated;

-- 4. Triggers: audit columns.
do $$
declare
  t text;
begin
  foreach t in array array['users', 'user_roles', 'role_claims', 'user_claims'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()', t || '_audit', t);
  end loop;
end
$$;

-- 5. Triggers: users.
create or replace function public.users_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.identity_assert_admin_removable(old.id);
    return old;
  end if;

  if (tg_op = 'INSERT' or lower(new.email) <> lower(old.email))
     and exists (select 1 from public.users u where lower(u.email) = lower(new.email) and u.id <> new.id) then
    raise exception 'user_email_duplicate';
  end if;

  if tg_op = 'UPDATE' and old.active and not new.active then
    perform public.identity_assert_admin_removable(old.id);
  elsif tg_op = 'UPDATE' and lower(new.email) <> lower(old.email) then
    perform public.identity_assert_admin_email_change_allowed(old.id);
  end if;
  return new;
end
$$;

revoke all on function public.users_guard_write() from public, anon, authenticated;

drop trigger if exists users_guard_write on public.users;
create trigger users_guard_write
  before insert or update or delete on public.users
  for each row execute function public.users_guard_write();

-- 6. Triggers: user_roles (max 20 roles per user, last_admin / self_lockout on unassign).
create or replace function public.user_roles_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  role_name text;
begin
  if tg_op = 'DELETE' then
    select r.name into role_name from public.roles r where r.id = old.role_id;
    if role_name = 'admin' and not public.identity_stays_admin_without_role(old.user_id, old.role_id) then
      perform public.identity_assert_admin_removable(old.user_id);
    end if;
    return old;
  end if;

  if (select count(*) from public.user_roles ur where ur.user_id = new.user_id) >= 20 then
    raise exception 'limit_exceeded';
  end if;

  -- A legacy admin (no user_roles yet) stops being admin when the first non-admin role is assigned.
  select r.name into role_name from public.roles r where r.id = new.role_id;
  if role_name <> 'admin'
     and not exists (select 1 from public.user_roles ur where ur.user_id = new.user_id) then
    perform public.identity_assert_admin_removable(new.user_id);
  end if;
  return new;
end
$$;

revoke all on function public.user_roles_guard_write() from public, anon, authenticated;

drop trigger if exists user_roles_guard_write on public.user_roles;
create trigger user_roles_guard_write
  before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard_write();

-- 7. Triggers: role_claims / user_claims (claim must exist, no duplicates, max 100 each).
create or replace function public.role_claims_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- FOR SHARE blocks a concurrent delete of the claim until this insert commits.
  if not exists (select 1 from public.claims c where c.key = new.key and c.value = new.value for share) then
    raise exception 'claim_unknown';
  end if;
  if exists (select 1 from public.role_claims x
             where x.role_id = new.role_id and x.key = new.key and x.value = new.value) then
    raise exception 'claim_duplicate';
  end if;
  if (select count(*) from public.role_claims x where x.role_id = new.role_id) >= 100 then
    raise exception 'limit_exceeded';
  end if;
  return new;
end
$$;

create or replace function public.user_claims_guard_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.claims c where c.key = new.key and c.value = new.value for share) then
    raise exception 'claim_unknown';
  end if;
  if exists (select 1 from public.user_claims x
             where x.user_id = new.user_id and x.key = new.key and x.value = new.value) then
    raise exception 'claim_duplicate';
  end if;
  if (select count(*) from public.user_claims x where x.user_id = new.user_id) >= 100 then
    raise exception 'limit_exceeded';
  end if;
  return new;
end
$$;

revoke all on function public.role_claims_guard_insert() from public, anon, authenticated;
revoke all on function public.user_claims_guard_insert() from public, anon, authenticated;

drop trigger if exists role_claims_guard_insert on public.role_claims;
create trigger role_claims_guard_insert
  before insert on public.role_claims
  for each row execute function public.role_claims_guard_insert();

drop trigger if exists user_claims_guard_insert on public.user_claims;
create trigger user_claims_guard_insert
  before insert on public.user_claims
  for each row execute function public.user_claims_guard_insert();

-- 8. Triggers on 004/005 tables that needed the usage tables: claim_in_use, role_in_use.
create or replace function public.claims_guard_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.role_claims x where x.key = old.key and x.value = old.value)
     or exists (select 1 from public.user_claims x where x.key = old.key and x.value = old.value) then
    raise exception 'claim_in_use';
  end if;
  return old;
end
$$;

-- Trigger name sorts after roles_guard_write (triggers fire alphabetically), so a built-in role reports role_protected first.
create or replace function public.roles_guard_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.user_roles ur where ur.role_id = old.id) then
    raise exception 'role_in_use';
  end if;
  return old;
end
$$;

revoke all on function public.claims_guard_delete() from public, anon, authenticated;
revoke all on function public.roles_guard_delete() from public, anon, authenticated;

drop trigger if exists claims_guard_delete on public.claims;
create trigger claims_guard_delete
  before delete on public.claims
  for each row execute function public.claims_guard_delete();

drop trigger if exists roles_guard_in_use on public.roles;
drop trigger if exists roles_guard_write_in_use on public.roles;
create trigger roles_guard_write_in_use
  before delete on public.roles
  for each row execute function public.roles_guard_delete();

-- 9. Grants and RLS: only admin touches these tables directly; everyone else uses the RPCs in 007.
revoke all on public.users, public.user_roles, public.role_claims, public.user_claims from anon, authenticated;
-- Column-level update: clients can change only email and active, never the legacy role (last_admin bypass).
grant select, insert, delete on public.users to authenticated;
grant update (email, active) on public.users to authenticated;
grant select, insert, delete on public.user_roles, public.role_claims, public.user_claims to authenticated;

alter table public.user_roles enable row level security;
alter table public.role_claims enable row level security;
alter table public.user_claims enable row level security;

-- users keeps the "own row read" policy from 003.
drop policy if exists "admin read" on public.users;
create policy "admin read" on public.users
  for select to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "admin insert" on public.users;
create policy "admin insert" on public.users
  for insert to authenticated
  with check (public.current_app_role() = 'admin');

drop policy if exists "admin update" on public.users;
create policy "admin update" on public.users
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "admin delete" on public.users;
create policy "admin delete" on public.users
  for delete to authenticated
  using (public.current_app_role() = 'admin');

do $$
declare
  t text;
begin
  foreach t in array array['user_roles', 'role_claims', 'user_claims'] loop
    execute format('drop policy if exists "admin read" on public.%I', t);
    execute format(
      'create policy "admin read" on public.%I for select to authenticated
         using (public.current_app_role() = ''admin'')', t);

    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format(
      'create policy "admin insert" on public.%I for insert to authenticated
         with check (public.current_app_role() = ''admin'')', t);

    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format(
      'create policy "admin delete" on public.%I for delete to authenticated
         using (public.current_app_role() = ''admin'')', t);
  end loop;
end
$$;
