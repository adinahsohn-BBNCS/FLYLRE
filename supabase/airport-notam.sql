-- Run in Supabase SQL Editor to add home-page airport closure NOTAM.
-- Single-row settings table (id = 1).

create table if not exists public.airport_notam (
  id int primary key default 1 check (id = 1),
  is_active boolean not null default false,
  reason text,
  closes_at timestamptz,
  opens_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.airport_notam enable row level security;

create policy "Public can read active airport NOTAM"
  on public.airport_notam
  for select
  to anon, authenticated
  using (is_active = true);

-- Public home page uses this RPC: live at closes_at, stays on after opens_at until admin disables.
create or replace function public.public_airport_notam()
returns table (
  reason text,
  closes_at timestamptz,
  opens_at timestamptz
)
language sql
volatile
security definer
set search_path = public
as $$
  select reason, closes_at, opens_at
  from public.airport_notam
  where id = 1
    and is_active = true
    and (closes_at is null or closes_at <= clock_timestamp());
$$;

revoke all on function public.public_airport_notam() from public;
grant execute on function public.public_airport_notam() to anon, authenticated;

create policy "Admin can read airport NOTAM"
  on public.airport_notam
  for select
  to authenticated
  using (true);

create policy "Admin can update airport NOTAM"
  on public.airport_notam
  for update
  to authenticated
  using (true)
  with check (id = 1);

create policy "Admin can insert airport NOTAM"
  on public.airport_notam
  for insert
  to authenticated
  with check (id = 1);

insert into public.airport_notam (id, is_active)
values (1, false)
on conflict (id) do nothing;
