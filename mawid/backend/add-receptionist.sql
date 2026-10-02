-- Give an existing Supabase Auth user access to the receptionist dashboard.
-- 1) Supabase Dashboard → Authentication → Users → "Add user" → "Create new user"
--    (e-mail + password, tick "Auto Confirm User").
-- 2) Replace the e-mail below and run this in the SQL Editor.
insert into public.staff (user_id, name)
select id, 'Réception' from auth.users where email = 'reception@example.com'
on conflict (user_id) do update set active = true, name = excluded.name;
