import { useEffect, useState } from "react";
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

  const refreshAppointments = async () => {
    if (!user?.id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) setError("Gabim gjate marrjes se termineve!");
    else setAppointments(data || []);

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
      const { data, error } = await supabase
        .from("appointments")
        .select("time")
        .eq("doctor", doctor)
        .eq("date", date);

      if (cancelled) return;

      if (error) {
        setAvailableTimes(ALL_TIMES);
        return;
      }

      const bookedTimes = data?.map((appointment) => appointment.time) || [];
      const freeTimes = ALL_TIMES.filter((slot) => !bookedTimes.includes(slot));
      setAvailableTimes(freeTimes.length > 0 ? freeTimes : ALL_TIMES);
    }

    loadAvailableTimes();

    return () => {
      cancelled = true;
    };
  }, [doctor, date]);

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

  const addAppointment = async (e) => {
    e.preventDefault();

    if (loading || !user) return;

    setError("");
    setSuccess("");

    if (!date || !time || !doctor) {
      setError("Ploteso te gjitha fushat!");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("appointments")
      .insert([{ user_id: user.id, date, time, doctor }]);

    if (error) {
      setError("Gabim gjate rezervimit!");
      setLoading(false);
      return;
    }

    setSuccess("Termini u rezervua me sukses.");
    setDate("");
    setTime("");
    setDoctor("");
    setAvailableTimes(ALL_TIMES);
    await refreshAppointments();
  };

  const deleteAppointment = async (id) => {
    if (!user || !window.confirm("A jeni i sigurt?")) return;

    await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    refreshAppointments();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    let response = "";

    if (message.toLowerCase().includes("termin")) {
      response =
        availableTimes.length > 0
          ? `Termini me i afert: ${availableTimes[0]}`
          : "Nuk ka termine te lira.";
    } else if (message.toLowerCase().includes("mjek")) {
      response =
        doctorsList.length > 0
          ? `Rekomandoj: ${doctorsList[0].name}`
          : "Nuk ka mjeke.";
    } else {
      response = "Shkruaj: termin / mjek / ndihme";
    }

    setChat((currentChat) => [...currentChat, { user: message, bot: response }]);
    setMessage("");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="dashboard-wrapper">
      <div className="sidebar">
        <div className="profile">
          <div className="avatar">
            {user.user_metadata?.name?.charAt(0) || user.email.charAt(0)}
          </div>
          <h3>{user.user_metadata?.name || user.email}</h3>
        </div>

        <div className="menu">
          <ul>
            <li>Terminet</li>
            <li>Doktoret</li>
            <li>Profil</li>
          </ul>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      <div className="dashboard-main">
        {offline && (
          <p style={{ color: "red", fontWeight: "bold" }}>Nuk ka internet!</p>
        )}

        <h2>Rezervo Termin</h2>

        <form onSubmit={addAppointment} className="form-card">
          <label>Data</label>
          <input type="date" value={date} onChange={handleDateChange} />

          <label>Mjeku</label>
          <select value={doctor} onChange={handleDoctorChange}>
            <option value="">Zgjidh mjekun</option>
            {doctorsList.map((doctorOption) => (
              <option key={doctorOption.id} value={doctorOption.name}>
                {doctorOption.name}
              </option>
            ))}
          </select>

          <label>Ora</label>
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="">Zgjidh oren</option>
            {availableTimes.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Duke ruajtur..." : "Rezervo"}
          </button>

          {error && (
            <>
              <p className="error">{error}</p>
              <button type="button" onClick={refreshAppointments}>
                Riprovo
              </button>
            </>
          )}

          {success && <p className="success">{success}</p>}
        </form>

        {loading && <p>Duke u ngarkuar...</p>}

        <h3>Terminet e tua</h3>

        <div className="appointments-list">
          {appointments.length === 0 ? (
            <p>Nuk keni termine.</p>
          ) : (
            appointments.map((appointment) => (
              <div key={appointment.id} className="appointment-card">
                <span>
                  {appointment.date} ne {appointment.time} - {appointment.doctor}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => deleteAppointment(appointment.id)}
                >
                  Fshi
                </button>
              </div>
            ))
          )}
        </div>

        <div className="chat-container">
          <h3>AI Asistent</h3>

          <div className="chat-box">
            {chat.map((entry, index) => (
              <div key={index}>
                <p>
                  <strong>Ti:</strong> {entry.user}
                </p>
                <p>
                  <strong>AI:</strong> {entry.bot}
                </p>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pyet dicka..."
            />
            <button onClick={handleSendMessage}>Dergo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
