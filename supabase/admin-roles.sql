-- Run in Supabase SQL Editor to add NOTAM-only admin support.
-- Existing admins: leave app_metadata empty (or {"admin_role":"full"}) — no change for them.
-- NOTAM-only user: set Raw App Meta Data to {"admin_role":"notams"} on that user.

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
drop policy if exists "Admin can read all pilot submissions" on public.pilot_submissions;
create policy "Admin can read all pilot submissions"
  on public.pilot_submissions for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update pilot submissions" on public.pilot_submissions;
create policy "Admin can update pilot submissions"
  on public.pilot_submissions for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Event submissions
drop policy if exists "Admin can read all event submissions" on public.event_submissions;
create policy "Admin can read all event submissions"
  on public.event_submissions for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update event submissions" on public.event_submissions;
create policy "Admin can update event submissions"
  on public.event_submissions for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Fly-out submissions
drop policy if exists "Admin can read all flyout submissions" on public.flyout_submissions;
create policy "Admin can read all flyout submissions"
  on public.flyout_submissions for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update flyout submissions" on public.flyout_submissions;
create policy "Admin can update flyout submissions"
  on public.flyout_submissions for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Event RSVPs
drop policy if exists "Admin can read all event RSVPs" on public.event_rsvps;
create policy "Admin can read all event RSVPs"
  on public.event_rsvps for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update event RSVPs" on public.event_rsvps;
create policy "Admin can update event RSVPs"
  on public.event_rsvps for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Event photos
drop policy if exists "Admin can read all event photos" on public.event_photos;
create policy "Admin can read all event photos"
  on public.event_photos for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update event photos" on public.event_photos;
create policy "Admin can update event photos"
  on public.event_photos for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('pending', 'approved', 'rejected'));

-- Airport NOTAM (full admins + NOTAM-only admins)
drop policy if exists "Admin can read airport NOTAM" on public.airport_notam;
create policy "Admin can read airport NOTAM"
  on public.airport_notam for select to authenticated
  using (public.can_manage_notams());

drop policy if exists "Admin can update airport NOTAM" on public.airport_notam;
create policy "Admin can update airport NOTAM"
  on public.airport_notam for update to authenticated
  using (public.can_manage_notams())
  with check (public.can_manage_notams() and id = 1);

drop policy if exists "Admin can insert airport NOTAM" on public.airport_notam;
create policy "Admin can insert airport NOTAM"
  on public.airport_notam for insert to authenticated
  with check (public.can_manage_notams() and id = 1);
