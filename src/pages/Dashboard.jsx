import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";

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
    photo:
      "https://randomuser.me/api/portraits/women/44.jpg",
    accent: "cardiology",
    rating: "4.9",
    bio: "Kujdes i avancuar per zemren, konsultime preventive dhe trajtim modern.",
  },
  {
    key: "ben",
    specialty: "Pediater",
    hospital: "Klinika Family Care",
    experience: "7 vite eksperience",
    photo:
      "https://randomuser.me/api/portraits/men/32.jpg",
    accent: "pediatrics",
    rating: "4.8",
    bio: "Vizita te qeta dhe miqesore per femije, me fokus te komunikimi me prinderit.",
  },
  {
    key: "cora",
    specialty: "Dermatologe",
    hospital: "Skin Studio",
    experience: "11 vite eksperience",
    photo:
      "https://randomuser.me/api/portraits/women/68.jpg",
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

function toKey(value) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, "") || "";
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
    return `Te faqja Profili mund te ndryshosh emrin. Tani emri i ruajtur eshte ${profileName || "i papercaktuar"}.`;
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
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [activeView, setActiveView] = useState("overview");
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [highlightedAppointmentId, setHighlightedAppointmentId] = useState(null);
  const appointmentsSectionRef = useRef(null);

  const doctorCards = useMemo(
    () => doctorsList.map((doctorItem, index) => getDoctorProfile(doctorItem.name, index)),
    [doctorsList]
  );

  const upcomingAppointment = appointments[0] || null;
  const appointmentCount = appointments.length;

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

    const payload = { user_id: user.id, date, time, doctor };
    const currentEditingId = editingAppointmentId;
    const request = currentEditingId
      ? supabase
          .from("appointments")
          .update(payload)
          .eq("id", currentEditingId)
          .eq("user_id", user.id)
      : supabase.from("appointments").insert([payload]);

    const { error: appointmentError } = await request;

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
    setSuccess("");
    setError("");
  };

  const deleteAppointment = async (id) => {
    if (!user || !window.confirm("A jeni i sigurt?")) return;

    await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

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
      data: { name: profileName.trim() },
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

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const reply = getAssistantReply({
      question: message,
      appointments,
      doctorCards,
      availableTimes,
      profileName,
      selectedDoctor: doctor,
      selectedDate: date,
      offline,
    });

    setChat((currentChat) => [...currentChat, { user: message, bot: reply }]);
    setMessage("");
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
            <section className="panel appointment-editor">
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

                <label>
                  <span>Mjeku</span>
                  <select value={doctor} onChange={handleDoctorChange}>
                    <option value="">Zgjidh mjekun</option>
                    {doctorCards.map((doctorOption) => (
                      <option key={doctorOption.name} value={doctorOption.name}>
                        {doctorOption.name} - {doctorOption.specialty}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Ora</span>
                  <select value={time} onChange={(e) => setTime(e.target.value)}>
                    <option value="">Zgjidh oren</option>
                    {availableTimes.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>

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
                        <span className="appointment-tag">Vizite e planifikuar</span>
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
                    Provo pyetje si: "Kur e kam termin?", "Cilat ore jane te lira?" ose "Si ta editoj nje termin?"
                  </p>
                ) : (
                  chat.map((entry, index) => (
                    <div key={index} className="chat-entry">
                      <p>
                        <strong>Ti:</strong> {entry.user}
                      </p>
                      <p>
                        <strong>AI:</strong> {entry.bot}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="chat-input">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Pyet dicka..."
                />
                <button type="button" onClick={handleSendMessage}>
                  Dergo
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

            <div className="doctor-grid">
              {doctorCards.map((doctorCard) => (
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
                <span>Mjeku i fundit</span>
                <strong>{upcomingAppointment?.doctor || "Pa rezervim"}</strong>
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
