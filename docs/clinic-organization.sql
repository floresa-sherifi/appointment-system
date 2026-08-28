-- Clinic organization support.
-- Run this in Supabase SQL Editor before using clinic, department, and specialty management.

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text not null default 'Mitrovice',
  country text not null default 'Kosove',
  created_at timestamptz not null default now()
);

alter table public.clinics
add column if not exists city text not null default 'Mitrovice';

alter table public.clinics
add column if not exists country text not null default 'Kosove';

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.doctors
add column if not exists clinic text not null default '';

alter table public.doctors
add column if not exists department text not null default '';

alter table public.doctors
add column if not exists specialty text not null default '';

alter table public.doctors
add column if not exists location text not null default '';

alter table public.doctors
add column if not exists fee text not null default '';

alter table public.clinics enable row level security;
alter table public.departments enable row level security;
alter table public.specialties enable row level security;
alter table public.doctors enable row level security;

drop policy if exists "Authenticated users can read clinics" on public.clinics;
create policy "Authenticated users can read clinics"
on public.clinics
for select
to authenticated
using (true);

drop policy if exists "Admins can manage clinics" on public.clinics;
create policy "Admins can manage clinics"
on public.clinics
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read departments" on public.departments;
create policy "Authenticated users can read departments"
on public.departments
for select
to authenticated
using (true);

drop policy if exists "Admins can manage departments" on public.departments;
create policy "Admins can manage departments"
on public.departments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read specialties" on public.specialties;
create policy "Authenticated users can read specialties"
on public.specialties
for select
to authenticated
using (true);

drop policy if exists "Admins can manage specialties" on public.specialties;
create policy "Admins can manage specialties"
on public.specialties
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read doctors" on public.doctors;
create policy "Authenticated users can read doctors"
on public.doctors
for select
to authenticated
using (true);

drop policy if exists "Admins can manage doctors" on public.doctors;
create policy "Admins can manage doctors"
on public.doctors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.clinics (name, city, country)
values
  ('Spitali i Pergjithshem Mitrovice', 'Mitrovice', 'Kosove'),
  ('QKMF Mitrovice', 'Mitrovice', 'Kosove'),
  ('Klinika Family Care Mitrovice', 'Mitrovice', 'Kosove'),
  ('Poliklinika HealthPlus Mitrovice', 'Mitrovice', 'Kosove'),
  ('Klinika Pediatrike Mitrovice', 'Mitrovice', 'Kosove'),
  ('Klinika Dermatologjike Mitrovice', 'Mitrovice', 'Kosove'),
  ('Ordinanca Kardiologjike Mitrovice', 'Mitrovice', 'Kosove')
on conflict (name) do nothing;

insert into public.departments (name)
values
  ('Kardiologji'),
  ('Pediatri'),
  ('Dermatologji')
on conflict (name) do nothing;

insert into public.specialties (name)
values
  ('Kardiologe'),
  ('Pediater'),
  ('Dermatologe')
on conflict (name) do nothing;

update public.doctors
set
  clinic = 'Poliklinika HealthPlus Mitrovice',
  department = 'Kardiologji',
  specialty = 'Kardiologe',
  location = 'Mitrovice',
  fee = '35 EUR'
where lower(name) like '%elira%';

update public.doctors
set
  clinic = 'Klinika Family Care Mitrovice',
  department = 'Pediatri',
  specialty = 'Pediater',
  location = 'Mitrovice',
  fee = '30 EUR'
where lower(name) like '%blerim%';

update public.doctors
set
  clinic = 'Klinika Dermatologjike Mitrovice',
  department = 'Dermatologji',
  specialty = 'Dermatologe',
  location = 'Mitrovice',
  fee = '40 EUR'
where lower(name) like '%fjolla%';
