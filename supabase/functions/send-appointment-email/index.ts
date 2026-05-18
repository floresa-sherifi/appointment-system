import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const eventLabels: Record<string, string> = {
  appointment_booked: "Termini u rezervua",
  appointment_updated: "Termini u ndryshua",
  appointment_cancelled: "Termini u anulua",
  reminder_24h: "Kujtese per terminin neser",
};

type AppointmentPayload = {
  id?: string;
  user_id?: string;
  date: string;
  time: string;
  doctor: string;
  status?: string;
};

type PatientPayload = {
  email: string;
  name?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getAppointmentDate(appointment: AppointmentPayload) {
  return new Date(`${appointment.date}T${appointment.time}:00`);
}

function buildEmail(type: string, appointment: AppointmentPayload, patient: PatientPayload) {
  const title = eventLabels[type] || "Njoftim per termin";
  const patientName = patient.name || "Pacient";
  const appUrl = Deno.env.get("APP_URL") || "https://appointment-system-mu.vercel.app";

  return {
    subject: `${title} - Smart Care`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#13233f;line-height:1.6">
        <h2>${title}</h2>
        <p>Pershendetje ${patientName},</p>
        <p>Detajet e terminit:</p>
        <ul>
          <li><strong>Data:</strong> ${appointment.date}</li>
          <li><strong>Ora:</strong> ${appointment.time}</li>
          <li><strong>Mjeku:</strong> ${appointment.doctor}</li>
          <li><strong>Statusi:</strong> ${appointment.status || "pending"}</li>
        </ul>
        <p>Mund ta kontrollosh terminin ne dashboard:</p>
        <p><a href="${appUrl}/dashboard">Hap dashboard</a></p>
      </div>
    `,
  };
}

async function sendEmail(type: string, appointment: AppointmentPayload, patient: PatientPayload) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const emailFrom = Deno.env.get("EMAIL_FROM");

  if (!resendApiKey || !emailFrom) {
    throw new Error("Missing RESEND_API_KEY or EMAIL_FROM.");
  }

  const email = buildEmail(type, appointment, patient);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFrom,
      to: patient.email,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email provider failed: ${details}`);
  }
}

async function logReminderIfNew(supabaseAdmin: ReturnType<typeof createClient>, appointmentId: string) {
  const { error } = await supabaseAdmin
    .from("appointment_email_logs")
    .insert({ appointment_id: appointmentId, type: "reminder_24h" });

  if (!error) return true;
  if (error.code === "23505") return false;

  throw error;
}

async function sendReminders() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  const { data: appointments, error } = await supabaseAdmin
    .from("appointments")
    .select("*")
    .not("status", "in", "(cancelled,completed)");

  if (error) throw error;

  let sent = 0;

  for (const appointment of appointments || []) {
    const appointmentDate = getAppointmentDate(appointment);

    if (appointmentDate < windowStart || appointmentDate > windowEnd || !appointment.id) {
      continue;
    }

    const shouldSend = await logReminderIfNew(supabaseAdmin, appointment.id);
    if (!shouldSend) continue;

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      appointment.user_id
    );

    if (userError || !userData.user?.email) {
      continue;
    }

    await sendEmail("reminder_24h", appointment, {
      email: userData.user.email,
      name: userData.user.user_metadata?.name,
    });
    sent += 1;
  }

  return sent;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();

    if (body.type === "send_reminders") {
      const sent = await sendReminders();
      return jsonResponse({ ok: true, sent });
    }

    if (!body.type || !body.appointment || !body.patient?.email) {
      return jsonResponse({ error: "Missing notification type, appointment, or patient email." }, 400);
    }

    await sendEmail(body.type, body.appointment, body.patient);
    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
