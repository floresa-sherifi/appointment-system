-- Run this in Supabase SQL Editor before using the admin dashboard in production.
-- It adds appointment statuses and admin-aware RLS policies.

alter table public.appointments
add column if not exists status text not null default 'pending'
check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

alter table public.appointments
add column if not exists visit_notes text not null default '';

alter table public.appointments
add column if not exists patient_name text not null default '';

update public.appointments
set patient_name = coalesce(auth.users.raw_user_meta_data ->> 'name', auth.users.email, appointments.user_id::text)
from auth.users
where appointments.user_id = auth.users.id
  and coalesce(appointments.patient_name, '') = '';

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.is_doctor_for_appointment(appointment_doctor text)
returns boolean
language sql
stable
as $$
  select regexp_replace(lower(coalesce(appointment_doctor, '')), '[^a-z0-9]+', '', 'g') =
    regexp_replace(
      lower(
        case
          when lower(coalesce(auth.jwt() ->> 'email', '')) = 'floresa.sherifi@umib.net'
            then 'Dr. Elira Hoxha'
          when coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'doctor', false)
            then coalesce(
              auth.jwt() -> 'user_metadata' ->> 'doctor_name',
              auth.jwt() -> 'user_metadata' ->> 'name',
              ''
            )
          else ''
        end
      ),
      '[^a-z0-9]+',
      '',
      'g'
    );
$$;

alter table public.appointments enable row level security;

drop policy if exists "Patients can read own appointments" on public.appointments;
create policy "Patients can read own appointments"
on public.appointments
for select
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.is_doctor_for_appointment(doctor)
);

drop policy if exists "Patients can create own appointments" on public.appointments;
create policy "Patients can create own appointments"
on public.appointments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Patients can update own appointments" on public.appointments;
create policy "Patients can update own appointments"
on public.appointments
for update
using (
  auth.uid() = user_id
  or public.is_admin()
  or public.is_doctor_for_appointment(doctor)
)
with check (
  auth.uid() = user_id
  or public.is_admin()
  or public.is_doctor_for_appointment(doctor)
);

drop policy if exists "Patients can delete own appointments" on public.appointments;
create policy "Patients can delete own appointments"
on public.appointments
for delete
using (auth.uid() = user_id or public.is_admin());

-- To make a user admin, set their auth user metadata to:
-- { "role": "admin" }
-- Or set VITE_ADMIN_EMAILS in the frontend .env for UI access.
