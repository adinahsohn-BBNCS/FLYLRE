-- Run in Supabase SQL Editor if pilot_submissions already exists without show_name.
-- Lets residents choose whether their name appears on Meet the Planes after approval.

alter table public.pilot_submissions
  add column if not exists show_name boolean not null default true;
