import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/useAuth";
import { isAdminUser } from "../utils/roles";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"];

const STATUS_LABELS = {
  pending: "Ne pritje",
  confirmed: "Konfirmuar",
  cancelled: "Anuluar",
  completed: "Perfunduar",
};

const WEEK_DAYS = [
  { value: "mon", label: "Hene" },
  { value: "tue", label: "Marte" },
  { value: "wed", label: "Merkure" },
  { value: "thu", label: "Enjte" },
  { value: "fri", label: "Premte" },
  { value: "sat", label: "Shtune" },
  { value: "sun", label: "Diel" },
];

function getAppointmentStatus(appointment) {
  return appointment?.status || "pending";
}

function formatWorkDays(workDays = []) {
  if (!workDays.length) return "Pa dite te zgjedhura";

  return WEEK_DAYS.filter((day) => workDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}

async function fetchAppointmentsWithFallback(userId) {
  const allAppointmentsResult = await supabase
    .from("appointments")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (!allAppointmentsResult.error) {
    return {
      data: allAppointmentsResult.data || [],
      limited: false,
      error: null,
    };
  }

  const ownAppointmentsResult = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  return {
    data: ownAppointmentsResult.data || [],
    limited: true,
    error: ownAppointmentsResult.error || allAppointmentsResult.error,
  };
}

async function fetchDoctorSchedules() {
  const { data, error } = await supabase
    .from("doctor_schedules")
    .select("*")
    .order("doctor_name", { ascending: true });

  return { data: data || [], error };
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [doctorName, setDoctorName] = useState("");
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [scheduleDoctorName, setScheduleDoctorName] = useState("");
  const [scheduleWorkDays, setScheduleWorkDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("17:00");
  const [scheduleSlotMinutes, setScheduleSlotMinutes] = useState(30);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [limitedMode, setLimitedMode] = useState(false);
  const [scheduleWarning, setScheduleWarning] = useState("");

  const canAccessAdmin = isAdminUser(user);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const status = getAppointmentStatus(appointment);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch =
        !query ||
        [appointment.doctor, appointment.date, appointment.time, appointment.user_id]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [appointments, search, statusFilter]);

  const stats = useMemo(
    () =>
      STATUS_OPTIONS.reduce(
        (totals, status) => ({
          ...totals,
          [status]: appointments.filter((appointment) => getAppointmentStatus(appointment) === status).length,
        }),
        { total: appointments.length }
      ),
    [appointments]
  );

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((firstDoctor, secondDoctor) =>
        (firstDoctor.name || "").localeCompare(secondDoctor.name || "")
      ),
    [doctors]
  );

  const sortedSchedules = useMemo(
    () =>
      [...doctorSchedules].sort((firstSchedule, secondSchedule) =>
        (firstSchedule.doctor_name || "").localeCompare(secondSchedule.doctor_name || "")
      ),
    [doctorSchedules]
  );

  const resetDoctorForm = () => {
    setDoctorName("");
    setEditingDoctorId(null);
  };

  const resetScheduleForm = () => {
    setScheduleDoctorName("");
    setScheduleWorkDays(["mon", "tue", "wed", "thu", "fri"]);
    setScheduleStartTime("09:00");
    setScheduleEndTime("17:00");
    setScheduleSlotMinutes(30);
  };

  const toggleScheduleDay = (dayValue) => {
    setScheduleWorkDays((currentDays) =>
      currentDays.includes(dayValue)
        ? currentDays.filter((currentDay) => currentDay !== dayValue)
        : [...currentDays, dayValue]
    );
  };

  const handleScheduleDoctorChange = (nextDoctorName) => {
    const existingSchedule = doctorSchedules.find(
      (schedule) => schedule.doctor_name === nextDoctorName
    );

    setScheduleDoctorName(nextDoctorName);

    if (existingSchedule) {
      setScheduleWorkDays(existingSchedule.work_days || []);
      setScheduleStartTime(existingSchedule.start_time || "09:00");
      setScheduleEndTime(existingSchedule.end_time || "17:00");
      setScheduleSlotMinutes(existingSchedule.slot_minutes || 30);
      return;
    }

    setScheduleWorkDays(["mon", "tue", "wed", "thu", "fri"]);
    setScheduleStartTime("09:00");
    setScheduleEndTime("17:00");
    setScheduleSlotMinutes(30);
  };

  const loadAdminData = async () => {
    if (!canAccessAdmin) return;

    setLoading(true);
    setError("");

    const [
      { data: appointmentsData, limited, error: appointmentsError },
      { data: doctorsData },
      { data: schedulesData, error: schedulesError },
    ] =
      await Promise.all([
        fetchAppointmentsWithFallback(user.id),
        supabase.from("doctors").select("*"),
        fetchDoctorSchedules(),
      ]);

    setAppointments(appointmentsData || []);
    setDoctors(doctorsData || []);
    setDoctorSchedules(schedulesData || []);
    setLimitedMode(limited);
    setScheduleWarning(
      schedulesError
        ? "Tabela doctor_schedules nuk eshte gati ose nuk ka leje. Orari dinamik nuk ruhet ende."
        : ""
    );

    if (appointmentsError) {
      setError("Supabase po lejon vetem terminet e tua per momentin. Per te pare te gjitha terminet, duhen RLS policies per admin.");
    } else if (limited) {
      setError("Pamje e kufizuar: po shfaqen vetem terminet e tua derisa RLS admin te aktivizohet.");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!canAccessAdmin) return;

    let cancelled = false;

    async function loadInitialAdminData() {
      setLoading(true);
      setError("");

      const [
        { data: appointmentsData, limited, error: appointmentsError },
        { data: doctorsData },
        { data: schedulesData, error: schedulesError },
      ] =
        await Promise.all([
          fetchAppointmentsWithFallback(user.id),
          supabase.from("doctors").select("*"),
        fetchDoctorSchedules(),
      ]);

      if (cancelled) return;

      setAppointments(appointmentsData || []);
      setDoctors(doctorsData || []);
      setDoctorSchedules(schedulesData || []);
      setLimitedMode(limited);
      setScheduleWarning(
        schedulesError
          ? "Tabela doctor_schedules nuk eshte gati ose nuk ka leje. Orari dinamik nuk ruhet ende."
          : ""
      );

      if (appointmentsError) {
        setError("Supabase po lejon vetem terminet e tua per momentin. Per te pare te gjitha terminet, duhen RLS policies per admin.");
      } else if (limited) {
        setError("Pamje e kufizuar: po shfaqen vetem terminet e tua derisa RLS admin te aktivizohet.");
      }

      setLoading(false);
    }

    loadInitialAdminData();

    return () => {
      cancelled = true;
    };
  }, [canAccessAdmin, user?.id]);

  const updateAppointmentStatus = async (appointmentId, nextStatus) => {
    setError("");
    setSuccess("");

    const { error: statusError } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", appointmentId);

    if (statusError) {
      setError("Statusi nuk u perditesua. Sigurohu qe kolona status dhe RLS admin jane aktive.");
      return;
    }

    setAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: nextStatus } : appointment
      )
    );
    setSuccess("Statusi u perditesua me sukses.");
  };

  const handleDoctorSubmit = async (event) => {
    event.preventDefault();

    const normalizedName = doctorName.trim();

    if (!normalizedName) {
      setError("Shkruaj emrin e mjekut.");
      return;
    }

    const duplicateDoctor = doctors.find(
      (doctor) =>
        doctor.name?.trim().toLowerCase() === normalizedName.toLowerCase() &&
        doctor.id !== editingDoctorId
    );

    if (duplicateDoctor) {
      setError("Ky mjek ekziston tashme ne liste.");
      return;
    }

    setDoctorLoading(true);
    setError("");
    setSuccess("");

    const saveDoctor = editingDoctorId
      ? supabase.from("doctors").update({ name: normalizedName }).eq("id", editingDoctorId).select("*").single()
      : supabase.from("doctors").insert([{ name: normalizedName }]).select("*").single();

    const { data, error: doctorError } = await saveDoctor;

    if (doctorError) {
      setError("Mjeku nuk u ruajt. Kontrollo RLS policies per tabelen doctors.");
      setDoctorLoading(false);
      return;
    }

    if (editingDoctorId) {
      setDoctors((currentDoctors) =>
        currentDoctors.map((doctor) => (doctor.id === editingDoctorId ? data : doctor))
      );
      setSuccess("Mjeku u perditesua me sukses.");
    } else {
      setDoctors((currentDoctors) => [...currentDoctors, data]);
      setSuccess("Mjeku u shtua me sukses.");
    }

    resetDoctorForm();
    setDoctorLoading(false);
  };

  const startEditingDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setDoctorName(doctor.name || "");
  };

  const deleteDoctor = async (doctorId) => {
    setDoctorLoading(true);
    setError("");
    setSuccess("");

    const { error: doctorError } = await supabase.from("doctors").delete().eq("id", doctorId);

    if (doctorError) {
      setError("Mjeku nuk u fshi. Kontrollo RLS policies per tabelen doctors.");
      setDoctorLoading(false);
      return;
    }

    setDoctors((currentDoctors) => currentDoctors.filter((doctor) => doctor.id !== doctorId));
    if (editingDoctorId === doctorId) resetDoctorForm();
    setSuccess("Mjeku u fshi me sukses.");
    setDoctorLoading(false);
  };

  const startEditingSchedule = (schedule) => {
    setScheduleDoctorName(schedule.doctor_name || "");
    setScheduleWorkDays(schedule.work_days || []);
    setScheduleStartTime(schedule.start_time || "09:00");
    setScheduleEndTime(schedule.end_time || "17:00");
    setScheduleSlotMinutes(schedule.slot_minutes || 30);
  };

  const handleScheduleSubmit = async (event) => {
    event.preventDefault();

    if (!scheduleDoctorName) {
      setError("Zgjidh mjekun per orar.");
      return;
    }

    if (!scheduleWorkDays.length) {
      setError("Zgjidh se paku nje dite pune.");
      return;
    }

    if (scheduleStartTime >= scheduleEndTime) {
      setError("Ora e fillimit duhet te jete para ores se perfundimit.");
      return;
    }

    setScheduleLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      doctor_name: scheduleDoctorName,
      work_days: scheduleWorkDays,
      start_time: scheduleStartTime,
      end_time: scheduleEndTime,
      slot_minutes: Number(scheduleSlotMinutes),
    };

    const { data, error: scheduleError } = await supabase
      .from("doctor_schedules")
      .upsert(payload, { onConflict: "doctor_name" })
      .select("*")
      .single();

    if (scheduleError) {
      setError("Orari nuk u ruajt. Sigurohu qe tabela doctor_schedules ekziston dhe ka RLS policies.");
      setScheduleLoading(false);
      return;
    }

    const { data: refreshedSchedules, error: refreshError } = await fetchDoctorSchedules();

    if (refreshError) {
      setDoctorSchedules((currentSchedules) => {
        const existingSchedule = currentSchedules.some(
          (schedule) => schedule.doctor_name === data.doctor_name
        );

        if (existingSchedule) {
          return currentSchedules.map((schedule) =>
            schedule.doctor_name === data.doctor_name ? data : schedule
          );
        }

        return [...currentSchedules, data];
      });
    } else {
      setDoctorSchedules(refreshedSchedules);
    }

    setSuccess("Orari i mjekut u ruajt ne Supabase me sukses.");
    resetScheduleForm();
    setScheduleLoading(false);
  };

  if (authLoading) return <p className="page-loading">Loading...</p>;

  if (!canAccessAdmin) {
    return (
      <main className="admin-shell admin-access">
        <section className="panel">
          <p className="section-eyebrow">Admin</p>
          <h1>Akses i kufizuar</h1>
          <p className="section-copy">
            Ky panel eshte vetem per admin. Vendos `role: admin` ne metadata te perdoruesit ose shto email-in te
            `VITE_ADMIN_EMAILS`.
          </p>
          <Link className="text-link-button" to="/dashboard">
            Kthehu te dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <section className="admin-hero">
        <div>
          <p className="section-eyebrow">Clinic operations</p>
          <h1>Admin Dashboard</h1>
          <p className="section-copy">
            {limitedMode
              ? "Pamje e kufizuar nga RLS: po shfaqen vetem te dhenat qe Supabase lejon per kete user."
              : "Menaxho terminet, statuset dhe kapacitetin e mjekeve nga nje vend."}
          </p>
        </div>
        <div className="admin-actions">
          <Link className="text-link-button" to="/dashboard">
            Pacient view
          </Link>
          <button type="button" className="ghost-button" onClick={loadAdminData}>
            Rifresko
          </button>
        </div>
      </section>

      {error && <div className="feedback-banner error-banner">{error}</div>}
      {success && <div className="feedback-banner success-banner">{success}</div>}

      <section className="admin-stats">
        <div className="mini-stat">
          <span>Gjithsej</span>
          <strong>{stats.total}</strong>
        </div>
        {STATUS_OPTIONS.map((status) => (
          <div key={status} className="mini-stat">
            <span>{STATUS_LABELS[status]}</span>
            <strong>{stats[status]}</strong>
          </div>
        ))}
        <div className="mini-stat">
          <span>Mjeke</span>
          <strong>{doctors.length}</strong>
        </div>
      </section>

      <section className="panel admin-table-panel">
        <div className="panel-heading admin-table-heading">
          <div>
            <p className="section-eyebrow">Doctors</p>
            <h3>Menaxhimi i mjekeve</h3>
          </div>
          {editingDoctorId && (
            <button type="button" className="ghost-button" onClick={resetDoctorForm}>
              Anulo editimin
            </button>
          )}
        </div>

        <form className="admin-doctor-form" onSubmit={handleDoctorSubmit}>
          <input
            value={doctorName}
            onChange={(event) => setDoctorName(event.target.value)}
            placeholder="Emri i mjekut, p.sh. Dr. Elira Hoxha"
          />
          <button type="submit" disabled={doctorLoading}>
            {doctorLoading
              ? "Duke ruajtur..."
              : editingDoctorId
                ? "Ruaj ndryshimet"
                : "Shto mjek"}
          </button>
        </form>

        {sortedDoctors.length === 0 ? (
          <p className="empty-state">Nuk ka mjeke ne liste.</p>
        ) : (
          <div className="admin-doctor-list">
            {sortedDoctors.map((doctor) => (
              <article key={doctor.id || doctor.name} className="admin-doctor-item">
                <div>
                  <strong>{doctor.name}</strong>
                  <span>ID: {doctor.id || "pa id"}</span>
                </div>
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => startEditingDoctor(doctor)}>
                    Edit
                  </button>
                  <button type="button" className="delete-btn" onClick={() => deleteDoctor(doctor.id)}>
                    Fshi
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel admin-table-panel">
        <div className="panel-heading admin-table-heading">
          <div>
            <p className="section-eyebrow">Schedules</p>
            <h3>Orari i mjekeve</h3>
          </div>
          <button type="button" className="ghost-button" onClick={resetScheduleForm}>
            Pastro formen
          </button>
        </div>

        {scheduleWarning && <div className="feedback-banner error-banner">{scheduleWarning}</div>}

        <form className="admin-schedule-form" onSubmit={handleScheduleSubmit}>
          <label>
            <span>Mjeku</span>
            <select
              value={scheduleDoctorName}
              onChange={(event) => handleScheduleDoctorChange(event.target.value)}
            >
              <option value="">Zgjidh mjekun</option>
              {sortedDoctors.map((doctor) => (
                <option key={doctor.id || doctor.name} value={doctor.name}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>

          <div className="schedule-days">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                className={
                  scheduleWorkDays.includes(day.value)
                    ? "specialty-pill specialty-pill--active"
                    : "specialty-pill"
                }
                onClick={() => toggleScheduleDay(day.value)}
              >
                {day.label}
              </button>
            ))}
          </div>

          <label>
            <span>Fillimi</span>
            <input
              type="time"
              value={scheduleStartTime}
              onChange={(event) => setScheduleStartTime(event.target.value)}
            />
          </label>

          <label>
            <span>Perfundimi</span>
            <input
              type="time"
              value={scheduleEndTime}
              onChange={(event) => setScheduleEndTime(event.target.value)}
            />
          </label>

          <label>
            <span>Minuta per termin</span>
            <select
              value={scheduleSlotMinutes}
              onChange={(event) => setScheduleSlotMinutes(event.target.value)}
            >
              <option value={15}>15 min</option>
              <option value={20}>20 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>

          <button type="submit" disabled={scheduleLoading}>
            {scheduleLoading ? "Duke ruajtur..." : "Ruaj orarin"}
          </button>
        </form>

        {sortedSchedules.length === 0 ? (
          <p className="empty-state">Nuk ka orare te ruajtura ende.</p>
        ) : (
          <div className="admin-doctor-list">
            {sortedSchedules.map((schedule) => (
              <article key={schedule.id || schedule.doctor_name} className="admin-doctor-item">
                <div>
                  <strong>{schedule.doctor_name}</strong>
                  <span>
                    {formatWorkDays(schedule.work_days)} / {schedule.start_time} - {schedule.end_time} /{" "}
                    {schedule.slot_minutes} min
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => startEditingSchedule(schedule)}
                >
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel admin-table-panel">
        <div className="panel-heading admin-table-heading">
          <div>
            <p className="section-eyebrow">Appointments</p>
            <h3>Terminet e klinikes</h3>
          </div>
          <div className="admin-filters">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kerko mjek, date ose user id"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Te gjitha statuset</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Duke u ngarkuar...</p>
        ) : filteredAppointments.length === 0 ? (
          <p className="empty-state">Nuk ka termine per kete filter.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ora</th>
                  <th>Mjeku</th>
                  <th>Pacienti</th>
                  <th>Statusi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{appointment.date}</td>
                    <td>{appointment.time}</td>
                    <td>{appointment.doctor}</td>
                    <td>{appointment.user_id}</td>
                    <td>
                      <select
                        className={`status-select status-${getAppointmentStatus(appointment)}`}
                        value={getAppointmentStatus(appointment)}
                        onChange={(event) => updateAppointmentStatus(appointment.id, event.target.value)}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
