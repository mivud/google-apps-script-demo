-- Module "users": allowlisted users, roles, claims and their assignments, with every cross-table invariant.
-- Access: permission=identity.read / identity.write (the built-in super role bypasses). A user can always read
-- its own active row. Domain violations raise an exception whose MESSAGE is the stable domain code
-- (last_super, self_lockout, role_in_use, claim_in_use, claim_unknown, limit_exceeded, ...).
-- Depends on 001_api.sql. Idempotent.
--
-- First super user (run once in the SQL editor, there is no JWT so the lockout rules do not apply):
--   insert into public.users (email) values ('you@example.com');
--   insert into public.user_roles (user_id, role_id)
--     select u.id, r.id from public.users u, public.roles r
--      where lower(u.email) = 'you@example.com' and r.name = 'super';

-- 1. Tables.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  active boolean not null default true,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  constraint user_email_invalid check (
    char_length(email) <= 254 and email !~ '[[:cntrl:]]' and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

create unique index if not exists users_email_lower_key on public.users (lower(email));

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  constraint role_name_invalid check (name ~ '^[a-z][a-z0-9_-]{1,31}$'),
  constraint role_description_invalid check (char_length(description) <= 200)
);

-- Backstop for the duplicate check in the guard trigger (race between two concurrent inserts).
create unique index if not exists roles_name_lower_key on public.roles (lower(name));

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

create table if not exists public.user_roles (
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (user_id, role_id)
);

-- Composite FKs to claims: a concurrent claim delete can never leave a dangling role/user claim. The guard
-- triggers report the stable codes first; the FK is the race-proof backstop.
create table if not exists public.role_claims (
  role_id uuid not null references public.roles (id) on delete cascade,
  key text not null,
  value text not null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (role_id, key, value),
  constraint role_claims_claim_fk foreign key (key, value) references public.claims (key, value) on delete restrict
);

create table if not exists public.user_claims (
  user_id uuid not null references public.users (id) on delete cascade,
  key text not null,
  value text not null,
  created timestamptz not null default now(),
  created_by text not null default 'system',
  last_modified timestamptz not null default now(),
  last_modified_by text not null default 'system',
  primary key (user_id, key, value),
  constraint user_claims_claim_fk foreign key (key, value) references public.claims (key, value) on delete restrict
);

create index if not exists user_roles_role_id_idx on public.user_roles (role_id);

-- 2. Audit triggers (set_audit_columns, 001).
do $$
declare
  t text;
begin
  foreach t in array array['users', 'roles', 'claims', 'user_roles', 'role_claims', 'user_claims'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()', t || '_audit', t);
  end loop;
end
$$;

-- 3. Lockout rules on super. The advisory lock serializes concurrent removals so two sessions cannot both
-- pass the count check.
-- Raises last_super when the user is the only active super, and self_lockout when the caller is that user.
create or replace function public.identity_assert_super_removable(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target record;
  super_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('identity_super'));

  select u.email, u.active into target from public.users u where u.id = p_user_id;
  if not found or not target.active or public.identity_primary_role(p_user_id) <> 'super' then
    return;
  end if;

  select count(*) into super_count
    from public.users u where u.active and public.identity_primary_role(u.id) = 'super';
  if super_count <= 1 then
    raise exception 'last_super';
  end if;

  if public.caller_email() <> '' and public.caller_email() = lower(target.email) then
    raise exception 'self_lockout';
  end if;
end
$$;

-- Changing the email of the caller's own super row would cut them off (the token email no longer matches).
create or replace function public.identity_assert_super_email_change_allowed(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target record;
begin
  perform pg_advisory_xact_lock(hashtext('identity_super'));

  select u.email, u.active into target from public.users u where u.id = p_user_id;
  if not found or not target.active or public.identity_primary_role(p_user_id) <> 'super' then
    return;
  end if;
  if public.caller_email() <> '' and public.caller_email() = lower(target.email) then
    raise exception 'self_lockout';
  end if;
end
$$;

revoke all on function public.identity_assert_super_removable(uuid) from public, anon, authenticated;
revoke all on function public.identity_assert_super_email_change_allowed(uuid) from public, anon, authenticated;

-- 4. Guard triggers (all security definer so they see rows the caller cannot read).
create or replace function public.users_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    perform public.identity_assert_super_removable(old.id);
    return old;
  end if;

  if (tg_op = 'INSERT' or lower(new.email) <> lower(old.email))
     and exists (select 1 from public.users u where lower(u.email) = lower(new.email) and u.id <> new.id) then
    raise exception 'user_email_duplicate';
  end if;

  if tg_op = 'UPDATE' and old.active and not new.active then
    perform public.identity_assert_super_removable(old.id);
  elsif tg_op = 'UPDATE' and lower(new.email) <> lower(old.email) then
    perform public.identity_assert_super_email_change_allowed(old.id);
  end if;
  return new;
end
$$;

-- super is the only protected built-in role. role_in_use is checked after role_protected.
create or replace function public.roles_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.name = 'super' then
      raise exception 'role_protected';
    end if;
    if exists (select 1 from public.user_roles ur where ur.role_id = old.id) then
      raise exception 'role_in_use';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.name = 'super' and new.name <> old.name then
    raise exception 'role_protected';
  end if;

  if (tg_op = 'INSERT' or lower(new.name) <> lower(old.name))
     and exists (select 1 from public.roles r where lower(r.name) = lower(new.name) and r.id <> new.id) then
    raise exception 'role_name_duplicate';
  end if;
  return new;
end
$$;

-- Claims are immutable (create or delete only).
create or replace function public.claims_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.role_claims x where x.key = old.key and x.value = old.value)
       or exists (select 1 from public.user_claims x where x.key = old.key and x.value = old.value) then
      raise exception 'claim_in_use';
    end if;
    return old;
  end if;

  if exists (select 1 from public.claims c where c.key = new.key and c.value = new.value) then
    raise exception 'claim_duplicate';
  end if;
  return new;
end
$$;

-- Max 20 roles per user; removing the super assignment follows the lockout rules.
create or replace function public.user_roles_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.roles r where r.id = old.role_id and r.name = 'super') then
      perform public.identity_assert_super_removable(old.user_id);
    end if;
    return old;
  end if;

  if (select count(*) from public.user_roles ur where ur.user_id = new.user_id) >= 20 then
    raise exception 'limit_exceeded';
  end if;
  return new;
