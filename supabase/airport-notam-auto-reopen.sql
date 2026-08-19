-- Run in Supabase SQL Editor if airport_notam already exists.
-- NOTAM appears at closes_at and hides automatically 2 hours after opens_at.

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
