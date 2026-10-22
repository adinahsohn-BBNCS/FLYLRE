-- Run this entire file in Supabase: SQL Editor → New query → Run
-- Project: https://uatcyrtfpxzdmcozaeeh.supabase.co

-- Admin roles: full (default) or notams-only via auth.users app_metadata.admin_role
create or replace function public.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'admin_role', 'full') = 'full';
$$;

create or replace function public.can_manage_notams()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'admin_role', 'full') in ('full', 'notams');
$$;

revoke all on function public.is_full_admin() from public;
revoke all on function public.can_manage_notams() from public;
grant execute on function public.is_full_admin() to authenticated;
grant execute on function public.can_manage_notams() to authenticated;

-- Pilot submissions
create table if not exists public.pilot_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  aircraft text,
  bio text not null,
  photo_url text,
  show_name boolean not null default true,
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
  using (public.is_full_admin());

-- Logged-in admin can approve or reject
create policy "Admin can update pilot submissions"
  on public.pilot_submissions
  for update
  to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

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
  using (public.is_full_admin());

create policy "Admin can update event submissions"
  on public.event_submissions
  for update
  to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

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
  using (public.is_full_admin());

create policy "Admin can update flyout submissions"
  on public.flyout_submissions
  for update
  to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Event RSVPs and photos (see event-rsvps-photos.sql for full migration on existing projects)
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

alter table public.event_rsvps enable row level security;

create policy "Public can submit event RSVPs"
  on public.event_rsvps
  for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Admin can read all event RSVPs"
  on public.event_rsvps
  for select
  to authenticated
  using (public.is_full_admin());

create policy "Admin can update event RSVPs"
  on public.event_rsvps
  for update
  to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

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

alter table public.event_photos enable row level security;

create policy "Public can submit event photos"
  on public.event_photos
  for insert
  to anon, authenticated
  with check (status = 'pending');

create policy "Public can read approved event photos"
  on public.event_photos
  for select
  to anon, authenticated
  using (status = 'approved');

create policy "Admin can read all event photos"
  on public.event_photos
  for select
  to authenticated
  using (public.is_full_admin());

create policy "Admin can update event photos"
  on public.event_photos
  for update
  to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

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

create or replace function public.approved_event_rsvps_public()
returns table(event_id uuid, name text, guests integer)
language sql
security definer
stable
set search_path = public
as $$
  select event_id, name, guests
  from public.event_rsvps
  where status = 'approved'
  order by created_at asc;
$$;

revoke all on function public.approved_event_rsvps_public() from public;
grant execute on function public.approved_event_rsvps_public() to anon, authenticated;

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

create policy "Anyone can upload event photos"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'event-photos');

create policy "Public can view event photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'event-photos');

-- Home page airport closure NOTAM (single row, id = 1)
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
    and (closes_at is null or closes_at <= clock_timestamp())
    and (opens_at is null or opens_at + interval '2 hours' > clock_timestamp());
$$;

revoke all on function public.public_airport_notam() from public;
grant execute on function public.public_airport_notam() to anon, authenticated;

create policy "Admin can read airport NOTAM"
  on public.airport_notam
  for select
  to authenticated
  using (public.can_manage_notams());

create policy "Admin can update airport NOTAM"
  on public.airport_notam
  for update
  to authenticated
  using (public.can_manage_notams())
  with check (public.can_manage_notams() and id = 1);

create policy "Admin can insert airport NOTAM"
  on public.airport_notam
  for insert
  to authenticated
  with check (public.can_manage_notams() and id = 1);

insert into public.airport_notam (id, is_active)
values (1, false)
on conflict (id) do nothing;

-- Home page live runway camera (rtsp.me embed link stored here, never in site code)
create table if not exists public.runway_camera (
  id int primary key default 1 check (id = 1),
  is_enabled boolean not null default false,
  embed_url text check (embed_url is null or embed_url ~ '^https://rtsp\.me/embed/[A-Za-z0-9]+/$'),
  monthly_limit int not null default 90 check (monthly_limit between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table public.runway_camera enable row level security;

create policy "Admin can read runway camera"
  on public.runway_camera for select to authenticated
  using (public.is_full_admin());

create policy "Admin can update runway camera"
  on public.runway_camera for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and id = 1);

create policy "Admin can insert runway camera"
  on public.runway_camera for insert to authenticated
  with check (public.is_full_admin() and id = 1);

insert into public.runway_camera (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.runway_camera_views (
  month date primary key,
  view_count int not null default 0 check (view_count >= 0)
);

alter table public.runway_camera_views enable row level security;

create policy "Admin can read runway camera views"
  on public.runway_camera_views for select to authenticated
  using (public.is_full_admin());

create or replace function public.runway_camera_status()
returns table (
  is_available boolean,
  views_used int,
  monthly_limit int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.is_enabled and c.embed_url is not null,
    coalesce(v.view_count, 0),
    c.monthly_limit
  from public.runway_camera c
  left join public.runway_camera_views v
    on v.month = (date_trunc('month', now() at time zone 'utc'))::date
  where c.id = 1;
$$;

create or replace function public.claim_runway_camera_view()
returns table (
  allowed boolean,
  embed_url text,
  views_used int,
  monthly_limit int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  cam public.runway_camera%rowtype;
  this_month date := (date_trunc('month', now() at time zone 'utc'))::date;
  used int;
begin
  select * into cam from public.runway_camera where id = 1;

  if not found or not cam.is_enabled or cam.embed_url is null then
    return query select false, null::text, 0, coalesce(cam.monthly_limit, 0);
    return;
  end if;

  insert into public.runway_camera_views (month, view_count)
  values (this_month, 0)
  on conflict (month) do nothing;

  update public.runway_camera_views
     set view_count = view_count + 1
   where month = this_month
     and view_count < cam.monthly_limit
  returning view_count into used;

  if used is null then
    select view_count into used from public.runway_camera_views where month = this_month;
    return query select false, null::text, coalesce(used, 0), cam.monthly_limit;
    return;
  end if;

  return query select true, cam.embed_url, used, cam.monthly_limit;
end;
$$;

revoke all on function public.runway_camera_status() from public;
revoke all on function public.claim_runway_camera_view() from public;
grant execute on function public.runway_camera_status() to anon, authenticated;
grant execute on function public.claim_runway_camera_view() to anon, authenticated;
