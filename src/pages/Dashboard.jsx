import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { isAdminUser, isDoctorUser } from "../utils/roles";

const ALL_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

const DOCTOR_PROFILES = [
  {
    key: "ava",
    specialty: "Kardiologe",
    hospital: "Qendra HealthPlus",
    experience: "9 vite eksperience",
    location: "Prishtine",
    fee: "35 EUR",
    days: ["Hene", "Merkure", "Premte"],
    photo:
      "https://images.pexels.com/photos/15752232/pexels-photo-15752232.jpeg?cs=srgb&dl=pexels-yasinaydin-15752232.jpg&fm=jpg",
    accent: "cardiology",
    rating: "4.9",
    bio: "Kujdes i avancuar per zemren, konsultime preventive dhe trajtim modern.",
  },
  {
    key: "ben",
    specialty: "Pediater",
    hospital: "Klinika Family Care",
    experience: "7 vite eksperience",
    location: "Prizren",
    fee: "30 EUR",
    days: ["Marte", "Enjte", "Shtune"],
    photo:
      "https://images.pexels.com/photos/6762876/pexels-photo-6762876.jpeg?cs=srgb&dl=pexels-usman-yousaf-708951-6762876.jpg&fm=jpg",
    accent: "pediatrics",
    rating: "4.8",
    bio: "Vizita te qeta dhe miqesore per femije, me fokus te komunikimi me prinderit.",
  },
  {
    key: "cora",
    specialty: "Dermatologe",
    hospital: "Skin Studio",
    experience: "11 vite eksperience",
    location: "Peje",
    fee: "40 EUR",
    days: ["Hene", "Enjte", "Premte"],
    photo:
      "https://images.pexels.com/photos/32254667/pexels-photo-32254667.jpeg?cs=srgb&dl=pexels-konrads-photo-32254667.jpg&fm=jpg",
    accent: "dermatology",
    rating: "5.0",
    bio: "Diagnoze estetike dhe klinike me plan te personalizuar per cdo pacient.",
  },
];

const SIDEBAR_ITEMS = [
  { id: "overview", label: "Dashboard", hint: "Terminet dhe rezervimet" },
  { id: "doctors", label: "Doktoret", hint: "Mjeket dhe specialitetet" },
  { id: "profile", label: "Profili", hint: "Te dhenat personale" },
];

const STATUS_LABELS = {
  pending: "Ne pritje",
  confirmed: "Konfirmuar",
  cancelled: "Anuluar",
  completed: "Perfunduar",
};

const ALL_SPECIALTIES_FILTER = "Te gjithe";

function toKey(value) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "";
}

function getAppointmentStatus(appointment) {
  return appointment?.status || "pending";
}

async function sendAppointmentEmailNotification(type, appointment, user) {
  if (!appointment || !user?.email) return;

  try {
    const { error } = await supabase.functions.invoke("send-appointment-email", {
      body: {
        type,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          doctor: appointment.doctor,
          status: getAppointmentStatus(appointment),
        },
        patient: {
          email: user.email,
          name: user.user_metadata?.name || user.email,
        },
      },
    });

    if (error) {
      console.warn("Appointment email notification failed:", error.message);
    }
  } catch (notificationError) {
    console.warn("Appointment email notification failed:", notificationError);
  }
}

function formatAppointment(appointment) {
  if (!appointment) return "Nuk ke termin te rezervuar ende.";
  return `${appointment.date} ne oren ${appointment.time} me ${appointment.doctor}.`;
}

function getDoctorProfile(doctorName, index) {
  const normalizedName = toKey(doctorName);
  const matchedProfile = DOCTOR_PROFILES.find((profile) =>
    normalizedName.includes(profile.key)
  );

  if (matchedProfile) {
    return {
      ...matchedProfile,
      name: doctorName,
    };
  }

  const fallbackProfile = DOCTOR_PROFILES[index % DOCTOR_PROFILES.length];

  return {
    ...fallbackProfile,
    name: doctorName,
  };
}

function getReadableSupabaseError(error, fallbackMessage) {
  if (!error) return fallbackMessage;

  if (error.code === "42501") {
    return "Nuk ke leje per kete veprim ne databaze. Kontrollo RLS policy te tabeles appointments.";
  }

  if (error.code === "23505") {
    return "Ky termin duket se ekziston tashme.";
  }

  if (error.message) {
    return `${fallbackMessage} ${error.message}`;
  }

  return fallbackMessage;
}

