-- =====================================================================
-- AICore Mawʿid (موعد) — Supabase backend schema
-- Run once in: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).
--
-- Security model
--   * Patients (anon key, no account) can ONLY:
--       - create a booking            → rpc create_booking(...)
--       - read their own booking(s)   → rpc get_bookings(items) with booking
--                                        number + secret token (or + phone)
--       - read which slots are taken  → rpc taken_slots(from, to) (no names)
--     They have no direct table access: bookings cannot be listed.
--   * Receptionists = Supabase Auth users listed in public.staff (active).
--     Only they can list bookings and change status / note / time.
--   * The public "anon"/"publishable" key is safe in the web page because
--     every table has Row Level Security. Never put the service_role /
--     secret key in the site.
-- =====================================================================

-- ---------- staff (who may use the receptionist dashboard) ----------
create table if not exists public.staff (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;
drop policy if exists staff_read_self on public.staff;
create policy staff_read_self on public.staff
  for select to authenticated using (user_id = auth.uid());
revoke all on public.staff from anon, authenticated;
grant select on public.staff to authenticated;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.staff s where s.user_id = auth.uid() and s.active);
$$;

-- ---------- bookings ----------
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  ref         text not null unique check (ref ~ '^RDV-[A-HJ-NP-Z2-9]{6}$'),
  name        text not null check (char_length(btrim(name)) between 3 and 60),
  phone       text not null check (phone ~ '^[0-9]{8}$'),
  lang        text not null default 'ar' check (lang in ('ar', 'fr')),
  service     text not null check (service in ('general','cleaning','filling','extraction','ortho','emergency')),
  appt_date   date not null,
  appt_time   text not null check (appt_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  orig_date   date,                -- set when the clinic moves the appointment
  orig_time   text,
  note        text not null default '' check (char_length(note) <= 240),
  deposit     boolean not null default false,
  status      text not null default 'pending' check (status in ('pending','confirmed','rejected','done')),
  staff_note  text not null default '' check (char_length(staff_note) <= 300),
  decided_by  text,
  decided_at  timestamptz,
  source      text not null default 'web',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- one active booking per slot (pending or confirmed)
create unique index if not exists bookings_slot_active
  on public.bookings (appt_date, appt_time) where status in ('pending', 'confirmed');
create index if not exists bookings_created_idx on public.bookings (created_at desc);
create index if not exists bookings_phone_idx on public.bookings (phone);

-- secret token hashes live in their own table: RLS on, no policy at all,
-- so nobody can read them through the API (only the functions below).
create table if not exists public.booking_secrets (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  token_hash text not null
);
alter table public.booking_secrets enable row level security;
revoke all on public.booking_secrets from anon, authenticated;

-- audit trail: who did what, when (written by triggers only)
create table if not exists public.booking_events (
  id         bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  at         timestamptz not null default now(),
  actor      text not null,
  action     text not null,
  details    jsonb
);
alter table public.booking_events enable row level security;
drop policy if exists events_staff_read on public.booking_events;
create policy events_staff_read on public.booking_events
  for select to authenticated using (public.is_staff());
revoke all on public.booking_events from anon, authenticated;
grant select on public.booking_events to authenticated;

-- RLS on bookings: staff only. No INSERT policy → inserts only via create_booking().
alter table public.bookings enable row level security;
drop policy if exists bookings_staff_select on public.bookings;
drop policy if exists bookings_staff_update on public.bookings;
drop policy if exists bookings_staff_delete on public.bookings;
create policy bookings_staff_select on public.bookings
  for select to authenticated using (public.is_staff());
create policy bookings_staff_update on public.bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy bookings_staff_delete on public.bookings
  for delete to authenticated using (public.is_staff());

-- Column privileges (defence in depth): staff may only change these columns.
revoke all on public.bookings from anon, authenticated;
grant select, delete on public.bookings to authenticated;
grant update (status, staff_note, appt_date, appt_time) on public.bookings to authenticated;

-- ---------- triggers ----------
create or replace function public.bookings_before_update()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor text;
begin
  v_actor := coalesce((select s.name from public.staff s where s.user_id = auth.uid()),
                      nullif(auth.jwt() ->> 'email', ''), 'system');
  -- immutable columns
  new.id := old.id; new.ref := old.ref; new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.decided_by := v_actor;
    new.decided_at := now();
  end if;
  if (new.appt_date, new.appt_time) is distinct from (old.appt_date, old.appt_time) then
    if old.orig_date is null then
      new.orig_date := old.appt_date;
      new.orig_time := old.appt_time;
    end if;
    if new.appt_date = new.orig_date and new.appt_time = new.orig_time then
      new.orig_date := null;
      new.orig_time := null;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.bookings_after_write()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_actor text;
begin
  if tg_op = 'INSERT' then
    insert into public.booking_events (booking_id, actor, action, details)
    values (new.id, 'patient', 'created', jsonb_build_object('date', new.appt_date, 'time', new.appt_time));
    return new;
  end if;
  v_actor := coalesce(new.decided_by, (select s.name from public.staff s where s.user_id = auth.uid()), 'system');
  if new.status is distinct from old.status then
    insert into public.booking_events (booking_id, actor, action, details)
    values (new.id, v_actor, new.status, jsonb_build_object('from', old.status, 'note', new.staff_note));
  end if;
  if (new.appt_date, new.appt_time) is distinct from (old.appt_date, old.appt_time) then
    insert into public.booking_events (booking_id, actor, action, details)
    values (new.id, v_actor, 'rescheduled', jsonb_build_object('from', old.appt_date || ' ' || old.appt_time, 'to', new.appt_date || ' ' || new.appt_time));
  end if;
  if new.staff_note is distinct from old.staff_note and new.status is not distinct from old.status then
    insert into public.booking_events (booking_id, actor, action, details)
    values (new.id, v_actor, 'note', jsonb_build_object('note', new.staff_note));
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_before_update on public.bookings;
create trigger bookings_before_update before update on public.bookings
  for each row execute function public.bookings_before_update();
drop trigger if exists bookings_after_write on public.bookings;
create trigger bookings_after_write after insert or update on public.bookings
  for each row execute function public.bookings_after_write();

-- ---------- patient API (SECURITY DEFINER, callable with the anon key) ----------
create or replace function public.mawid_slots()
returns text[] language sql immutable as $$
  select array['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
               '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30'];
$$;

create or replace function public.mawid_phone(p text)
returns text language sql immutable as $$
  -- digits only; accept +222 / 00222 prefixes → 8-digit national number
  select case
    when d ~ '^00222[0-9]{8}$' then right(d, 8)
    when d ~ '^222[0-9]{8}$'   then right(d, 8)
    else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x;
$$;

create or replace function public.create_booking(
  p_ref text, p_token text, p_name text, p_phone text, p_lang text,
  p_service text, p_date date, p_time text,
  p_note text default '', p_deposit boolean default false)
returns table (ref text, status text, created_at timestamptz)
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_id      uuid;
  v_today   date := (now() at time zone 'Africa/Nouakchott')::date;
  v_nowtime text := to_char(now() at time zone 'Africa/Nouakchott', 'HH24:MI');
  v_phone   text := public.mawid_phone(p_phone);
  v_con     text;
begin
  if p_token is null or char_length(p_token) not between 24 and 128 then
    raise exception 'bad_token';
  end if;
  if p_date is null or p_date < v_today or p_date > v_today + 60 then
    raise exception 'bad_date';
  end if;
  if extract(isodow from p_date) = 5 then          -- Friday: clinic closed
    raise exception 'closed_day';
  end if;
  if not (p_time = any (public.mawid_slots())) then
    raise exception 'bad_time';
  end if;
  if p_date = v_today and p_time <= v_nowtime then
    raise exception 'past_slot';
  end if;
  -- anti-abuse: max 3 upcoming active bookings per phone, 40 new bookings per 10 min overall
  if (select count(*) from public.bookings b
       where b.phone = v_phone and b.status in ('pending','confirmed') and b.appt_date >= v_today) >= 3 then
    raise exception 'too_many_for_phone';
  end if;
  if (select count(*) from public.bookings b where b.created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'rate_limited';
  end if;

  begin
    insert into public.bookings (ref, name, phone, lang, service, appt_date, appt_time, note, deposit)
    values (upper(btrim(p_ref)), btrim(p_name), v_phone, coalesce(nullif(p_lang, ''), 'ar'),
            p_service, p_date, p_time, left(btrim(coalesce(p_note, '')), 240), coalesce(p_deposit, false))
    returning id into v_id;
  exception when unique_violation then
    get stacked diagnostics v_con = constraint_name;
    if v_con = 'bookings_slot_active' then raise exception 'slot_taken'; end if;
    raise exception 'ref_taken';
  end;

  insert into public.booking_secrets (booking_id, token_hash)
  values (v_id, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'));

  return query select b.ref, b.status, b.created_at from public.bookings b where b.id = v_id;
end;
$$;

-- Read the caller's own bookings. p_items = [{"ref":"RDV-XXXXXX","token":"..."} | {"ref":..., "phone":"22334455"}]
create or replace function public.get_bookings(p_items jsonb)
returns table (
  ref text, status text, name text, phone text, lang text, service text,
  appt_date date, appt_time text, orig_date date, orig_time text, note text,
  deposit boolean, staff_note text, decided_at timestamptz,
  created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 30 then
    raise exception 'bad_items';
  end if;
  return query
    select b.ref, b.status, b.name, b.phone, b.lang, b.service,
           b.appt_date, b.appt_time, b.orig_date, b.orig_time, b.note,
           b.deposit, b.staff_note, b.decided_at, b.created_at, b.updated_at
    from jsonb_array_elements(p_items) it
    join public.bookings b on b.ref = upper(btrim(it ->> 'ref'))
    left join public.booking_secrets s on s.booking_id = b.id
    where (coalesce(it ->> 'token', '') <> ''
           and s.token_hash = encode(sha256(convert_to(it ->> 'token', 'UTF8')), 'hex'))
       or (char_length(public.mawid_phone(it ->> 'phone')) = 8
           and b.phone = public.mawid_phone(it ->> 'phone'));
end;
$$;

-- Which slots are already taken (no personal data).
create or replace function public.taken_slots(p_from date, p_to date)
returns table (appt_date date, appt_time text)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select b.appt_date, b.appt_time from public.bookings b
  where b.status in ('pending', 'confirmed')
    and b.appt_date between p_from and least(p_to, p_from + 62);
$$;

-- ---------- function privileges ----------
-- explicit, in case the project does not auto-expose the public schema to the Data API
grant usage on schema public to anon, authenticated;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.bookings_before_update() from public, anon, authenticated;
revoke all on function public.bookings_after_write() from public, anon, authenticated;
revoke all on function public.create_booking(text, text, text, text, text, text, date, text, text, boolean) from public;
revoke all on function public.get_bookings(jsonb) from public;
revoke all on function public.taken_slots(date, date) from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.create_booking(text, text, text, text, text, text, date, text, text, boolean) to anon, authenticated;
grant execute on function public.get_bookings(jsonb) to anon, authenticated;
grant execute on function public.taken_slots(date, date) to anon, authenticated;
grant execute on function public.mawid_slots() to anon, authenticated;
grant execute on function public.mawid_phone(text) to anon, authenticated;
