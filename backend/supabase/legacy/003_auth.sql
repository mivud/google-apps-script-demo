-- Google login: allowlist of users (by email) with a role. Supabase Auth verifies the Google ID token
-- (Authentication > Providers > Google, skip nonce check off); RLS then decides access by role.
-- The first admin is inserted by hand in the SQL editor, there is no user-management UI.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_key on public.users (lower(email));

alter table public.users enable row level security;

-- Only a Google login counts: another Supabase provider (e.g. email signup) could claim an allowlisted email.
create or replace function public.is_google_login()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google'
    and coalesce(auth.jwt() -> 'user_metadata' ->> 'email_verified', 'false') = 'true';
$$;

revoke all on function public.is_google_login() from public, anon;
grant execute on function public.is_google_login() to authenticated;

-- Named current_app_role (not current_role) because CURRENT_ROLE is a reserved SQL keyword.
-- Security definer lets policies read the allowlist without granting clients access to it.
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.role
  from public.users u
  where u.active
    and lower(u.email) = lower(auth.jwt() ->> 'email')
    and public.is_google_login()
  limit 1;
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- users: a client can only read its own active row; no client writes at all.
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;

drop policy if exists "own row read" on public.users;
create policy "own row read" on public.users
  for select to authenticated
  using (active and lower(email) = lower(auth.jwt() ->> 'email') and public.is_google_login());

-- Remove the v1 anon full access from 002.
drop policy if exists "v1 anon full access" on public.categories;
drop policy if exists "v1 anon full access" on public.equipment;
drop policy if exists "v1 anon full access" on public.maintenance_logs;

revoke all on public.categories, public.equipment, public.maintenance_logs from anon;

-- Domain tables: admin and viewer read, only admin writes.
do $$
declare
  t text;
begin
  foreach t in array array['categories', 'equipment', 'maintenance_logs'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "roles read" on public.%I', t);
    execute format(
      'create policy "roles read" on public.%I for select to authenticated
         using (public.current_app_role() in (''admin'', ''viewer''))', t);

    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format(
      'create policy "admin insert" on public.%I for insert to authenticated
         with check (public.current_app_role() = ''admin'')', t);

    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format(
      'create policy "admin update" on public.%I for update to authenticated
         using (public.current_app_role() = ''admin'')
         with check (public.current_app_role() = ''admin'')', t);

    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format(
      'create policy "admin delete" on public.%I for delete to authenticated
         using (public.current_app_role() = ''admin'')', t);
  end loop;
end
$$;
