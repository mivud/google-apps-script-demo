-- v1 has no login, so the anon role gets full access. The anon key ships in the frontend bundle,
-- so anyone with the app link can read and write. Replace these policies when auth is added.

alter table public.categories enable row level security;
alter table public.equipment enable row level security;
alter table public.maintenance_logs enable row level security;

drop policy if exists "v1 anon full access" on public.categories;
create policy "v1 anon full access" on public.categories
  for all to anon using (true) with check (true);

drop policy if exists "v1 anon full access" on public.equipment;
create policy "v1 anon full access" on public.equipment
  for all to anon using (true) with check (true);

drop policy if exists "v1 anon full access" on public.maintenance_logs;
create policy "v1 anon full access" on public.maintenance_logs
  for all to anon using (true) with check (true);
