import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [doctor, setDoctor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  // 🔐 USER + SESSION CHECK
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login"; // FIX session expired
      } else {
        setUser(data.user);
      }
    };
    fetchUser();
  }, []);

  // 🌐 OFFLINE DETECTION
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

  // 📊 FETCH
  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [user]);

  // 🔄 AUTO UPDATE TIMES
  useEffect(() => {
    if (doctor && date) {
      checkAvailableTimes(doctor, date);
    }
  }, [doctor, date]);

  const fetchAppointments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) setError("Gabim gjatë marrjes së termineve!");
    else setAppointments(data || []);

    setLoading(false);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase.from("doctors").select("*");
    setDoctorsList(data || []);
  };

  // 🕐 TIMES
  const checkAvailableTimes = async (doc, dt) => {
    const allTimes = [
      "09:00","09:30","10:00","10:30",
      "11:00","11:30","12:00","12:30",
      "13:00","13:30","14:00","14:30",
      "15:00","15:30","16:00","16:30","17:00"
    ];

    if (!doc || !dt) {
      setAvailableTimes(allTimes);
      return;
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor", doc)
      .eq("date", dt);

    if (error) {
      setAvailableTimes(allTimes);
      return;
    }

    const booked = data?.map(a => a.time) || [];
    const free = allTimes.filter(t => !booked.includes(t));

    setAvailableTimes(free.length > 0 ? free : allTimes);
  };

  // ➕ ADD
  const addAppointment = async (e) => {
    e.preventDefault();

    if (loading) return; // anti double click

    setError("");
    setSuccess("");

    if (!date || !time || !doctor) {
      setError("Plotëso të gjitha fushat!");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("appointments").insert([
      { user_id: user.id, date, time, doctor }
    ]);

    if (error) setError("Gabim gjatë rezervimit!");
    else {
      setSuccess("Termini u rezervua ✅");
      setDate("");
      setTime("");
      setDoctor("");
      fetchAppointments();
    }

    setLoading(false);
  };

  // 🗑 DELETE
  const deleteAppointment = async (id) => {
    if (!window.confirm("A jeni i sigurt?")) return;

    await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    fetchAppointments();
  };

  // 🚪 LOGOUT
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // 🤖 AI
  const handleSendMessage = () => {
    if (!message.trim()) return;

    let response = "";

    if (message.toLowerCase().includes("termin")) {
      response = availableTimes.length > 0
        ? `Termini më i afërt: ${availableTimes[0]}`
        : "Nuk ka termine të lira.";
    } else if (message.toLowerCase().includes("mjek")) {
      response = doctorsList.length > 0
        ? `Rekomandoj: ${doctorsList[0].name}`
        : "Nuk ka mjekë.";
    } else {
      response = "Shkruaj: termin / mjek / ndihme";
    }

    setChat([...chat, { user: message, bot: response }]);
    setMessage("");
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="dashboard-wrapper">

      {/* SIDEBAR */}
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
            <li>Doktorët</li>
            <li>Profil</li>
          </ul>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      {/* MAIN */}
      <div className="dashboard-main">

        {offline && (
          <p style={{ color: "red", fontWeight: "bold" }}>
            ⚠ Nuk ka internet!
          </p>
        )}

        <h2>Rezervo Termin</h2>

        <form onSubmit={addAppointment} className="form-card">

          <label>Data</label>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />

          <label>Mjeku</label>
          <select value={doctor} onChange={(e)=>setDoctor(e.target.value)}>
            <option value="">Zgjidh Mjekun</option>
            {doctorsList.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <label>Ora</label>
          <select value={time} onChange={(e)=>setTime(e.target.value)}>
            <option value="">Zgjidh Orën</option>
            {availableTimes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <button type="submit" disabled={loading}>
            {loading ? "Duke ruajtur..." : "Rezervo"}
          </button>

          {error && (
            <>
              <p className="error">{error}</p>
              <button type="button" onClick={fetchAppointments}>
                Riprovo 🔄
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
            appointments.map(a => (
              <div key={a.id} className="appointment-card">
                <span>{a.date} në {a.time} - {a.doctor}</span>
                <button className="delete-btn" onClick={()=>deleteAppointment(a.id)}>
                  Fshi
                </button>
              </div>
            ))
          )}
        </div>

        {/* AI */}
        <div className="chat-container">
          <h3>🤖 AI Asistent</h3>

          <div className="chat-box">
            {chat.map((c, i) => (
              <div key={i}>
                <p><strong>Ti:</strong> {c.user}</p>
                <p><strong>AI:</strong> {c.bot}</p>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={message}
              onChange={(e)=>setMessage(e.target.value)}
              placeholder="Pyet diçka..."
            />
            <button onClick={handleSendMessage}>Dërgo</button>
          </div>
        </div>

      </div>
    </div>
  );
}