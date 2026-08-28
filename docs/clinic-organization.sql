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
  created_at timestamptz not null default now()
);

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

insert into public.clinics (name)
values
  ('Qendra HealthPlus'),
  ('Klinika Family Care'),
  ('Skin Studio')
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
  clinic = 'Qendra HealthPlus',
  department = 'Kardiologji',
  specialty = 'Kardiologe',
  location = 'Prishtine',
  fee = '35 EUR'
where lower(name) like '%elira%';

update public.doctors
set
  clinic = 'Klinika Family Care',
  department = 'Pediatri',
  specialty = 'Pediater',
  location = 'Prizren',
  fee = '30 EUR'
where lower(name) like '%blerim%';

update public.doctors
set
  clinic = 'Skin Studio',
  department = 'Dermatologji',
  specialty = 'Dermatologe',
  location = 'Peje',
  fee = '40 EUR'
where lower(name) like '%fjolla%';
