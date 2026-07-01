-- Run in Supabase SQL Editor if you already ran schema.sql before events were added.
-- Safe to run on a fresh project too (uses IF NOT EXISTS).

create table if not exists public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  event_date date not null,
  event_time text,
  location text,
  description text not null,
  submitter_name text not null,
  submitter_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

alter table public.event_submissions enable row level security;

drop policy if exists "Public can submit events" on public.event_submissions;
create policy "Public can submit events"
  on public.event_submissions
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Public can read approved events" on public.event_submissions;
create policy "Public can read approved events"
  on public.event_submissions
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Admin can read all event submissions" on public.event_submissions;
create policy "Admin can read all event submissions"
  on public.event_submissions
  for select
  to authenticated
  using (true);

drop policy if exists "Admin can update event submissions" on public.event_submissions;
create policy "Admin can update event submissions"
  on public.event_submissions
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));
