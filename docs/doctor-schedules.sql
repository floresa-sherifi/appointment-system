-- Doctor schedule support.
-- Run this in Supabase SQL Editor when database permissions are available.

create table if not exists public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  doctor_name text not null unique,
  work_days text[] not null default array['mon', 'tue', 'wed', 'thu', 'fri'],
  start_time text not null default '09:00',
  end_time text not null default '17:00',
  slot_minutes integer not null default 30
    check (slot_minutes in (15, 20, 30, 45, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.doctor_schedules enable row level security;

drop policy if exists "Authenticated users can read doctor schedules" on public.doctor_schedules;
create policy "Authenticated users can read doctor schedules"
on public.doctor_schedules
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can manage doctor schedules" on public.doctor_schedules;
drop policy if exists "Admins can manage doctor schedules" on public.doctor_schedules;
create policy "Admins can manage doctor schedules"
on public.doctor_schedules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.doctor_schedules (doctor_name, work_days, start_time, end_time, slot_minutes)
values
  ('Dr. Elira Hoxha', array['mon', 'wed', 'fri'], '09:00', '17:00', 30),
  ('Dr. Blerim Dauti', array['tue', 'thu', 'sat'], '09:00', '15:00', 30),
  ('Dr. Fjolla Krasniqi', array['mon', 'thu', 'fri'], '10:00', '16:00', 30),
  ('Dr. Luan Shala', array['mon', 'tue', 'wed', 'thu'], '09:00', '16:00', 30)
on conflict (doctor_name) do nothing;
