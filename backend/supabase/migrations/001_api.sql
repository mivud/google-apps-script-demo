-- Shared API layer: caller identification, audit columns and access resolution used by every module.
-- Run first. The functions read the identity tables created by 002_users.sql, so function body checks are
-- switched off for this file (they only run at call time, after 002 exists). Idempotent.

set check_function_bodies = off;

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

-- Only a Google login counts: another Supabase provider (e.g. email signup) could claim an allowlisted email.
create or replace function public.is_google_login()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
    and coalesce(auth.jwt() -> 'user_metadata' ->> 'email_verified', 'false') = 'true';
$$;

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

-- Role names of a user, sorted with a plain (C collation) compare.
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
    '{}'::text[]);
$$;

-- Primary role: 'super' or '' (refused). Other roles only carry claims.
create or replace function public.identity_primary_role(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when 'super' = any (public.identity_role_names(p_user_id)) then 'super' else '' end;
$$;

-- Effective claims: additive (key, value) merge of role claims and own claims. A role claim is dropped only
-- when the user owns the exact same (key, value). Sorted by key then value with a C collation.
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
     where not exists (select 1 from own_side os where os.key = rs.key and os.value = rs.value)
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

-- Named current_app_role (not current_role) because CURRENT_ROLE is a reserved SQL keyword.
-- Returns 'super' or null. Security definer lets policies read the allowlist without client access to it.
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

-- True when the verified Google caller is active and holds the named role.
create or replace function public.has_role(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p_name = any (public.identity_role_names(u.id))
       from public.users u
      where u.active
        and lower(u.email) = lower(auth.jwt() ->> 'email')
        and public.is_google_login()
      limit 1),
    false);
$$;

-- Only the super role bypasses; everyone else needs the effective claim (key, value).
create or replace function public.has_claim(p_key text, p_value text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select 'super' = any (public.identity_role_names(u.id))
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

-- Needs identity.read (super bypasses); the target user does not need to be active.
-- Errors: FORBIDDEN, NOT_FOUND (message = code).
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
  if not public.has_claim('permission', 'identity.read') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  result := public.identity_access_json(p_user_id);
  if result is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  return result;
end
$$;

-- Internal helpers: only triggers and other definer functions call them.
revoke all on function public.caller_email() from public, anon, authenticated;
revoke all on function public.set_audit_columns() from public, anon, authenticated;
revoke all on function public.identity_role_names(uuid) from public, anon, authenticated;
revoke all on function public.identity_primary_role(uuid) from public, anon, authenticated;
revoke all on function public.identity_effective_claims(uuid) from public, anon, authenticated;
revoke all on function public.identity_access_json(uuid) from public, anon, authenticated;

-- Callable by a signed-in client (RLS policies and RPCs).
revoke all on function public.is_google_login() from public, anon;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.has_role(text) from public, anon;
revoke all on function public.has_claim(text, text) from public, anon;
revoke all on function public.current_identity() from public, anon;
revoke all on function public.preview_access(uuid) from public, anon;
grant execute on function public.is_google_login() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_claim(text, text) to authenticated;
grant execute on function public.current_identity() to authenticated;
grant execute on function public.preview_access(uuid) to authenticated;

reset check_function_bodies;