function getAssistantReply({
  question,
  appointments,
  doctorCards,
  availableTimes,
  profileName,
  selectedDoctor,
  selectedDate,
  offline,
}) {
  const normalized = question.toLowerCase().trim();
  const upcomingAppointment = appointments[0];

  if (!normalized) {
    return "Shkruaj nje pyetje dhe une do mundohem te te ndihmoj.";
  }

  if (offline) {
    return "Je offline per momentin. Lidhe internetin qe te rifreskohen te dhenat dhe terminet.";
  }

  if (
    normalized.includes("pershendetje") ||
    normalized.includes("tung") ||
    normalized.includes("hello") ||
    normalized.includes("hi")
  ) {
    return `Pershendetje ${profileName || "pacient"}! Mund te te ndihmoj me termine, mjeke, profil ose orare te lira.`;
  }

  if (
    normalized.includes("termini im") ||
    normalized.includes("termini tjeter") ||
    normalized.includes("kur e kam termin") ||
    normalized.includes("appointment")
  ) {
    return formatAppointment(upcomingAppointment);
  }

  if (
    normalized.includes("sa termine") ||
    normalized.includes("how many") ||
    normalized.includes("gjithsej termine")
  ) {
    return appointments.length
      ? `Ke ${appointments.length} termin${appointments.length > 1 ? "e" : ""} te regjistruara. Termini me i afert eshte ${formatAppointment(upcomingAppointment)}`
      : "Aktualisht nuk ke asnje termin te regjistruar.";
  }

  if (
    normalized.includes("fshi") ||
    normalized.includes("anulo") ||
    normalized.includes("cancel")
  ) {
    return appointments.length
      ? "Per ta anuluar nje termin, shko te 'Terminet e tua' dhe kliko butonin Fshi te kartela e terminit."
      : "Nuk ke termin per ta anuluar per momentin.";
  }

  if (
    normalized.includes("edit") ||
    normalized.includes("ndrysho termin") ||
    normalized.includes("perditeso termin")
  ) {
    return appointments.length
      ? "Per te ndryshuar terminin, kliko Edit te kartela e terminit dhe forma siper do mbushet automatikisht."
      : "Fillimisht rezervo nje termin, pastaj mund ta perditesosh nga lista.";
  }

  if (
    normalized.includes("mjek") ||
    normalized.includes("doktor") ||
    normalized.includes("doctor")
  ) {
    if (!doctorCards.length) {
      return "Nuk ka mjeke ne liste per momentin.";
    }

    const highlightedDoctors = doctorCards
      .slice(0, 3)
      .map((doctor) => `${doctor.name} (${doctor.specialty})`)
      .join(", ");

    return `Mjeket qe mund te zgjedhesh jane: ${highlightedDoctors}. Mund te hapesh edhe faqen Doktoret per me shume detaje.`;
  }

  if (
    normalized.includes("or") ||
    normalized.includes("available") ||
    normalized.includes("te lira")
  ) {
    if (!selectedDoctor || !selectedDate) {
      return "Zgjidh fillimisht nje mjek dhe nje date, pastaj une mund te te tregoj oraret e lira.";
    }

    return availableTimes.length
      ? `Per ${selectedDoctor} me daten ${selectedDate}, oraret e lira jane: ${availableTimes.slice(0, 6).join(", ")}${availableTimes.length > 6 ? "..." : ""}`
      : "Nuk shoh orare te lira per zgjedhjen aktuale.";
  }

  if (
    normalized.includes("profil") ||
    normalized.includes("emri im") ||
    normalized.includes("profile")
  ) {
    return `Te faqja Profili mund te ndryshosh emrin, telefonin, datelindjen dhe shenimet mjekesore bazike. Tani emri i ruajtur eshte ${profileName || "i papercaktuar"}.`;
  }

  if (
    normalized.includes("rezervo") ||
    normalized.includes("book") ||
    normalized.includes("si te rezervoj")
  ) {
    return "Per te rezervuar, zgjidh daten, mjekun dhe oren te forma kryesore, pastaj kliko 'Rezervo terminin'.";
  }

  if (
    normalized.includes("ndihme") ||
    normalized.includes("help") ||
    normalized.includes("cfare mund te besh")
  ) {
    return "Mund te te ndihmoj me: terminin tend te ardhshem, numrin e termineve, mjeket e disponueshem, oraret e lira, profilin dhe si te editosh ose fshish nje termin.";
  }

  return "E kuptova pyetjen, por me sakte mund te te ndihmoj nese pyet per terminin, mjeket, oraret e lira, profilin ose editimin e terminit.";
}

