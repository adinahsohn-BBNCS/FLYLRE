-- Run in Supabase SQL Editor if airport_notam already exists.
-- NOTAM appears automatically at closes_at; opens_at is informational only (admin turns off manually).

create or replace function public.public_airport_notam()
returns table (
  reason text,
  closes_at timestamptz,
  opens_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select reason, closes_at, opens_at
  from public.airport_notam
  where id = 1
    and is_active = true
    and (closes_at is null or closes_at <= now());
$$;

revoke all on function public.public_airport_notam() from public;
grant execute on function public.public_airport_notam() to anon, authenticated;
