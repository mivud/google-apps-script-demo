-- PHASE 2 - DO NOT RUN NOW.
-- Run only after every environment uses the user_roles based code (no reader of users.role is left)
-- and each legacy user has at least one user_roles row (otherwise they lose access).
-- It removes the users.role column and the legacy fallback of the role names.
-- ORDER MATTERS: the backfill of user_roles from users.role (first statement below) must run BEFORE the
-- fallback is removed, otherwise legacy users lose their role and access.

-- Backfill: give every legacy user the user_roles row matching their users.role (built-in role names).
insert into public.user_roles (user_id, role_id, created_by, last_modified_by)
select u.id, r.id, 'system', 'system'
  from public.users u
  join public.roles r on r.name = u.role
 where u.role <> ''
on conflict do nothing;

-- Role names now come from user_roles only (redefined first so nothing references the dropped column).
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
    '{}'::text[]
  );
$$;

revoke all on function public.identity_role_names(uuid) from public, anon, authenticated;

alter table public.users drop constraint if exists users_role_legacy_check;
alter table public.users drop column if exists role;
