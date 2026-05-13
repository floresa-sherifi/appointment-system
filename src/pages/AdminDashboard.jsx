import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/useAuth";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"];

const STATUS_LABELS = {
  pending: "Ne pritje",
  confirmed: "Konfirmuar",
  cancelled: "Anuluar",
  completed: "Perfunduar",
};

function isAdminUser(user) {
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return user?.user_metadata?.role === "admin" || adminEmails.includes(user?.email?.toLowerCase());
}

function getAppointmentStatus(appointment) {
  return appointment?.status || "pending";
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const loadAdminData = async () => {
    if (!canAccessAdmin) return;

    setLoading(true);
    setError("");

    const [{ data: appointmentsData, error: appointmentsError }, { data: doctorsData }] =
      await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .order("date", { ascending: true })
          .order("time", { ascending: true }),
        supabase.from("doctors").select("*"),
      ]);

    if (appointmentsError) {
      setError("Nuk u ngarkuan terminet. Kontrollo RLS policy per rolin admin.");
    } else {
      setAppointments(appointmentsData || []);
      setDoctors(doctorsData || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!canAccessAdmin) return;

    let cancelled = false;

    async function loadInitialAdminData() {
      setLoading(true);
      setError("");

      const [{ data: appointmentsData, error: appointmentsError }, { data: doctorsData }] =
        await Promise.all([
          supabase
            .from("appointments")
            .select("*")
            .order("date", { ascending: true })
            .order("time", { ascending: true }),
          supabase.from("doctors").select("*"),
        ]);

      if (cancelled) return;

      if (appointmentsError) {
        setError("Nuk u ngarkuan terminet. Kontrollo RLS policy per rolin admin.");
      } else {
        setAppointments(appointmentsData || []);
        setDoctors(doctorsData || []);
      }

      setLoading(false);
    }

    loadInitialAdminData();

    return () => {
      cancelled = true;
    };
  }, [canAccessAdmin]);

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
            Menaxho terminet, statuset dhe kapacitetin e mjekeve nga nje vend.
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
