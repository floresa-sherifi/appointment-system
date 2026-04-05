import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

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
  const [editId, setEditId] = useState(null);

  const navigate = useNavigate();

  // Merr user-in loguar
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  // Merr Termine dhe Mjeke
  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [user]);

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });
    if (error) console.log(error);
    else setAppointments(data);
  };

  const fetchDoctors = async () => {
    const { data, error } = await supabase.from("doctors").select("*");
    if (error) console.log(error);
    else setDoctorsList(data);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const checkAvailableTimes = async (selectedDoctor, selectedDate) => {
    const allTimes = [
      "09:00","09:30","10:00","10:30","11:00","11:30",
      "12:00","12:30","13:00","13:30","14:00","14:30",
      "15:00","15:30","16:00","16:30","17:00"
    ];

    if (!selectedDoctor || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    const { data } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor", selectedDoctor)
      .eq("date", selectedDate);

    const bookedTimes = data.map(a => a.time);
    setAvailableTimes(allTimes.filter(t => !bookedTimes.includes(t)));
  };

  const addOrEditAppointment = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!date || !time || !doctor) {
      setError("Plotëso të gjitha fushat!");
      return;
    }

    if (!availableTimes.includes(time)) {
      setError(`Ora ${time} nuk është e lirë për ${doctor}.`);
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("appointments")
        .update({ date, time, doctor })
        .eq("id", editId)
        .eq("user_id", user.id);

      if (error) setError(error.message);
      else {
        setSuccess("Termini u ndryshua me sukses!");
        setEditId(null);
      }
    } else {
      const { error } = await supabase
        .from("appointments")
        .insert([{ user_id: user.id, date, time, doctor }]);

      if (error) setError(error.message);
      else setSuccess("Termini u shtua me sukses!");
    }

    setDate(""); setTime(""); setDoctor(""); setAvailableTimes([]);
    fetchAppointments();
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm("A je i sigurt që dëshiron të fshish këtë termin?")) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) setError(error.message);
    else {
      setSuccess("Termini u fshi me sukses!");
      fetchAppointments();
    }
  };

  const startEdit = (a) => {
    setEditId(a.id);
    setDate(a.date);
    setTime(a.time);
    setDoctor(a.doctor);
    checkAvailableTimes(a.doctor, a.date);
  };

  if (!user) return <p>Duke u ngarkuar...</p>;

  return (
    <div className="dashboard-wrapper">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="profile">
          <h3>{user.user_metadata?.name || user.email}</h3>
          <p>Përdorues</p>
          <button className="logout-btn" onClick={logout}>Logout</button>
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

      {/* Pjesa kryesore */}
      <div className="dashboard-main">
        <div className="form-card">
          <h3>{editId ? "Ndrysho Termin" : "Shto Termin"}</h3>
          <form onSubmit={addOrEditAppointment}>
            <label>Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); checkAvailableTimes(doctor, e.target.value); }}
              required
            />

            <label>Mjeku</label>
            <select
              value={doctor}
              onChange={(e) => { setDoctor(e.target.value); checkAvailableTimes(e.target.value, date); }}
              required
            >
              <option value="">Zgjidh Mjekun</option>
              {doctorsList.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            <label>Ora</label>
            <select value={time} onChange={(e) => setTime(e.target.value)} required>
              <option value="">Zgjidh Orën</option>
              {availableTimes.length > 0 
                ? availableTimes.map(t => <option key={t}>{t}</option>)
                : date && doctor
                  ? <option key="none" disabled>Nuk ka orë të lira</option>
                  : null}
            </select>

            <button type="submit">{editId ? "Ndrysho Termin" : "Rezervo Termin"}</button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}
          </form>
        </div>

        <h3>Terminet e tua</h3>
        <div className="appointments-list">
          {appointments.length === 0 && <p>Nuk keni termine të regjistruara.</p>}
          {appointments.map(a => (
            <div key={a.id} className="appointment-card">
              <strong>{a.doctor}</strong> <br />
              {a.date} në {a.time} <br />
              <button onClick={() => startEdit(a)}>Ndrysho</button>
              <button onClick={() => deleteAppointment(a.id)}>Fshi</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}