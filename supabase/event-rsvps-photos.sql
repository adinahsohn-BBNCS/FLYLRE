-- Run in Supabase SQL Editor after events.sql
-- Adds RSVP and photo submissions for approved events

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.event_submissions(id) on delete cascade,
  name text not null,
  email text not null,
  guests integer not null default 1 check (guests >= 1 and guests <= 20),
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

create index if not exists event_rsvps_event_id_idx on public.event_rsvps (event_id);
create index if not exists event_rsvps_status_idx on public.event_rsvps (status);

alter table public.event_rsvps enable row level security;

drop policy if exists "Public can submit event RSVPs" on public.event_rsvps;
create policy "Public can submit event RSVPs"
  on public.event_rsvps
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Admin can read all event RSVPs" on public.event_rsvps;
create policy "Admin can read all event RSVPs"
  on public.event_rsvps
  for select
  to authenticated
  using (true);

drop policy if exists "Admin can update event RSVPs" on public.event_rsvps;
create policy "Admin can update event RSVPs"
  on public.event_rsvps
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.event_submissions(id) on delete cascade,
  submitter_name text not null,
  submitter_email text not null,
  photo_url text not null,
  caption text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz
);

create index if not exists event_photos_event_id_idx on public.event_photos (event_id);
create index if not exists event_photos_status_idx on public.event_photos (status);

alter table public.event_photos enable row level security;

drop policy if exists "Public can submit event photos" on public.event_photos;
create policy "Public can submit event photos"
  on public.event_photos
  for insert
  to anon, authenticated
  with check (status = 'pending');

drop policy if exists "Public can read approved event photos" on public.event_photos;
create policy "Public can read approved event photos"
  on public.event_photos
  for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "Admin can read all event photos" on public.event_photos;
create policy "Admin can read all event photos"
  on public.event_photos
  for select
  to authenticated
  using (true);

drop policy if exists "Admin can update event photos" on public.event_photos;
create policy "Admin can update event photos"
  on public.event_photos
  for update
  to authenticated
  using (true)
  with check (status in ('pending', 'approved', 'rejected'));

-- Public RSVP counts without exposing guest emails
create or replace function public.approved_event_rsvp_counts()
returns table(event_id uuid, rsvp_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select event_id, count(*)::bigint
  from public.event_rsvps
  where status = 'approved'
  group by event_id;
$$;

revoke all on function public.approved_event_rsvp_counts() from public;
grant execute on function public.approved_event_rsvp_counts() to anon, authenticated;

-- Event photo storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-photos',
  'event-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload event photos" on storage.objects;
create policy "Anyone can upload event photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'event-photos');

drop policy if exists "Public can view event photos" on storage.objects;
create policy "Public can view event photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'event-photos');
