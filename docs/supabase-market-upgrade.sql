-- Run this in Supabase SQL Editor before using the admin dashboard in production.
-- It adds appointment statuses and admin-aware RLS policies.

alter table public.appointments
add column if not exists status text not null default 'pending'
check (status in ('pending', 'confirmed', 'cancelled', 'completed'));

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', false);
$$;

alter table public.appointments enable row level security;

drop policy if exists "Patients can read own appointments" on public.appointments;
create policy "Patients can read own appointments"
on public.appointments
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Patients can create own appointments" on public.appointments;
create policy "Patients can create own appointments"
on public.appointments
for insert
with check (auth.uid() = user_id);

drop policy if exists "Patients can update own appointments" on public.appointments;
create policy "Patients can update own appointments"
on public.appointments
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Patients can delete own appointments" on public.appointments;
create policy "Patients can delete own appointments"
on public.appointments
for delete
using (auth.uid() = user_id or public.is_admin());

-- To make a user admin, set their auth user metadata to:
-- { "role": "admin" }
-- Or set VITE_ADMIN_EMAILS in the frontend .env for UI access.
