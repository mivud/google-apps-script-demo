-- Module "device-management": categories, equipment and maintenance logs. Column names match the Google Sheet
-- headers exactly. Access: permission=device.mgt.read (select) and device.mgt.write (insert/update/delete);
-- the super role passes both. Domain violations raise the stable code as the exception message.
-- Depends on 001_api.sql (has_claim). Idempotent.

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
-- created_by / last_modified_by are left as sent (default '').
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

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'equipment', 'maintenance_logs'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_audit', t);
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_timestamps()', t || '_set_audit', t);

    -- RLS: no anon access; read needs device.mgt.read, writes need device.mgt.write.
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

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
