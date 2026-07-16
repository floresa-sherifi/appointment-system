import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/useAuth";
import { getDisplayName, getDoctorName, isAdminUser, isDoctorUser } from "../utils/roles";

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"];

const STATUS_LABELS = {
  pending: "Ne pritje",
  confirmed: "Konfirmuar",
  cancelled: "Anuluar",
  completed: "Perfunduar",
};

function getAppointmentStatus(appointment) {
  return appointment?.status || "pending";
}

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctorFilter, setDoctorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccessDoctorPanel = isDoctorUser(user) || isAdminUser(user);
  const canViewAllAppointments = isAdminUser(user);
  const doctorName = getDisplayName(user, "Mjek");
  const assignedDoctorName = getDoctorName(user);

  const visibleAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesDoctor =
        !canViewAllAppointments ||
        !doctorFilter.trim() ||
        appointment.doctor?.toLowerCase().includes(doctorFilter.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "all" || getAppointmentStatus(appointment) === statusFilter;

      return matchesDoctor && matchesStatus;
    });
  }, [appointments, canViewAllAppointments, doctorFilter, statusFilter]);

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

  const loadDoctorAppointments = async () => {
    if (!canAccessDoctorPanel) return;

    setLoading(true);
    setError("");

    if (!canViewAllAppointments && !assignedDoctorName) {
      setError(
        "Ky user eshte mjek, por nuk ka emer mjeku ne metadata. Vendos `name` ose `doctor_name`, p.sh. Dr. Elira Hoxha."
      );
      setAppointments([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("appointments")
      .select("*")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!canViewAllAppointments) {
      query = query.eq("doctor", assignedDoctorName);
    }

    const { data, error: appointmentsError } = await query;

    if (appointmentsError) {
      setError(
        "Terminet nuk u ngarkuan. Per panelin e mjekut duhet RLS policy qe lejon mjekun te shohe terminet e veta."
      );
      setAppointments([]);
    } else {
      setAppointments(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadDoctorAppointments();
  }, [canAccessDoctorPanel, canViewAllAppointments, assignedDoctorName]);

  const updateAppointmentStatus = async (appointmentId, nextStatus) => {
    setError("");
    setSuccess("");

    const { error: statusError } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", appointmentId);

    if (statusError) {
      setError("Statusi nuk u perditesua. Kontrollo RLS policies per rolin e mjekut.");
      return;
    }

    setAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status: nextStatus } : appointment
      )
    );
    setSuccess("Statusi i terminit u perditesua.");
  };

  if (authLoading) return <p className="page-loading">Loading...</p>;

  if (!canAccessDoctorPanel) {
    return (
      <main className="admin-shell admin-access">
        <section className="panel">
          <p className="section-eyebrow">Paneli i mjekut</p>
          <h1>Akses i kufizuar</h1>
          <p className="section-copy">
            Ky panel eshte vetem per mjeke ose admin. Per testim, shto email-in e mjekut te
            `VITE_DOCTOR_EMAILS` ose vendos `role: doctor` ne metadata.
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
      <section className="admin-hero doctor-hero">
        <div>
          <p className="section-eyebrow">Doctor workspace</p>
          <h1>Paneli i mjekut</h1>
          <p className="section-copy">
            {canViewAllAppointments
              ? `Miresevjen, ${doctorName}. Si admin mund te shohesh terminet e te gjithe mjekeve.`
              : `Miresevjen, ${doctorName}. Ketu shfaqen vetem terminet e tua.`}
          </p>
        </div>
        <div className="admin-actions">
          <Link className="text-link-button" to="/dashboard">
            Pacient view
          </Link>
          {isAdminUser(user) && (
            <Link className="text-link-button" to="/admin">
              Admin Dashboard
            </Link>
          )}
          <button type="button" className="ghost-button" onClick={loadDoctorAppointments}>
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
      </section>

      <section className="panel admin-table-panel">
        <div className="panel-heading admin-table-heading">
          <div>
            <p className="section-eyebrow">Appointments</p>
            <h3>Terminet per kontroll</h3>
          </div>
          <div className="admin-filters">
            {canViewAllAppointments ? (
              <input
                value={doctorFilter}
                onChange={(event) => setDoctorFilter(event.target.value)}
                placeholder="Filtro sipas emrit te mjekut"
              />
            ) : (
              <input value={assignedDoctorName} disabled aria-label="Mjeku aktual" />
            )}
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
        ) : visibleAppointments.length === 0 ? (
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
                {visibleAppointments.map((appointment) => (
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
