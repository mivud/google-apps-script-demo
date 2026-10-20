-- Equipment management schema. Column names match the Google Sheet headers exactly.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid null references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  created_by text not null default '',
  last_modified_by text not null default ''
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  category_id uuid null references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'in_repair', 'retired')),
  quantity integer not null default 1 check (quantity >= 0),
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  created_by text not null default '',
  last_modified_by text not null default ''
);

create table if not exists public.maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  type text not null check (type in ('new', 'repair', 'replacement', 'maintenance')),
  performed_at timestamptz not null default now(),
  note text not null default '',
  created_at timestamptz not null default now(),
  modified_at timestamptz not null default now(),
  created_by text not null default '',
  last_modified_by text not null default ''
);

create index if not exists equipment_modified_at_idx on public.equipment (modified_at desc);
create index if not exists equipment_category_id_idx on public.equipment (category_id);
create index if not exists categories_parent_id_idx on public.categories (parent_id);
-- Sibling names are unique case-insensitively; roots share the zero uuid so NULL parents collide too.
create unique index if not exists categories_sibling_name_uq on public.categories (
  (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)), lower(btrim(name))
);
create index if not exists maintenance_logs_equipment_idx
  on public.maintenance_logs (equipment_id, performed_at desc);

-- Audit timestamps are server-owned: client-supplied values are overwritten.
-- created_by / last_modified_by are left as sent (default '') until login exists;
-- fill them from the authenticated user (e.g. auth.uid()) in this function later.
create or replace function public.set_audit_timestamps() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at = now();
    new.modified_at = new.created_at;
  else
    new.created_at = old.created_at;
    new.modified_at = now();
  end if;
  return new;
end;
$$;

-- Rejects a category that would become its own ancestor (message matches the Sheets backend).
create or replace function public.reject_category_cycle() returns trigger
language plpgsql as $$
declare
  cursor_id uuid := new.parent_id;
begin
  while cursor_id is not null loop
    if cursor_id = new.id then
      raise exception 'category_cycle' using errcode = '23514';
    end if;
    select parent_id into cursor_id from public.categories where id = cursor_id;
  end loop;
  return new;
end;
$$;

drop trigger if exists categories_reject_cycle on public.categories;
create trigger categories_reject_cycle
  before insert or update of parent_id on public.categories
  for each row execute function public.reject_category_cycle();

drop trigger if exists categories_set_audit on public.categories;
create trigger categories_set_audit
  before insert or update on public.categories
  for each row execute function public.set_audit_timestamps();

drop trigger if exists equipment_set_audit on public.equipment;
create trigger equipment_set_audit
  before insert or update on public.equipment
  for each row execute function public.set_audit_timestamps();

drop trigger if exists maintenance_logs_set_audit on public.maintenance_logs;
create trigger maintenance_logs_set_audit
  before insert or update on public.maintenance_logs
  for each row execute function public.set_audit_timestamps();
