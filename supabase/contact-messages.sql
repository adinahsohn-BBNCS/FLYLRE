-- Run in Supabase SQL Editor to store Contact page messages.
-- The site saves each message here first (instant), then emails info@flylre.com in the background.
-- Full admins read and mark messages handled in Admin → Messages.

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

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 200),
  email text not null check (char_length(email) between 3 and 320),
  topic text not null check (char_length(topic) between 1 and 100),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_at timestamptz
);

alter table public.contact_messages enable row level security;

drop policy if exists "Public can send contact messages" on public.contact_messages;
create policy "Public can send contact messages"
  on public.contact_messages for insert to anon, authenticated
  with check (status = 'new' and handled_at is null);

drop policy if exists "Admin can read contact messages" on public.contact_messages;
create policy "Admin can read contact messages"
  on public.contact_messages for select to authenticated
  using (public.is_full_admin());

drop policy if exists "Admin can update contact messages" on public.contact_messages;
create policy "Admin can update contact messages"
  on public.contact_messages for update to authenticated
  using (public.is_full_admin())
  with check (public.is_full_admin() and status in ('new', 'handled'));
