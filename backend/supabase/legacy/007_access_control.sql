-- Identity module "access-control": effective access of a user (roles, primary role, claims).
-- Redefines current_app_role on user_roles (with the phase 1 legacy users.role fallback, see
-- identity_role_names in 006) and adds the RPCs current_identity() and preview_access(uuid).
-- Depends on 003-006. Idempotent.

-- Effective claims: distinct role claims, minus role claims whose key the user overrides with an
-- own claim, plus the own claims. Sorted by key then value with a plain (C collation) compare.
create or replace function public.identity_effective_claims(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with role_side as (
    select distinct rc.key, rc.value
      from public.user_roles ur
      join public.role_claims rc on rc.role_id = ur.role_id
     where ur.user_id = p_user_id
  ),
  own_side as (
    select distinct uc.key, uc.value from public.user_claims uc where uc.user_id = p_user_id
  ),
  merged as (
    select rs.key, rs.value from role_side rs
     where rs.key not in (select os.key from own_side os)
    union
    select os.key, os.value from own_side os
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('key', m.key, 'value', m.value)
              order by m.key collate "C", m.value collate "C"),
    '[]'::jsonb)
  from merged m;
$$;

-- Access document of one user: { email, role, roles, claims }.
create or replace function public.identity_access_json(p_user_id uuid)
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select json_build_object(
    'email', u.email,
    'role', public.identity_primary_role(u.id),
    'roles', to_json(public.identity_role_names(u.id)),
    'claims', public.identity_effective_claims(u.id)::json)
  from public.users u
  where u.id = p_user_id;
$$;

revoke all on function public.identity_effective_claims(uuid) from public, anon, authenticated;
revoke all on function public.identity_access_json(uuid) from public, anon, authenticated;

-- Same name and signature as 003, so existing policies keep working. Null when the primary role is empty.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nullif(public.identity_primary_role(u.id), '')
  from public.users u
  where u.active
    and lower(u.email) = lower(auth.jwt() ->> 'email')
    and public.is_google_login()
  limit 1;
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- Access of the caller. Null (no row) for unknown or inactive users and non-Google logins.
create or replace function public.current_identity()
returns json
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.identity_access_json(u.id)
  from public.users u
  where u.active
    and lower(u.email) = lower(auth.jwt() ->> 'email')
    and public.is_google_login()
  limit 1;
$$;

revoke all on function public.current_identity() from public, anon;
grant execute on function public.current_identity() to authenticated;

-- Admin only; the target user does not need to be active. Errors: FORBIDDEN, NOT_FOUND (message = code).
create or replace function public.preview_access(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result json;
begin
  if public.current_app_role() is distinct from 'admin' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  result := public.identity_access_json(p_user_id);
  if result is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  return result;
end
$$;

revoke all on function public.preview_access(uuid) from public, anon;
grant execute on function public.preview_access(uuid) to authenticated;

-- Manual verification (run in the SQL editor; everything is rolled back). Expected results are noted.
-- begin;
--   insert into public.claims (key, value) values ('a', '1'), ('a', '3'), ('a', '9'), ('b', '2');
--   insert into public.roles (name, description) values ('r1', ''), ('r2', '');
--   insert into public.users (email, active, role) values ('vectors@example.com', true, '');
--   insert into public.user_roles (user_id, role_id)
--     select u.id, r.id from public.users u, public.roles r
--      where u.email = 'vectors@example.com' and r.name in ('r1', 'r2');
--   insert into public.role_claims (role_id, key, value)
--     select r.id, c.key, c.value from public.roles r, public.claims c
--      where (r.name = 'r1' and (c.key, c.value) in (('a', '1'), ('b', '2')))
--         or (r.name = 'r2' and (c.key, c.value) = ('a', '3'));
--   -- user {}      -> [a=1, a=3, b=2]
--   select public.identity_effective_claims(id) from public.users where email = 'vectors@example.com';
--   -- user {a=9}   -> [a=9, b=2]
--   insert into public.user_claims (user_id, key, value)
--     select id, 'a', '9' from public.users where email = 'vectors@example.com';
--   select public.identity_effective_claims(id) from public.users where email = 'vectors@example.com';
--   -- user {b=2}   -> [a=1, a=3, b=2]
--   delete from public.user_claims;
--   insert into public.user_claims (user_id, key, value)
--     select id, 'b', '2' from public.users where email = 'vectors@example.com';
--   select public.identity_effective_claims(id) from public.users where email = 'vectors@example.com';
--   -- primary role: no admin/viewer role and users.role = '' -> ''; roles -> ["r1","r2"]
--   select public.identity_access_json(id) from public.users where email = 'vectors@example.com';
-- rollback;
