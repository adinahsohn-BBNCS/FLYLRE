-- Run in Supabase SQL Editor to add the home page live runway camera.
-- The rtsp.me embed link is entered in Admin → Notams → Runway camera, never in site code.
-- The site stops loading the player after monthly_limit views (default 90) so the camera
-- stays inside rtsp.me's free 100 views per month.

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

revoke all on function public.is_full_admin() from public;
grant execute on function public.is_full_admin() to authenticated;

create table if not exists public.runway_camera (
  id int primary key default 1 check (id = 1),
  is_enabled boolean not null default false,
  embed_url text check (embed_url is null or embed_url ~ '^https://rtsp\.me/embed/[A-Za-z0-9]+/$'),
  monthly_limit int not null default 90 check (monthly_limit between 0 and 100),
  updated_at timestamptz not null default now()
);

alter table public.runway_camera enable row level security;

drop policy if exists "Admin can read runway camera" on public.runway_camera;
create policy "Admin can read runway camera"
  on public.runway_camera for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update runway camera" on public.runway_camera;
create policy "Admin can update runway camera"
  on public.runway_camera for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and id = 1);

drop policy if exists "Admin can insert runway camera" on public.runway_camera;
create policy "Admin can insert runway camera"
  on public.runway_camera for insert to authenticated
  with check (public.is_full_admin() and id = 1);

insert into public.runway_camera (id)
values (1)
on conflict (id) do nothing;

-- One row per calendar month (UTC), counting Watch live presses.
create table if not exists public.runway_camera_views (
  month date primary key,
  view_count int not null default 0 check (view_count >= 0)
);

alter table public.runway_camera_views enable row level security;

drop policy if exists "Admin can read runway camera views" on public.runway_camera_views;
create policy "Admin can read runway camera views"
  on public.runway_camera_views for select to authenticated
  using (public.is_full_admin());

-- Public: whether the camera panel should show, without revealing the embed link.
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

-- Public: counts one view and returns the embed link, or refuses once the limit is reached.
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
