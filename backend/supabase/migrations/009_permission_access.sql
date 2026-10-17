-- Permission based access: the `super` role replaces `admin` as the only bypass, `viewer` is dropped.
-- Identity tables need permission=identity.read / identity.write, device-management tables need
-- permission=device.mgt.read / device.mgt.write (expense tables keep expense.read / expense.write from 008).
-- The legacy users.role fallback is gone: roles come from user_roles only. The admin and viewer role rows and
-- their assignments are kept as data, they just carry no special meaning any more.
-- Lockout codes: last_admin is renamed last_super, self_lockout stays.
-- Depends on 003-008. Idempotent. Phase 2 (drop users.role) is still a separate step.

-- 1. Role names without the legacy fallback (same result as phase2/008, column not dropped here).
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

revoke all on function public.identity_role_names(uuid) from public, anon, authenticated;
revoke all on function public.identity_primary_role(uuid) from public, anon, authenticated;

-- 2. Built-in super role and a lockout-safe migration of the old admin data.
insert into public.roles (name, description)
values ('super', 'Full access, bypasses every permission check')
on conflict ((lower(name))) do nothing;

-- Every admin assignment also gets super, so nobody loses access when the admin bypass disappears.
insert into public.user_roles (user_id, role_id)
select ur.user_id, s.id
  from public.user_roles ur
  join public.roles a on a.id = ur.role_id and a.name = 'admin'
  join public.roles s on s.name = 'super'
on conflict do nothing;

-- Legacy admins that never got a user_roles row relied on the dropped users.role fallback.
insert into public.user_roles (user_id, role_id)
select u.id, s.id
  from public.users u
  join public.roles s on s.name = 'super'
 where u.role = 'admin'
   and not exists (select 1 from public.user_roles x where x.user_id = u.id)
on conflict do nothing;

-- Only super is a protected built-in role now.
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

-- 3. Lockout rules on super (last_super, self_lockout).
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

-- user_roles keeps one row per (user, role), so no other assignment can be super.
create or replace function public.identity_stays_super_without_role(p_user_id uuid, p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                  where ur.user_id = p_user_id and ur.role_id <> p_role_id and r.name = 'super');
$$;

revoke all on function public.identity_assert_super_removable(uuid) from public, anon, authenticated;
revoke all on function public.identity_assert_super_email_change_allowed(uuid) from public, anon, authenticated;
revoke all on function public.identity_stays_super_without_role(uuid, uuid) from public, anon, authenticated;

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
    if role_name = 'super' and not public.identity_stays_super_without_role(old.user_id, old.role_id) then
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

drop function if exists public.identity_assert_admin_removable(uuid);
drop function if exists public.identity_assert_admin_email_change_allowed(uuid);
drop function if exists public.identity_stays_admin_without_role(uuid, uuid);

-- 4. Effective claims: additive (key, value) merge. A role claim is dropped only when the user owns the exact
-- same (key, value); a different value of the same key no longer overrides it. Sorted with a C collation.
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

revoke all on function public.identity_effective_claims(uuid) from public, anon, authenticated;

-- 5. Caller helpers. current_app_role() now returns 'super' or null.
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

revoke all on function public.has_role(text) from public, anon;
grant execute on function public.has_role(text) to authenticated;

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

revoke all on function public.has_claim(text, text) from public, anon;
grant execute on function public.has_claim(text, text) to authenticated;

-- Needs identity.read (super bypasses); the target user does not need to be active.
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

revoke all on function public.preview_access(uuid) from public, anon;
grant execute on function public.preview_access(uuid) to authenticated;

-- 6. RLS. Identity tables: identity.read / identity.write. users keeps "own row read" from 003.
do $$
declare
  t text;
begin
  foreach t in array array['claims', 'roles', 'users', 'user_roles', 'role_claims', 'user_claims'] loop
    execute format('drop policy if exists "admin read" on public.%I', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);

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

  -- Only roles and users are updatable (claims and assignments are immutable).
  foreach t in array array['roles', 'users'] loop
    execute format('drop policy if exists "identity update" on public.%I', t);
    execute format(
      'create policy "identity update" on public.%I for update to authenticated
         using (public.has_claim(''permission'', ''identity.write''))
         with check (public.has_claim(''permission'', ''identity.write''))', t);
  end loop;
end
$$;

-- Device-management tables: device.mgt.read / device.mgt.write. The old admin/viewer policies are dropped.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'equipment', 'maintenance_logs'] loop
    execute format('drop policy if exists "roles read" on public.%I', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);

    execute format('drop policy if exists "device read" on public.%I', t);
    execute format(
      'create policy "device read" on public.%I for select to authenticated
         using (public.has_claim(''permission'', ''device.mgt.read''))', t);

    execute format('drop policy if exists "device insert" on public.%I', t);
    execute format(
      'create policy "device insert" on public.%I for insert to authenticated
         with check (public.has_claim(''permission'', ''device.mgt.write''))', t);

    execute format('drop policy if exists "device update" on public.%I', t);
    execute format(
      'create policy "device update" on public.%I for update to authenticated
         using (public.has_claim(''permission'', ''device.mgt.write''))
         with check (public.has_claim(''permission'', ''device.mgt.write''))', t);

    execute format('drop policy if exists "device delete" on public.%I', t);
    execute format(
      'create policy "device delete" on public.%I for delete to authenticated
         using (public.has_claim(''permission'', ''device.mgt.write''))', t);
  end loop;
end
$$;
