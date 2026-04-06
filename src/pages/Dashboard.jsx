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

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAppointments();
      fetchDoctors();
    }
  }, [user]);


const handleSendMessage = () => {
  if (!message) return;

  let response = "";

  if (message.toLowerCase().includes("termin")) {
    if (availableTimes.length > 0) {
      response = `Termini më i afërt është në ${availableTimes[0]}`;
    } else {
      response = "Nuk ka termine të lira për këtë ditë.";
    }
  } 
  else if (message.toLowerCase().includes("mjek")) {
    if (doctorsList.length > 0) {
      response = `Të rekomandoj: ${doctorsList[0].name}`;
    } else {
      response = "Nuk ka mjekë të disponueshëm.";
    }
  } 
  else if (message.toLowerCase().includes("ndihme")) {
    response = "Mund të pyesësh: 'termin', 'mjek', ose 'orë të lirë'";
  } 
  else {
    response = "Nuk të kuptova. Shkruaj 'ndihme'";
  }

  setChat([...chat, { user: message, bot: response }]);
  setMessage("");
};

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("time", { ascending: true });
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
    if (!date || !time || !doctor) return setError("Plotëso të gjitha fushat!");
    if (!availableTimes.includes(time)) return setError("Kjo orë nuk është e lirë!");

    const { error } = await supabase.from("appointments").insert([
      { user_id: user.id, date, time, doctor }
    ]);
    if (error) setError(error.message);
    else {
      setSuccess("Termini u rezervua ✅");
      setDate(""); setTime(""); setDoctor(""); setAvailableTimes([]);
      fetchAppointments();
    }
  };

  const deleteAppointment = async (id) => {
    if (!window.confirm("A jeni i sigurt?")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id).eq("user_id", user.id);
    if (error) setError(error.message);
    else fetchAppointments();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!user) return <p>Duke u ngarkuar...</p>;

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
          <li>Terminet e tua</li>
          <li>Doktorët</li>
          <li>Profil</li>
        </ul>
      </div>

      <button onClick={logout}>Logout</button>
    </div>

    {/* MAIN */}
    <div className="dashboard-main">

      <h2>Rezervo Termin</h2>

      <form onSubmit={addAppointment} className="form-card">
        <label>Data</label>
        <input
          type="date"
          value={date}
          onChange={(e)=>{
            setDate(e.target.value);
            checkAvailableTimes(doctor, e.target.value);
          }}
        />

        <label>Mjeku</label>
        <select
          value={doctor}
          onChange={(e)=>{
            setDoctor(e.target.value);
            checkAvailableTimes(e.target.value, date);
          }}
        >
          <option value="">Zgjidh Mjekun</option>
          {doctorsList.map(d=>(
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>

        <label>Ora</label>
        <select value={time} onChange={(e)=>setTime(e.target.value)}>
          <option value="">Zgjidh Orën</option>
          {availableTimes.length>0 
            ? availableTimes.map(t=><option key={t}>{t}</option>)
            : date && doctor && <option disabled>Nuk ka orë të lira</option>
          }
        </select>

        <button type="submit">Rezervo</button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>

      <h3>Terminet e tua</h3>
      <div className="appointments-list">
        {appointments.length===0 ? <p>Nuk keni termine.</p> :
          appointments.map(a => (
            <div key={a.id} className="appointment-card">
              <span>{a.date} në {a.time} - {a.doctor}</span>
              <button className="delete-btn" onClick={()=>deleteAppointment(a.id)}>
                Fshi
              </button>
            </div>
          ))
        }
      </div>

      {/* 🤖 AI CHAT */}
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
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Pyet diçka..."
          />
          <button onClick={handleSendMessage}>Dërgo</button>
        </div>
      </div>

    </div>
  </div>
);
}