async function getGroqAssistantReply({
  question,
  appointments,
  doctorCards,
  availableTimes,
  profileName,
  selectedDoctor,
  selectedDate,
  chatHistory,
}) {
  const { data, error } = await supabase.functions.invoke("groq-assistant", {
    body: {
      question,
      appointments: appointments.map((appointment) => ({
        date: appointment.date,
        time: appointment.time,
        doctor: appointment.doctor,
        status: getAppointmentStatus(appointment),
      })),
      doctors: doctorCards.map((doctorCard) => ({
        name: doctorCard.name,
        specialty: doctorCard.specialty,
        location: doctorCard.location,
        fee: doctorCard.fee,
        days: doctorCard.days,
      })),
      availableTimes,
      profileName,
      selectedDoctor,
      selectedDate,
      chatHistory,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.reply) {
    throw new Error("AI assistant returned an empty reply.");
  }

  return data.reply;
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [availableTimes, setAvailableTimes] = useState(ALL_TIMES);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [doctor, setDoctor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [activeView, setActiveView] = useState("overview");
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profileMedicalNotes, setProfileMedicalNotes] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState(null);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [bookingSpecialty, setBookingSpecialty] = useState(ALL_SPECIALTIES_FILTER);
  const appointmentEditorRef = useRef(null);
  const appointmentsSectionRef = useRef(null);

  const doctorCards = useMemo(
    () => doctorsList.map((doctorItem, index) => getDoctorProfile(doctorItem.name, index)),
    [doctorsList]
  );
  const filteredDoctorCards = useMemo(() => {
    const query = doctorSearch.trim().toLowerCase();

    if (!query) return doctorCards;

    return doctorCards.filter((doctorCard) =>
      [doctorCard.name, doctorCard.specialty, doctorCard.hospital, doctorCard.location]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [doctorCards, doctorSearch]);

  const upcomingAppointment = appointments[0] || null;
  const appointmentCount = appointments.length;
  const canAccessAdmin = isAdminUser(user);
  const canAccessDoctorPanel = isDoctorUser(user) || canAccessAdmin;
  const doctorOptions = useMemo(() => {
    if (!doctor || doctorCards.some((doctorOption) => doctorOption.name === doctor)) {
      return doctorCards;
    }

    return [
      ...doctorCards,
      {
        name: doctor,
        specialty: "Mjek i zgjedhur",
      },
    ];
  }, [doctor, doctorCards]);
  const bookingSpecialties = useMemo(
    () => [
      ALL_SPECIALTIES_FILTER,
      ...Array.from(new Set(doctorOptions.map((doctorOption) => doctorOption.specialty).filter(Boolean))),
    ],
    [doctorOptions]
  );
  const bookingDoctorCards = useMemo(() => {
    if (bookingSpecialty === ALL_SPECIALTIES_FILTER) return doctorOptions;

    return doctorOptions.filter((doctorOption) => doctorOption.specialty === bookingSpecialty);
  }, [bookingSpecialty, doctorOptions]);
  const selectedDoctorProfile = useMemo(
    () => doctorOptions.find((doctorOption) => doctorOption.name === doctor) || null,
    [doctor, doctorOptions]
  );
  const timeOptions = useMemo(() => {
    if (!time || availableTimes.includes(time)) {
      return availableTimes;
    }

    return [time, ...availableTimes];
  }, [availableTimes, time]);

  const refreshAppointments = async (currentUser = user, focusOnList = false) => {
    if (!currentUser?.id) return;

    setLoading(true);

    const { data, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (appointmentsError) {
      setError("Gabim gjate marrjes se termineve!");
    } else {
      setAppointments(data || []);
      if (focusOnList) {
        window.requestAnimationFrame(() => {
          appointmentsSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setUser(data.user);
      setProfileName(data.user.user_metadata?.name || "");
      setProfilePhone(data.user.user_metadata?.phone || "");
      setProfileBirthDate(data.user.user_metadata?.birth_date || "");
      setProfileMedicalNotes(data.user.user_metadata?.medical_notes || "");
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    async function loadDashboardData() {
      setLoading(true);

      const [{ data: appointmentsData, error: appointmentsError }, { data: doctorsData }] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .eq("user_id", user.id)
            .order("date", { ascending: true })
            .order("time", { ascending: true }),
          supabase.from("doctors").select("*"),
        ]);

      if (cancelled) return;

      if (appointmentsError) setError("Gabim gjate marrjes se termineve!");
      else setAppointments(appointmentsData || []);

      setDoctorsList(doctorsData || []);
      setLoading(false);
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!doctor || !date) return;

    let cancelled = false;

    async function loadAvailableTimes() {
      const { data, error: timesError } = await supabase
        .from("appointments")
        .select("id, time")
        .eq("doctor", doctor)
        .eq("date", date);

      if (cancelled) return;

      if (timesError) {
        setAvailableTimes(ALL_TIMES);
        return;
      }

      const bookedTimes =
        data
          ?.filter((appointment) => appointment.id !== editingAppointmentId)
          .map((appointment) => appointment.time) || [];

      const freeTimes = ALL_TIMES.filter((slot) => !bookedTimes.includes(slot));
      setAvailableTimes(freeTimes.length > 0 ? freeTimes : ALL_TIMES);
    }

    loadAvailableTimes();

    return () => {
      cancelled = true;
    };
  }, [doctor, date, editingAppointmentId]);

  const resetForm = () => {
    setDate("");
    setTime("");
    setDoctor("");
    setEditingAppointmentId(null);
    setAvailableTimes(ALL_TIMES);
  };

  const handleDateChange = (e) => {
    const nextDate = e.target.value;
    setDate(nextDate);

    if (!nextDate || !doctor) {
      setAvailableTimes(ALL_TIMES);
    }
  };

  const handleDoctorChange = (e) => {
    const nextDoctor = e.target.value;
    setDoctor(nextDoctor);

    if (!nextDoctor || !date) {
      setAvailableTimes(ALL_TIMES);
    }
  };

  const chooseDoctorForBooking = (nextDoctor) => {
    setDoctor(nextDoctor);

    if (!nextDoctor || !date) {
      setAvailableTimes(ALL_TIMES);
    }
  };

  const handleSubmitAppointment = async (e) => {
    e.preventDefault();

    if (loading || !user) return;

    setError("");
    setSuccess("");
    setActiveView("overview");

    if (!date || !time || !doctor) {
      setError("Ploteso te gjitha fushat!");
      return;
    }

    setLoading(true);

    const currentEditingId = editingAppointmentId;
    const fallbackPayload = { user_id: user.id, date, time, doctor };
    const payload = {
      ...fallbackPayload,
      status: "pending",
    };
    const saveAppointment = (nextPayload) =>
      currentEditingId
        ? supabase
            .from("appointments")
            .update(nextPayload)
            .eq("id", currentEditingId)
            .eq("user_id", user.id)
            .select("*")
            .single()
        : supabase.from("appointments").insert([nextPayload]).select("*").single();

    let { data: savedAppointment, error: appointmentError } = await saveAppointment(payload);

    if (appointmentError?.message?.toLowerCase().includes("status")) {
      const fallbackResult = await saveAppointment(fallbackPayload);
      savedAppointment = fallbackResult.data;
      appointmentError = fallbackResult.error;
    }

    if (appointmentError) {
      setError(
        getReadableSupabaseError(
          appointmentError,
          currentEditingId
            ? "Gabim gjate perditesimit te terminit!"
            : "Gabim gjate rezervimit!"
        )
      );
      console.error("Appointment save error:", appointmentError);
      setLoading(false);
      return;
    }

    setSuccess(
      currentEditingId
        ? "Termini u perditesua me sukses dhe u shfaq te lista."
        : "Termini u rezervua me sukses dhe u shtua te terminet e tua."
    );
    await sendAppointmentEmailNotification(
      currentEditingId ? "appointment_updated" : "appointment_booked",
      savedAppointment || { id: currentEditingId, ...fallbackPayload },
      user
    );
    resetForm();
    await refreshAppointments(user, true);
    setHighlightedAppointmentId(currentEditingId || null);
  };

  const startEditingAppointment = (appointment) => {
    setEditingAppointmentId(appointment.id);
    setDate(appointment.date);
    setTime(appointment.time);
    setDoctor(appointment.doctor);
    setActiveView("overview");
    setHighlightedAppointmentId(appointment.id);
    setSuccess("");
    setError("");

    window.requestAnimationFrame(() => {
      appointmentEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const deleteAppointment = async (id) => {
    if (!user || !window.confirm("A jeni i sigurt?")) return;

    const appointmentToCancel = appointments.find((appointment) => appointment.id === id);
    const { error: deleteError } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError("Termini nuk u anulua. Provo perseri.");
      return;
    }

    await sendAppointmentEmailNotification("appointment_cancelled", appointmentToCancel, user);

    if (editingAppointmentId === id) {
      resetForm();
    }

    if (highlightedAppointmentId === id) {
      setHighlightedAppointmentId(null);
    }

    refreshAppointments();
  };

  const updateProfile = async (e) => {
    e.preventDefault();

    if (!profileName.trim()) {
      setError("Emri nuk mund te jete bosh.");
      return;
    }

    setProfileLoading(true);
    setError("");
    setSuccess("");

    const { data, error: profileError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        name: profileName.trim(),
        phone: profilePhone.trim(),
        birth_date: profileBirthDate,
        medical_notes: profileMedicalNotes.trim(),
      },
    });

    if (profileError) {
      setError("Profili nuk u perditesua.");
      setProfileLoading(false);
      return;
    }

    setUser(data.user);
    setSuccess("Profili u perditesua me sukses.");
    setProfileLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSendMessage = async () => {
    const question = message.trim();
    if (!question || assistantLoading) return;

    setMessage("");
    setAssistantLoading(true);

    const fallbackReply = getAssistantReply({
      question,
      appointments,
      doctorCards,
      availableTimes,
      profileName,
      selectedDoctor: doctor,
      selectedDate: date,
      offline,
    });

    if (offline) {
      setChat((currentChat) => [...currentChat, { user: question, bot: fallbackReply }]);
      setAssistantLoading(false);
      return;
    }

    try {
      const reply = await getGroqAssistantReply({
        question,
        appointments,
        doctorCards,
        availableTimes,
        profileName,
        selectedDoctor: doctor,
        selectedDate: date,
        chatHistory: chat,
      });

      setChat((currentChat) => [...currentChat, { user: question, bot: reply }]);
    } catch (assistantError) {
      console.warn("Groq assistant failed, using local fallback:", assistantError);
      setChat((currentChat) => [...currentChat, { user: question, bot: fallbackReply }]);
    } finally {
      setAssistantLoading(false);
    }
  };

  if (!user) return <p className="page-loading">Loading...</p>;

  return (
    <div className="app-shell">
      <aside className="sidebar-panel">
        <div>
          <div className="brand-mark">
            <div className="brand-mark__icon">A</div>
            <div>
              <p className="brand-mark__eyebrow">Appointment System</p>
              <h1 className="brand-mark__title">Smart Care</h1>
            </div>
          </div>

          <div className="sidebar-profile">
            <div className="avatar">
              {user.user_metadata?.name?.charAt(0) || user.email.charAt(0)}
            </div>
            <div>
              <h3>{user.user_metadata?.name || "Pacient"}</h3>
              <p>{user.email}</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setActiveView(item.id)}
              >
                <span>{item.label}</span>
                <small>{item.hint}</small>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="status-card">
            <span className={offline ? "status-dot offline" : "status-dot"} />
            <div>
              <strong>{offline ? "Offline mode" : "Online"}</strong>
              <p>
                {offline
                  ? "Kontrollo lidhjen me internet."
                  : "Cdo gje eshte gati per rezervim."}
              </p>
            </div>
          </div>
          <button type="button" className="logout-button" onClick={logout}>
            Logout
          </button>
          {canAccessAdmin && (
            <button type="button" className="admin-link-button" onClick={() => { window.location.href = "/admin"; }}>
              Admin Dashboard
            </button>
          )}
          {canAccessDoctorPanel && (
            <button type="button" className="admin-link-button" onClick={() => { window.location.href = "/doctor"; }}>
              Paneli i mjekut
            </button>
          )}
        </div>
      </aside>

      <main className="main-panel">
        <section className="top-banner">
          <div>
            <p className="section-eyebrow">Portal pacienti</p>
            <h2>Miresevjen, {user.user_metadata?.name || "pacient"}.</h2>
            <p className="section-copy">
              Menaxho terminet, eksploro mjeket dhe mbaj profilin tend te perditesuar.
            </p>
          </div>
          <div className="hero-summary">
            <div>
              <span>Termini i ardhshem</span>
              <strong>
                {upcomingAppointment
                  ? `${upcomingAppointment.date} / ${upcomingAppointment.time}`
                  : "Nuk ka ende"}
              </strong>
            </div>
            <div>
              <span>Gjithsej termine</span>
              <strong>{appointmentCount}</strong>
            </div>
          </div>
        </section>

        {error && <div className="feedback-banner error-banner">{error}</div>}
        {success && <div className="feedback-banner success-banner">{success}</div>}

        {activeView === "overview" && (
          <div className="content-grid">
            <section
              ref={appointmentEditorRef}
              className={
                editingAppointmentId
                  ? "panel appointment-editor appointment-editor--editing"
                  : "panel appointment-editor"
              }
            >
              <div className="panel-heading">
                <div>
                  <p className="section-eyebrow">
                    {editingAppointmentId ? "Edit appointment" : "New appointment"}
                  </p>
                  <h3>
                    {editingAppointmentId
                      ? "Perditeso terminin ekzistues"
                      : "Rezervo nje termin te ri"}
                  </h3>
                  {editingAppointmentId && (
                    <p className="edit-mode-note">
                      Ndrysho daten, mjekun ose oren dhe kliko Ruaj ndryshimet.
                    </p>
                  )}
                </div>
                {editingAppointmentId && (
                  <button type="button" className="ghost-button" onClick={resetForm}>
                    Anulo editimin
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmitAppointment} className="stack-form">
                <label>
                  <span>Data</span>
                  <input type="date" value={date} onChange={handleDateChange} />
                </label>

                <div className="booking-step">
                  <div className="booking-step__heading">
                    <span>Mjeku</span>
                    <small>{doctor ? "Mjeku eshte zgjedhur" : "Zgjidh sipas specialitetit"}</small>
                  </div>

                  <div className="specialty-filter">
                    {bookingSpecialties.map((specialty) => (
                      <button
                        key={specialty}
                        type="button"
                        className={
                          bookingSpecialty === specialty
                            ? "specialty-pill specialty-pill--active"
                            : "specialty-pill"
                        }
                        onClick={() => setBookingSpecialty(specialty)}
                      >
                        {specialty}
                      </button>
                    ))}
                  </div>

                  <div className="booking-doctor-grid">
                    {bookingDoctorCards.map((doctorOption) => (
                      <button
                        key={doctorOption.name}
                        type="button"
                        className={
                          doctor === doctorOption.name
                            ? `booking-doctor-card booking-doctor-card--selected ${doctorOption.accent || ""}`
                            : `booking-doctor-card ${doctorOption.accent || ""}`
                        }
                        onClick={() => chooseDoctorForBooking(doctorOption.name)}
                      >
                        {doctorOption.photo && (
                          <img src={doctorOption.photo} alt={doctorOption.name} />
                        )}
                        <span className="booking-doctor-card__name">{doctorOption.name}</span>
                        <span className="booking-doctor-card__meta">
                          {doctorOption.specialty}
                          {doctorOption.location ? ` / ${doctorOption.location}` : ""}
                        </span>
                        <span className="booking-doctor-card__footer">
                          <strong>{doctorOption.rating || "4.8"}</strong>
                          <span>{doctorOption.fee || "Cmimi sipas klinikes"}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <label className="compact-select">
                    <span>Ose zgjidh nga lista</span>
                    <select value={doctor} onChange={handleDoctorChange}>
                      <option value="">Zgjidh mjekun</option>
                      {doctorOptions.map((doctorOption) => (
                        <option key={doctorOption.name} value={doctorOption.name}>
                          {doctorOption.name} - {doctorOption.specialty}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="booking-step">
                  <div className="booking-step__heading">
                    <span>Ora</span>
                    <small>
                      {doctor && date
                        ? "Zgjidh nje slot te lire"
                        : "Zgjidh daten dhe mjekun per disponueshmeri"}
                    </small>
                  </div>

                  <div className="time-slot-grid">
                    {ALL_TIMES.map((slot) => {
                      const isAvailable = timeOptions.includes(slot);
                      const isSelected = time === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          className={isSelected ? "time-slot time-slot--selected" : "time-slot"}
                          disabled={!isAvailable}
                          onClick={() => setTime(slot)}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="booking-summary">
                  <div>
                    <span>Mjeku</span>
                    <strong>{doctor || "Pa zgjedhur"}</strong>
                  </div>
                  <div>
                    <span>Data</span>
                    <strong>{date || "Pa zgjedhur"}</strong>
                  </div>
                  <div>
                    <span>Ora</span>
                    <strong>{time || "Pa zgjedhur"}</strong>
                  </div>
                  <div>
                    <span>Cmimi</span>
                    <strong>{selectedDoctorProfile?.fee || "Sipas klinikes"}</strong>
                  </div>
                </div>

                <button type="submit" disabled={loading}>
                  {loading
                    ? "Duke ruajtur..."
                    : editingAppointmentId
                      ? "Ruaj ndryshimet"
                      : "Rezervo terminin"}
                </button>
              </form>
            </section>

            <section className="panel metrics-panel">
              <div className="mini-stat">
                <span>Pacient aktiv</span>
                <strong>{user.user_metadata?.name || user.email}</strong>
              </div>
              <div className="mini-stat">
                <span>Status</span>
                <strong>{offline ? "Offline" : "Online"}</strong>
              </div>
              <div className="mini-stat">
                <span>Mjeke aktive</span>
                <strong>{doctorCards.length}</strong>
              </div>
            </section>

            <section ref={appointmentsSectionRef} className="panel appointments-panel wide-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-eyebrow">Appointments</p>
                  <h3>Terminet e tua</h3>
                </div>
                <button type="button" className="ghost-button" onClick={() => refreshAppointments()}>
                  Rifresko
                </button>
              </div>

              {loading ? (
                <p className="empty-state">Duke u ngarkuar terminet...</p>
              ) : appointments.length === 0 ? (
                <p className="empty-state">Nuk ke termine ende.</p>
              ) : (
                <div className="appointments-list advanced-list">
                  {appointments.map((appointment) => (
                    <article
                      key={appointment.id}
                      className={
                        appointment.id === highlightedAppointmentId
                          ? "appointment-card advanced-card appointment-card--highlight"
                          : "appointment-card advanced-card"
                      }
                    >
                      <div>
                        <p className="appointment-time">
                          {appointment.date} ne {appointment.time}
                        </p>
                        <h4>{appointment.doctor}</h4>
                        <span className={`appointment-tag status-${getAppointmentStatus(appointment)}`}>
                          {STATUS_LABELS[getAppointmentStatus(appointment)] || "Ne pritje"}
                        </span>
                      </div>
                      <div className="card-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditingAppointment(appointment)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => deleteAppointment(appointment.id)}
                        >
                          Fshi
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="panel assistant-panel wide-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-eyebrow">Assistant</p>
                  <h3>AI Asistent</h3>
                </div>
              </div>

              <div className="assistant-suggestions">
                <button type="button" className="assistant-chip" onClick={() => setMessage("Kur e kam terminin tim te ardhshem?")}>
                  Termini im
                </button>
                <button type="button" className="assistant-chip" onClick={() => setMessage("Cilet mjeke jane ne dispozicion?")}>
                  Mjeket
                </button>
                <button type="button" className="assistant-chip" onClick={() => setMessage("Cilat ore jane te lira?")}>
                  Orari i lire
                </button>
                <button type="button" className="assistant-chip" onClick={() => setMessage("Si ta editoj nje termin?")}>
                  Edit termin
                </button>
              </div>

              <div className="chat-box polished-chat">
                {chat.length === 0 ? (
                  <p className="empty-state">
                    {assistantLoading
                      ? "AI po pergatit pergjigjen..."
                      : 'Provo pyetje si: "Kur e kam termin?", "Cilat ore jane te lira?" ose "Si ta editoj nje termin?"'}
                  </p>
                ) : (
                  <>
                    {chat.map((entry, index) => (
                      <div key={index} className="chat-entry">
                        <p>
                          <strong>Ti:</strong> {entry.user}
                        </p>
                        <p>
                          <strong>AI:</strong> {entry.bot}
                        </p>
                      </div>
                    ))}
                    {assistantLoading && (
                      <div className="chat-entry">
                        <p>
                          <strong>AI:</strong> Duke menduar...
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="chat-input">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Pyet dicka..."
                />
                <button type="button" onClick={handleSendMessage} disabled={assistantLoading}>
                  {assistantLoading ? "Duke derguar..." : "Dergo"}
                </button>
              </div>
            </section>
          </div>
        )}

        {activeView === "doctors" && (
          <section className="doctors-page">
            <div className="panel-heading doctors-heading">
              <div>
                <p className="section-eyebrow">Medical team</p>
                <h3>Doktoret e disponueshem</h3>
              </div>
              <p className="section-copy">
                Zgjidh mjekun sipas specialitetit dhe kalo direkt te rezervimi.
              </p>
            </div>

            <div className="doctor-toolbar">
              <input
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Kerko sipas emrit, specialitetit ose qytetit"
              />
              <div className="doctor-toolbar__summary">
                {filteredDoctorCards.length} mjek{filteredDoctorCards.length !== 1 ? "e" : ""}
              </div>
            </div>

            <div className="doctor-grid">
              {filteredDoctorCards.map((doctorCard) => (
                <article key={doctorCard.name} className={`doctor-card ${doctorCard.accent}`}>
                  <img src={doctorCard.photo} alt={doctorCard.name} className="doctor-photo" />
                  <div className="doctor-card__body">
                    <div className="doctor-meta">
                      <span className="doctor-rating">{doctorCard.rating}</span>
                      <span>{doctorCard.hospital}</span>
                    </div>
                    <h4>{doctorCard.name}</h4>
                    <p className="doctor-specialty">{doctorCard.specialty}</p>
                    <p>{doctorCard.bio}</p>
                    <div className="doctor-details">
                      <span>{doctorCard.location}</span>
                      <span>{doctorCard.fee}</span>
                    </div>
                    <div className="doctor-days">
                      {doctorCard.days.map((day) => (
                        <span key={day} className="doctor-day">
                          {day}
                        </span>
                      ))}
                    </div>
                    <div className="doctor-footer">
                      <span>{doctorCard.experience}</span>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          setDoctor(doctorCard.name);
                          setActiveView("overview");
                        }}
                      >
                        Rezervo me kete mjek
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filteredDoctorCards.length === 0 && (
              <div className="panel empty-doctors">
                Nuk u gjet asnje mjek me kete kerkim.
              </div>
            )}
          </section>
        )}

        {activeView === "profile" && (
          <div className="profile-layout">
            <section className="panel profile-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-eyebrow">Personal info</p>
                  <h3>Profili yt</h3>
                </div>
              </div>

              <form className="stack-form" onSubmit={updateProfile}>
                <label>
                  <span>Emri i plote</span>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Shkruaj emrin"
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input value={user.email} disabled />
                </label>

                <label>
                  <span>Telefoni</span>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+383 44 000 000"
                  />
                </label>

                <label>
                  <span>Datelindja</span>
                  <input
                    type="date"
                    value={profileBirthDate}
                    onChange={(e) => setProfileBirthDate(e.target.value)}
                  />
                </label>

                <label>
                  <span>Shenime mjekesore bazike</span>
                  <textarea
                    value={profileMedicalNotes}
                    onChange={(e) => setProfileMedicalNotes(e.target.value)}
                    placeholder="Alergji, terapi aktuale, diagnoza te rendesishme..."
                    rows={5}
                  />
                </label>

                <button type="submit" disabled={profileLoading}>
                  {profileLoading ? "Duke ruajtur..." : "Ruaj profilin"}
                </button>
              </form>
            </section>

            <section className="panel profile-summary">
              <div className="profile-badge">
                <div className="avatar large-avatar">
                  {user.user_metadata?.name?.charAt(0) || user.email.charAt(0)}
                </div>
                <div>
                  <h4>{user.user_metadata?.name || "Pacient"}</h4>
                  <p>{user.email}</p>
                </div>
              </div>

              <div className="mini-stat">
                <span>Terminet aktive</span>
                <strong>{appointmentCount}</strong>
              </div>
              <div className="mini-stat">
                <span>Telefoni</span>
                <strong>{user.user_metadata?.phone || "Pa telefon"}</strong>
              </div>
              <div className="mini-stat">
                <span>Datelindja</span>
                <strong>{user.user_metadata?.birth_date || "E papercaktuar"}</strong>
              </div>
              <div className="mini-stat">
                <span>Mjeku i fundit</span>
                <strong>{upcomingAppointment?.doctor || "Pa rezervim"}</strong>
              </div>
              <div className="profile-notes">
                <span>Shenime mjekesore</span>
                <p>{user.user_metadata?.medical_notes || "Nuk ka shenime te ruajtura."}</p>
              </div>
              <div className="mini-stat">
                <span>Status i llogarise</span>
                <strong>Aktive</strong>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
