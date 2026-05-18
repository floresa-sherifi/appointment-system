# Email Notifications

This project sends appointment emails through a Supabase Edge Function, not from the React app.

## What Is Included

- Booking email after a new appointment is created.
- Update email after an appointment is edited.
- Cancellation email after an appointment is deleted.
- 24 hour reminder email through a scheduled function call.

## Supabase Setup

1. Run `docs/email-notifications.sql` in Supabase SQL Editor.
2. Deploy the Edge Function:

```bash
supabase functions deploy send-appointment-email
```

3. Add these Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
supabase secrets set EMAIL_FROM="Smart Care <notifications@yourdomain.com>"
supabase secrets set APP_URL=https://appointment-system-mu.vercel.app
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

`SUPABASE_URL` is usually provided automatically by Supabase.

## Reminder Schedule

Schedule this function to run every 30 or 60 minutes with body:

```json
{
  "type": "send_reminders"
}
```

The function scans appointments that are about 24 hours away and sends one `reminder_24h` email per appointment.

## Provider

The Edge Function is written for Resend. If you use another provider, keep the same function API and replace the `sendEmail` fetch call.
