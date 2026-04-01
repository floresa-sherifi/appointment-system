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

  // Marrja e user-it te loguar
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  // Marrja e terminëve dhe mjekëve
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

  // Kontrollo orët e lira sipas mjekut dhe datës
  const checkAvailableTimes = async (selectedDoctor, selectedDate) => {
    const allTimes = [
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

    if (!selectedDoctor || !selectedDate) {
      setAvailableTimes([]);
      return;
    }

    const { data } = await supabase
      .from("appointments")
      .select("time")
      .eq("doctor", selectedDoctor)
      .eq("date", selectedDate);

    const bookedTimes = data.map((a) => a.time);
    const freeTimes = allTimes.filter((t) => !bookedTimes.includes(t));
    setAvailableTimes(freeTimes);
  };

  const addAppointment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!date || !time || !doctor) {
      setError("Ju lutem plotësoni të gjitha fushat.");
      return;
    }

    if (!availableTimes.includes(time)) {
      setError(
        `Ora ${time} nuk është e lirë për ${doctor}. Zgjidhni një tjetër.`
      );
      return;
    }

    const { error } = await supabase.from("appointments").insert([
      {
        user_id: user.id,
        date,
        time,
        doctor,
      },
    ]);

    if (error) setError(error.message);
    else {
      setSuccess("Termini u shtua me sukses!");
      setDate("");
      setTime("");
      setDoctor("");
      setAvailableTimes([]);
      fetchAppointments();
    }
  };

  if (!user) return <p>Duke u ngarkuar...</p>;

  return (
    <div className="dashboard-container">
      <h2>Mirësevini, {user.email}</h2>

      <div className="form-card">
        <h3>Shto Termin</h3>
        <form onSubmit={addAppointment}>
          <label>Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              checkAvailableTimes(doctor, e.target.value);
            }}
            required
          />

          <label>Mjeku</label>
          <select
            value={doctor}
            onChange={(e) => {
              setDoctor(e.target.value);
              checkAvailableTimes(e.target.value, date);
            }}
            required
          >
            <option value="">Zgjidh Mjekun</option>
            {doctorsList.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <label>Ora</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          >
            <option value="">Zgjidh Orën</option>
            {availableTimes.length > 0
              ? availableTimes.map((t) => <option key={t}>{t}</option>)
              : date && doctor
              ? [
                  <option key="none" disabled>
                    Nuk ka orë të lira. Zgjidhni një tjetër
                  </option>,
                ]
              : null}
          </select>

          <button type="submit">Rezervo Termin</button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </form>
      </div>

      <h3>Terminet e tua</h3>
      {appointments.length === 0 && <p>Nuk keni termine të regjistruara.</p>}
      <div className="appointments-list">
        {appointments.map((a) => (
          <div key={a.id} className="appointment-card">
            <strong>{a.doctor}</strong> <br />
            {a.date} në {a.time}
          </div>
        ))}
      </div>
    </div>
  );
}