end
$$;

-- role_claims / user_claims: the claim must exist, no duplicates, max 100 each.
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

revoke all on function public.users_guard_write() from public, anon, authenticated;
revoke all on function public.roles_guard_write() from public, anon, authenticated;
revoke all on function public.claims_guard_write() from public, anon, authenticated;
revoke all on function public.user_roles_guard_write() from public, anon, authenticated;
revoke all on function public.role_claims_guard_insert() from public, anon, authenticated;
revoke all on function public.user_claims_guard_insert() from public, anon, authenticated;

drop trigger if exists users_guard_write on public.users;
create trigger users_guard_write
  before insert or update or delete on public.users
  for each row execute function public.users_guard_write();

drop trigger if exists roles_guard_write on public.roles;
create trigger roles_guard_write
  before insert or update or delete on public.roles
  for each row execute function public.roles_guard_write();

drop trigger if exists claims_guard_write on public.claims;
create trigger claims_guard_write
  before insert or delete on public.claims
  for each row execute function public.claims_guard_write();

drop trigger if exists user_roles_guard_write on public.user_roles;
create trigger user_roles_guard_write
  before insert or delete on public.user_roles
  for each row execute function public.user_roles_guard_write();

drop trigger if exists role_claims_guard_insert on public.role_claims;
create trigger role_claims_guard_insert
  before insert on public.role_claims
  for each row execute function public.role_claims_guard_insert();

drop trigger if exists user_claims_guard_insert on public.user_claims;
create trigger user_claims_guard_insert
  before insert on public.user_claims
  for each row execute function public.user_claims_guard_insert();

-- 5. Grants and RLS. No anon access. Only roles and users are updatable (claims and assignments are
-- immutable); clients can change only email and active on users.
revoke all on public.users, public.roles, public.claims,
              public.user_roles, public.role_claims, public.user_claims from anon, authenticated;
grant select, insert, delete on public.users, public.roles, public.claims,
                                public.user_roles, public.role_claims, public.user_claims to authenticated;
grant update (email, active) on public.users to authenticated;
grant update (name, description) on public.roles to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['users', 'roles', 'claims', 'user_roles', 'role_claims', 'user_claims'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "identity read" on public.%I', t);
    execute format(
      'create policy "identity read" on public.%I for select to authenticated
         using (public.has_claim(''permission'', ''identity.read''))', t);

    execute format('drop policy if exists "identity insert" on public.%I', t);
    execute format(
      'create policy "identity insert" on public.%I for insert to authenticated
         with check (public.has_claim(''permission'', ''identity.write''))', t);

    execute format('drop policy if exists "identity delete" on public.%I', t);
    execute format(
      'create policy "identity delete" on public.%I for delete to authenticated
         using (public.has_claim(''permission'', ''identity.write''))', t);
  end loop;

  foreach t in array array['roles', 'users'] loop
    execute format('drop policy if exists "identity update" on public.%I', t);
    execute format(
      'create policy "identity update" on public.%I for update to authenticated
         using (public.has_claim(''permission'', ''identity.write''))
         with check (public.has_claim(''permission'', ''identity.write''))', t);
  end loop;
end
$$;

-- A user can always read its own active row (the login flow needs it before any claim is known).
drop policy if exists "own row read" on public.users;
create policy "own row read" on public.users
  for select to authenticated
  using (active and lower(email) = lower(auth.jwt() ->> 'email') and public.is_google_login());

-- 6. Seed: the built-in super role and the permission claims used by the modules.
insert into public.roles (name, description)
values ('super', 'Full access, bypasses every permission check')
on conflict ((lower(name))) do nothing;

insert into public.claims (key, value)
values ('permission', 'identity.read'),
       ('permission', 'identity.write'),
       ('permission', 'device.mgt.read'),
       ('permission', 'device.mgt.write'),
       ('permission', 'expense.read'),
       ('permission', 'expense.write')
on conflict (key, value) do nothing;
