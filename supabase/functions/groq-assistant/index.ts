const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppointmentPayload = {
  date?: string;
  time?: string;
  doctor?: string;
  status?: string;
};

type DoctorPayload = {
  name?: string;
  specialty?: string;
  location?: string;
  fee?: string;
  days?: string[];
};

type AssistantRequest = {
  question?: string;
  profileName?: string;
  selectedDoctor?: string;
  selectedDate?: string;
  availableTimes?: string[];
  appointments?: AppointmentPayload[];
  doctors?: DoctorPayload[];
  chatHistory?: Array<{ user?: string; bot?: string }>;
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

function compactContext(body: AssistantRequest) {
  return {
    patientName: body.profileName || "Pacient",
    selectedDoctor: body.selectedDoctor || null,
    selectedDate: body.selectedDate || null,
    availableTimes: (body.availableTimes || []).slice(0, 12),
    appointments: (body.appointments || []).slice(0, 8).map((appointment) => ({
      date: appointment.date,
      time: appointment.time,
      doctor: appointment.doctor,
      status: appointment.status || "pending",
    })),
    doctors: (body.doctors || []).slice(0, 8).map((doctor) => ({
      name: doctor.name,
      specialty: doctor.specialty,
      location: doctor.location,
      fee: doctor.fee,
      days: doctor.days,
    })),
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const groqModel = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

    if (!groqApiKey) {
      return jsonResponse({ error: "Missing GROQ_API_KEY." }, 500);
    }

    const body = (await request.json()) as AssistantRequest;
    const question = body.question?.trim();

    if (!question) {
      return jsonResponse({ error: "Question is required." }, 400);
    }

    const recentHistory = (body.chatHistory || []).slice(-4).flatMap((entry) => [
      { role: "user", content: entry.user || "" },
      { role: "assistant", content: entry.bot || "" },
    ]).filter((message) => message.content);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.35,
        max_completion_tokens: 420,
        messages: [
          {
            role: "system",
            content:
              "Je AI Asistent per Smart Care, nje sistem per termine mjekesore. Pergjigju shqip, shkurt dhe praktikisht. Perdor vetem kontekstin e dhene per termine, mjeke, orare dhe profil. Mos jep diagnoza, receta, doza barnash ose keshilla urgjente mjekesore; per simptoma serioze udhezo perdoruesin te kontaktoje mjekun ose urgjencen. Kur nuk je i sigurt, thuaje qarte dhe sugjero hapin e radhes ne aplikacion.",
          },
          {
            role: "system",
            content: `Konteksti aktual i dashboard-it: ${JSON.stringify(compactContext(body))}`,
          },
          ...recentHistory,
          { role: "user", content: question },
        ],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      return jsonResponse({ error: `Groq request failed: ${details}` }, 502);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return jsonResponse({ error: "Groq returned an empty response." }, 502);
    }

    return jsonResponse({ reply, model: groqModel });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
