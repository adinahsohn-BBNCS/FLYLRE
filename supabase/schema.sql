-- Run this entire file in Supabase: SQL Editor → New query → Run
-- Project: https://uatcyrtfpxzdmcozaeeh.supabase.co

-- Pilot submissions
create table if not exists public.pilot_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  aircraft text,
  bio text not null,
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

alter table public.pilot_submissions enable row level security;

-- Public can submit (always pending)
create policy "Public can submit pilot profiles"
  on public.pilot_submissions
  for insert
  to anon, authenticated
  with check (status = 'pending');

-- Public site shows approved only
create policy "Public can read approved pilots"
  on public.pilot_submissions
  for select
  to anon, authenticated
  using (status = 'approved');

-- Logged-in admin can read all submissions
create policy "Admin can read all pilot submissions"
  on public.pilot_submissions
  for select
  to authenticated
  using (true);

-- Logged-in admin can approve or reject
create policy "Admin can update pilot submissions"
  on public.pilot_submissions
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));

-- Photo storage (public read for approved profile images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pilot-photos',
  'pilot-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can upload pilot photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'pilot-photos');

create policy "Public can view pilot photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'pilot-photos');

-- Event submissions
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

create policy "Public can submit events"
  on public.event_submissions
  for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Public can read approved events"
  on public.event_submissions
  for select
  to anon, authenticated
  using (status = 'approved');

create policy "Admin can read all event submissions"
  on public.event_submissions
  for select
  to authenticated
  using (true);

create policy "Admin can update event submissions"
  on public.event_submissions
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));

-- Fly-out submissions (Plan Your Next Adventure)
create table if not exists public.flyout_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  meta text,
  description text not null,
  submitter_name text not null,
  submitter_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

alter table public.flyout_submissions enable row level security;

create policy "Public can submit flyouts"
  on public.flyout_submissions
  for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Public can read approved flyouts"
  on public.flyout_submissions
  for select
  to anon, authenticated
  using (status = 'approved');

create policy "Admin can read all flyout submissions"
  on public.flyout_submissions
  for select
  to authenticated
  using (true);

create policy "Admin can update flyout submissions"
  on public.flyout_submissions
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));
