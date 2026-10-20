-- Module "device-management": purchase/warranty details, note and seller on equipment, service provider on
-- maintenance logs. All new columns are nullable (old rows stay null) and keep the Google Sheet header names.
-- Existing grants and RLS policies (003) are table-level, so the new columns are covered without changes;
-- audit columns and their triggers are untouched.
-- Domain violations raise the stable code as the exception message (purchase_date_invalid,
-- warranty_months_invalid, warranty_requires_purchase_date, note_too_long, vendor_too_long).
-- Depends on 003_device_management.sql. Idempotent.

alter table public.equipment
  add column if not exists purchase_date date,
  add column if not exists warranty_months integer,
  add column if not exists warranty_expiry_date date,
  add column if not exists note text,
  add column if not exists vendor text;

alter table public.maintenance_logs
  add column if not exists vendor text;

-- Last line of defense behind the trigger below (which raises the friendly codes first).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'equipment_warranty_months_chk') then
    alter table public.equipment add constraint equipment_warranty_months_chk
      check (warranty_months is null or warranty_months between 0 and 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'equipment_warranty_needs_purchase_chk') then
    alter table public.equipment add constraint equipment_warranty_needs_purchase_chk
      check (warranty_months is null or purchase_date is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'equipment_note_len_chk') then
    alter table public.equipment add constraint equipment_note_len_chk
      check (note is null or char_length(note) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'equipment_vendor_len_chk') then
    alter table public.equipment add constraint equipment_vendor_len_chk
      check (vendor is null or char_length(vendor) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'maintenance_logs_vendor_len_chk') then
    alter table public.maintenance_logs add constraint maintenance_logs_vendor_len_chk
      check (vendor is null or char_length(vendor) <= 200);
  end if;
end
$$;

-- Blank text means "not set" (same as the Sheets backend).
create or replace function public.equipment_normalize_details()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.note := nullif(btrim(new.note), '');
  new.vendor := nullif(btrim(new.vendor), '');

  if new.warranty_months is not null and (new.warranty_months < 0 or new.warranty_months > 600) then
    raise exception 'warranty_months_invalid';
  end if;
  if new.warranty_months is not null and new.purchase_date is null then
    raise exception 'warranty_requires_purchase_date';
  end if;
  if new.note is not null and char_length(new.note) > 2000 then
    raise exception 'note_too_long';
  end if;
  if new.vendor is not null and char_length(new.vendor) > 200 then
    raise exception 'vendor_too_long';
  end if;

  -- Server-owned: client values are overwritten. date + interval clamps to the end of a shorter month
  -- (31 Jan + 1 month = 28/29 Feb), the same rule as the Apps Script WarrantyPeriod.
  if new.purchase_date is null or new.warranty_months is null then
    new.warranty_expiry_date := null;
  else
    new.warranty_expiry_date := (new.purchase_date + make_interval(months => new.warranty_months))::date;
  end if;
  return new;
end
$$;

drop trigger if exists equipment_normalize_details on public.equipment;
create trigger equipment_normalize_details before insert or update on public.equipment
  for each row execute function public.equipment_normalize_details();

create or replace function public.maintenance_logs_normalize_vendor()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.vendor := nullif(btrim(new.vendor), '');
  if new.vendor is not null and char_length(new.vendor) > 200 then
    raise exception 'vendor_too_long';
  end if;
  return new;
end
$$;

drop trigger if exists maintenance_logs_normalize_vendor on public.maintenance_logs;
create trigger maintenance_logs_normalize_vendor before insert or update on public.maintenance_logs
  for each row execute function public.maintenance_logs_normalize_vendor();

-- Backfill: rows that already have both inputs (none before this migration) get their expiry date.
update public.equipment
   set warranty_expiry_date = (purchase_date + make_interval(months => warranty_months))::date
 where purchase_date is not null and warranty_months is not null and warranty_expiry_date is null;
