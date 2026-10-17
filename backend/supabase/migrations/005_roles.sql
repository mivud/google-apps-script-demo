-- Identity module "roles": roles catalog with the built-in roles admin and viewer.
-- role_in_use is enforced in 006 once user_roles exists. Depends on 004. Idempotent.

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

-- Backstop for the duplicate trigger below (race between two concurrent inserts).
create unique index if not exists roles_name_lower_key on public.roles (lower(name));

alter table public.roles enable row level security;

drop trigger if exists roles_audit on public.roles;
create trigger roles_audit
  before insert or update on public.roles
  for each row execute function public.set_audit_columns();

create or replace function public.roles_guard_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.name in ('admin', 'viewer') then
      raise exception 'role_protected';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.name in ('admin', 'viewer') and new.name <> old.name then
    raise exception 'role_protected';
  end if;

  if (tg_op = 'INSERT' or lower(new.name) <> lower(old.name))
     and exists (select 1 from public.roles r where lower(r.name) = lower(new.name) and r.id <> new.id) then
    raise exception 'role_name_duplicate';
  end if;
  return new;
end
$$;

revoke all on function public.roles_guard_write() from public, anon, authenticated;

drop trigger if exists roles_guard_write on public.roles;
create trigger roles_guard_write
  before insert or update or delete on public.roles
  for each row execute function public.roles_guard_write();

-- Built-in roles (created_by becomes 'system' because there is no JWT in the SQL editor).
insert into public.roles (name, description)
values ('admin', 'Full access, including identity management'),
       ('viewer', 'Read-only access')
on conflict ((lower(name))) do nothing;

revoke all on public.roles from anon, authenticated;
grant select, insert, update, delete on public.roles to authenticated;

drop policy if exists "admin read" on public.roles;
create policy "admin read" on public.roles
  for select to authenticated
  using (public.current_app_role() = 'admin');

drop policy if exists "admin insert" on public.roles;
create policy "admin insert" on public.roles
  for insert to authenticated
  with check (public.current_app_role() = 'admin');

drop policy if exists "admin update" on public.roles;
create policy "admin update" on public.roles
  for update to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

drop policy if exists "admin delete" on public.roles;
create policy "admin delete" on public.roles
  for delete to authenticated
  using (public.current_app_role() = 'admin');
