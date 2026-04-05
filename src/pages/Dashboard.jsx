import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [appointments, setAppointments] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [doctor, setDoctor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [doctorsList, setDoctorsList] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [user]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });
    setAppointments(data || []);
  };

  const fetchDoctors = async () => {
    const { data } = await supabase.from("doctors").select("*");
    setDoctorsList(data || []);
  };

  const checkAvailableTimes = async (doc, dt) => {
    const allTimes = [
      "09:00","09:30","10:00","10:30",
      "11:00","11:30","12:00","12:30",
      "13:00","13:30","14:00","14:30",
      "15:00","15:30","16:00","16:30","17:00"
    ];
    if (!doc || !dt) return setAvailableTimes([]);
    const { data } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor", doc)
      .eq("date", dt);
    const booked = data.map(a => a.time);
    setAvailableTimes(allTimes.filter(t => !booked.includes(t)));
  };

  const addAppointment = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!date || !time || !doctor) { setError("Plotësoni të gjitha fushat!"); return; }
    if (!availableTimes.includes(time)) { setError("Kjo orë nuk është e lirë!"); return; }
    const { error } = await supabase.from("appointments").insert([{ user_id: user.id, date, time, doctor }]);
    if (error) setError(error.message);
    else {
      setSuccess("Termini u rezervua me sukses ✅");
      setDate(""); setTime(""); setDoctor(""); setAvailableTimes([]);
      fetchAppointments();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div className="dashboard-wrapper">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="profile">
          <h3>{user.user_metadata?.name || "Përdorues"}</h3>
          <p>Email: {user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
        <div className="menu">
          <p><strong>Menu</strong></p>
          <ul>
            <li>Terminet e rezervuara</li>
            <li>Mjekët</li>
            <li>Profil</li>
          </ul>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="dashboard-main">
        <h2>👋 Mirësevini, {user.user_metadata?.name || "Përdorues"}</h2>

        <div className="form-card">
          <h3>Rezervo Termin</h3>
          <form onSubmit={addAppointment}>
            <label>Data</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); checkAvailableTimes(doctor, e.target.value); }} />
            <label>Mjeku</label>
            <select value={doctor} onChange={e => { setDoctor(e.target.value); checkAvailableTimes(e.target.value, date); }}>
              <option value="">Zgjidh Mjekun</option>
              {doctorsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <label>Ora</label>
            <select value={time} onChange={e => setTime(e.target.value)}>
              <option value="">Zgjidh Orën</option>
              {availableTimes.length > 0 ? availableTimes.map(t => <option key={t}>{t}</option>)
                : date && doctor && <option disabled>Nuk ka orë të lira ❌</option>}
            </select>
            <button type="submit">Rezervo Termin</button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        </div>

        <h3>Terminet e tua</h3>
        {appointments.length === 0 && <p>Nuk keni termine.</p>}
        <div className="appointments-list">
          {appointments.map(a => (
            <div key={a.id} className="appointment-card">
              <strong>{a.doctor}</strong><br />
              {a.date} në {a.time}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}