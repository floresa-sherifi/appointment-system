-- Email notification support.
-- Run this in Supabase SQL Editor before enabling 24h reminders.

create table if not exists public.appointment_email_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  type text not null check (
    type in (
      'appointment_booked',
      'appointment_updated',
      'appointment_cancelled',
      'reminder_24h'
    )
  ),
  sent_at timestamptz not null default now(),
  unique (appointment_id, type)
);

alter table public.appointment_email_logs enable row level security;

drop policy if exists "No client access to appointment email logs" on public.appointment_email_logs;
create policy "No client access to appointment email logs"
on public.appointment_email_logs
for all
using (false)
with check (false);

-- The send-appointment-email Edge Function uses SUPABASE_SERVICE_ROLE_KEY,
-- so it bypasses RLS safely and can insert reminder logs.
