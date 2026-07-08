-- Grant NOTAM-only admin access to a user.
-- Replace the email below, then run in Supabase → SQL Editor.

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"admin_role": "notams"}'::jsonb
WHERE email = 'their-email@example.com';

-- Verify (optional):
-- SELECT email, raw_app_meta_data FROM auth.users WHERE email = 'their-email@example.com';

-- To remove NOTAM-only access later:
-- UPDATE auth.users
-- SET raw_app_meta_data = raw_app_meta_data - 'admin_role'
-- WHERE email = 'their-email@example.com';
