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

const ADMIN_VIEWS = [
  { id: "overview", label: "Dashboard" },
  { id: "organization", label: "Organizimi" },
  { id: "doctors", label: "Mjeket" },
  { id: "schedules", label: "Orare" },
  { id: "appointments", label: "Terminet" },
];

function getAppointmentStatus(appointment) {
  return appointment?.status || "pending";
}

function getPatientDisplayName(appointment) {
  return appointment?.patient_name || `Pacient ${appointment?.user_id?.slice(0, 8) || ""}`.trim();
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  const day = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - day + 1);

  return weekStart;
}

function getDoctorClinic(doctorName, doctors = []) {
  return doctors.find((doctor) => doctor.name === doctorName)?.clinic || "";
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

async function fetchDoctorBlockedSlots() {
  const { data, error } = await supabase
    .from("doctor_blocked_slots")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  return { data: data || [], error };
}

async function fetchNamedResource(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .order("name", { ascending: true });

  return { data: data || [], error };
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [doctorSchedules, setDoctorSchedules] = useState([]);
  const [doctorBlockedSlots, setDoctorBlockedSlots] = useState([]);
  const [doctorName, setDoctorName] = useState("");
  const [doctorClinic, setDoctorClinic] = useState("");
  const [doctorDepartment, setDoctorDepartment] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorLocation, setDoctorLocation] = useState("");
  const [doctorFee, setDoctorFee] = useState("");
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [clinicName, setClinicName] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [specialtyName, setSpecialtyName] = useState("");
  const [scheduleDoctorName, setScheduleDoctorName] = useState("");
  const [scheduleWorkDays, setScheduleWorkDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("17:00");
  const [scheduleSlotMinutes, setScheduleSlotMinutes] = useState(30);
  const [blockedDoctorName, setBlockedDoctorName] = useState("");
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedTime, setBlockedTime] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [blockedSlotLoading, setBlockedSlotLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [limitedMode, setLimitedMode] = useState(false);
  const [scheduleWarning, setScheduleWarning] = useState("");
  const [blockedSlotsWarning, setBlockedSlotsWarning] = useState("");
  const [activeAdminView, setActiveAdminView] = useState("overview");

  const canAccessAdmin = isAdminUser(user);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return appointments.filter((appointment) => {
      const status = getAppointmentStatus(appointment);
      const appointmentClinic = getDoctorClinic(appointment.doctor, doctors);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesDoctor = doctorFilter === "all" || appointment.doctor === doctorFilter;
      const matchesClinic = clinicFilter === "all" || appointmentClinic === clinicFilter;
      const matchesDateFrom = !dateFromFilter || appointment.date >= dateFromFilter;
      const matchesDateTo = !dateToFilter || appointment.date <= dateToFilter;
      const matchesSearch =
        !query ||
        [appointment.doctor, appointmentClinic, appointment.patient_name, appointment.date, appointment.time, appointment.user_id]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesDoctor && matchesClinic && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [appointments, clinicFilter, dateFromFilter, dateToFilter, doctorFilter, doctors, search, statusFilter]);

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

  const reportStats = useMemo(() => {
    const today = new Date();
    const todayKey = toDateKey(today);
    const weekStartKey = toDateKey(getWeekStart(today));
    const monthStartKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const totalsByDoctor = appointments.reduce((totals, appointment) => {
      if (!appointment.doctor) return totals;

      return {
        ...totals,
        [appointment.doctor]: (totals[appointment.doctor] || 0) + 1,
      };
    }, {});
    const topDoctorEntry = Object.entries(totalsByDoctor).sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])[0];

    return {
      today: appointments.filter((appointment) => appointment.date === todayKey).length,
      week: appointments.filter((appointment) => appointment.date >= weekStartKey).length,
      month: appointments.filter((appointment) => appointment.date >= monthStartKey).length,
      cancelled: appointments.filter((appointment) => getAppointmentStatus(appointment) === "cancelled").length,
      topDoctorName: topDoctorEntry?.[0] || "Nuk ka ende",
      topDoctorCount: topDoctorEntry?.[1] || 0,
      filtered: filteredAppointments.length,
    };
  }, [appointments, filteredAppointments.length]);

  const sortedDoctors = useMemo(
    () =>
      [...doctors].sort((firstDoctor, secondDoctor) =>
        (firstDoctor.name || "").localeCompare(secondDoctor.name || "")
      ),
    [doctors]
  );

  const sortedClinics = useMemo(
    () => [...clinics].sort((firstItem, secondItem) => (firstItem.name || "").localeCompare(secondItem.name || "")),
    [clinics]
  );

  const sortedDepartments = useMemo(
    () => [...departments].sort((firstItem, secondItem) => (firstItem.name || "").localeCompare(secondItem.name || "")),
    [departments]
  );

  const sortedSpecialties = useMemo(
    () => [...specialties].sort((firstItem, secondItem) => (firstItem.name || "").localeCompare(secondItem.name || "")),
    [specialties]
  );

  const sortedSchedules = useMemo(
    () =>
      [...doctorSchedules].sort((firstSchedule, secondSchedule) =>
        (firstSchedule.doctor_name || "").localeCompare(secondSchedule.doctor_name || "")
      ),
    [doctorSchedules]
  );

  const sortedBlockedSlots = useMemo(
    () =>
      [...doctorBlockedSlots].sort((firstSlot, secondSlot) =>
        `${firstSlot.date || ""} ${firstSlot.time || ""}`.localeCompare(`${secondSlot.date || ""} ${secondSlot.time || ""}`)
      ),
    [doctorBlockedSlots]
  );

  const resetDoctorForm = () => {
    setDoctorName("");
    setDoctorClinic("");
    setDoctorDepartment("");
    setDoctorSpecialty("");
    setDoctorLocation("");
    setDoctorFee("");
    setEditingDoctorId(null);
  };

  const resetScheduleForm = () => {
    setScheduleDoctorName("");
    setScheduleWorkDays(["mon", "tue", "wed", "thu", "fri"]);
    setScheduleStartTime("09:00");
    setScheduleEndTime("17:00");
    setScheduleSlotMinutes(30);
  };

  const resetBlockedSlotForm = () => {
    setBlockedDoctorName("");
    setBlockedDate("");
    setBlockedTime("");
    setBlockedReason("");
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
      { data: blockedSlotsData, error: blockedSlotsError },
      { data: clinicsData },
      { data: departmentsData },
      { data: specialtiesData },
    ] =
      await Promise.all([
        fetchAppointmentsWithFallback(user.id),
        supabase.from("doctors").select("*"),
        fetchDoctorSchedules(),
        fetchDoctorBlockedSlots(),
        fetchNamedResource("clinics"),
        fetchNamedResource("departments"),
        fetchNamedResource("specialties"),
      ]);

    setAppointments(appointmentsData || []);
    setDoctors(doctorsData || []);
    setDoctorSchedules(schedulesData || []);
    setDoctorBlockedSlots(blockedSlotsData || []);
    setClinics(clinicsData || []);
    setDepartments(departmentsData || []);
    setSpecialties(specialtiesData || []);
    setLimitedMode(limited);
    setScheduleWarning(
      schedulesError
        ? "Tabela doctor_schedules nuk eshte gati ose nuk ka leje. Orari dinamik nuk ruhet ende."
        : ""
    );
    setBlockedSlotsWarning(
      blockedSlotsError
        ? "Tabela doctor_blocked_slots nuk eshte gati ose nuk ka leje. Bllokimet nuk ruhen ende."
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
        { data: blockedSlotsData, error: blockedSlotsError },
        { data: clinicsData },
        { data: departmentsData },
        { data: specialtiesData },
      ] =
        await Promise.all([
          fetchAppointmentsWithFallback(user.id),
          supabase.from("doctors").select("*"),
          fetchDoctorSchedules(),
          fetchDoctorBlockedSlots(),
          fetchNamedResource("clinics"),
          fetchNamedResource("departments"),
          fetchNamedResource("specialties"),
      ]);

      if (cancelled) return;

      setAppointments(appointmentsData || []);
      setDoctors(doctorsData || []);
      setDoctorSchedules(schedulesData || []);
      setDoctorBlockedSlots(blockedSlotsData || []);
      setClinics(clinicsData || []);
      setDepartments(departmentsData || []);
      setSpecialties(specialtiesData || []);
      setLimitedMode(limited);
      setScheduleWarning(
        schedulesError
          ? "Tabela doctor_schedules nuk eshte gati ose nuk ka leje. Orari dinamik nuk ruhet ende."
          : ""
      );
      setBlockedSlotsWarning(
        blockedSlotsError
          ? "Tabela doctor_blocked_slots nuk eshte gati ose nuk ka leje. Bllokimet nuk ruhen ende."
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
      ? supabase
          .from("doctors")
          .update({
            name: normalizedName,
            clinic: doctorClinic,
            department: doctorDepartment,
            specialty: doctorSpecialty,
            location: doctorLocation.trim(),
            fee: doctorFee.trim(),
          })
          .eq("id", editingDoctorId)
          .select("*")
          .single()
      : supabase
          .from("doctors")
          .insert([
            {
              name: normalizedName,
              clinic: doctorClinic,
              department: doctorDepartment,
              specialty: doctorSpecialty,
              location: doctorLocation.trim(),
              fee: doctorFee.trim(),
            },
          ])
          .select("*")
          .single();

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
    setDoctorClinic(doctor.clinic || "");
    setDoctorDepartment(doctor.department || "");
    setDoctorSpecialty(doctor.specialty || "");
    setDoctorLocation(doctor.location || "");
    setDoctorFee(doctor.fee || "");
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

  const addNamedResource = async (tableName, resourceName, resetResourceName, label) => {
    const normalizedName = resourceName.trim();

    if (!normalizedName) {
      setError(`Shkruaj emrin per ${label}.`);
      return;
    }

    setOrganizationLoading(true);
    setError("");
    setSuccess("");

    const { data, error: resourceError } = await supabase
      .from(tableName)
      .insert([{ name: normalizedName }])
      .select("*")
      .single();

    if (resourceError) {
      setError(`${label} nuk u ruajt. Ekzekuto docs/clinic-organization.sql dhe kontrollo RLS.`);
      setOrganizationLoading(false);
      return;
    }

    if (tableName === "clinics") setClinics((currentItems) => [...currentItems, data]);
    if (tableName === "departments") setDepartments((currentItems) => [...currentItems, data]);
    if (tableName === "specialties") setSpecialties((currentItems) => [...currentItems, data]);

    resetResourceName("");
    setSuccess(`${label} u shtua me sukses.`);
    setOrganizationLoading(false);
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

  const handleBlockedSlotSubmit = async (event) => {
    event.preventDefault();

    if (!blockedDoctorName || !blockedDate || !blockedTime) {
      setError("Zgjidh mjekun, daten dhe oren qe duhet te bllokohet.");
      return;
    }

    setBlockedSlotLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      doctor_name: blockedDoctorName,
      date: blockedDate,
      time: blockedTime,
      reason: blockedReason.trim(),
    };

    const { data, error: blockedSlotError } = await supabase
      .from("doctor_blocked_slots")
      .upsert(payload, { onConflict: "doctor_name,date,time" })
      .select("*")
      .single();

    if (blockedSlotError) {
      setError("Bllokimi nuk u ruajt. Ekzekuto docs/doctor-schedules.sql dhe kontrollo RLS per admin.");
      setBlockedSlotLoading(false);
      return;
    }

    setDoctorBlockedSlots((currentSlots) => {
      const slotExists = currentSlots.some((slot) => slot.id === data.id);

      if (slotExists) {
        return currentSlots.map((slot) => (slot.id === data.id ? data : slot));
      }

      return [...currentSlots.filter(
        (slot) =>
          slot.doctor_name !== data.doctor_name ||
          slot.date !== data.date ||
          slot.time !== data.time
      ), data];
    });
    setSuccess("Orari u bllokua me sukses.");
    resetBlockedSlotForm();
    setBlockedSlotLoading(false);
  };

  const deleteBlockedSlot = async (blockedSlotId) => {
    setBlockedSlotLoading(true);
    setError("");
    setSuccess("");

    const { error: blockedSlotError } = await supabase
      .from("doctor_blocked_slots")
      .delete()
      .eq("id", blockedSlotId);

    if (blockedSlotError) {
      setError("Bllokimi nuk u fshi. Kontrollo RLS per doctor_blocked_slots.");
      setBlockedSlotLoading(false);
      return;
    }

    setDoctorBlockedSlots((currentSlots) => currentSlots.filter((slot) => slot.id !== blockedSlotId));
    setSuccess("Bllokimi u fshi me sukses.");
    setBlockedSlotLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
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
          <button type="button" className="ghost-button" onClick={loadAdminData}>
            Rifresko
          </button>
          <button type="button" className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      {error && <div className="feedback-banner error-banner">{error}</div>}
      {success && <div className="feedback-banner success-banner">{success}</div>}

      <nav className="admin-tabs">
        {ADMIN_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            className={activeAdminView === view.id ? "admin-tab admin-tab--active" : "admin-tab"}
            onClick={() => setActiveAdminView(view.id)}
          >
            {view.label}
          </button>
        ))}
      </nav>

      {activeAdminView === "overview" && (
        <>
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
            <div className="mini-stat">
              <span>Klinika</span>
              <strong>{clinics.length}</strong>
            </div>
          </section>

          <section className="panel admin-table-panel">
            <div className="panel-heading admin-table-heading">
              <div>
                <p className="section-eyebrow">Reports</p>
                <h3>Raporte dhe statistika</h3>
              </div>
            </div>

            <div className="reports-grid">
              <div className="report-card">
                <span>Sot</span>
                <strong>{reportStats.today}</strong>
                <p>Termine ditore</p>
              </div>
              <div className="report-card">
                <span>Kete jave</span>
                <strong>{reportStats.week}</strong>
                <p>Termine javore</p>
              </div>
              <div className="report-card">
                <span>Kete muaj</span>
                <strong>{reportStats.month}</strong>
                <p>Termine mujore</p>
              </div>
              <div className="report-card">
                <span>Te anuluara</span>
                <strong>{reportStats.cancelled}</strong>
                <p>Termine cancelled</p>
              </div>
              <div className="report-card report-card--wide">
                <span>Mjeku me me shume termine</span>
                <strong>{reportStats.topDoctorName}</strong>
                <p>{reportStats.topDoctorCount} termine gjithsej</p>
              </div>
              <div className="report-card">
                <span>Rezultate filtri</span>
                <strong>{reportStats.filtered}</strong>
                <p>Termine te shfaqura</p>
              </div>
            </div>
          </section>
        </>
      )}

      {activeAdminView === "organization" && (
        <section className="panel admin-table-panel">
          <div className="panel-heading admin-table-heading">
            <div>
              <p className="section-eyebrow">Organization</p>
              <h3>Klinika, departamente dhe specialitete</h3>
            </div>
          </div>

          <div className="organization-grid">
            <form
            className="organization-form"
            onSubmit={(event) => {
              event.preventDefault();
              addNamedResource("clinics", clinicName, setClinicName, "Klinika");
            }}
          >
            <label>
              <span>Klinika ose spitali</span>
              <input
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
                placeholder="p.sh. Qendra HealthPlus"
              />
            </label>
            <button type="submit" disabled={organizationLoading}>
              Shto klinike
            </button>
            <div className="organization-list">
              {sortedClinics.map((clinic) => (
                <span key={clinic.id || clinic.name}>
                  {clinic.name}
                  {clinic.city ? ` / ${clinic.city}` : ""}
                  {clinic.country ? `, ${clinic.country}` : ""}
                </span>
              ))}
              {sortedClinics.length === 0 && <p className="empty-state">Nuk ka klinika ende.</p>}
            </div>
            </form>

            <form
            className="organization-form"
            onSubmit={(event) => {
              event.preventDefault();
              addNamedResource("departments", departmentName, setDepartmentName, "Departamenti");
            }}
          >
            <label>
              <span>Departamenti</span>
              <input
                value={departmentName}
                onChange={(event) => setDepartmentName(event.target.value)}
                placeholder="p.sh. Kardiologji"
              />
            </label>
            <button type="submit" disabled={organizationLoading}>
              Shto departament
            </button>
            <div className="organization-list">
              {sortedDepartments.map((department) => (
                <span key={department.id || department.name}>{department.name}</span>
              ))}
              {sortedDepartments.length === 0 && <p className="empty-state">Nuk ka departamente ende.</p>}
            </div>
            </form>

            <form
            className="organization-form"
            onSubmit={(event) => {
              event.preventDefault();
              addNamedResource("specialties", specialtyName, setSpecialtyName, "Specialiteti");
            }}
          >
            <label>
              <span>Specialiteti</span>
              <input
                value={specialtyName}
                onChange={(event) => setSpecialtyName(event.target.value)}
                placeholder="p.sh. Pediater"
              />
            </label>
            <button type="submit" disabled={organizationLoading}>
              Shto specialitet
            </button>
            <div className="organization-list">
              {sortedSpecialties.map((specialty) => (
                <span key={specialty.id || specialty.name}>{specialty.name}</span>
              ))}
              {sortedSpecialties.length === 0 && <p className="empty-state">Nuk ka specialitete ende.</p>}
            </div>
            </form>
          </div>
        </section>
      )}

      {activeAdminView === "doctors" && (
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
          <select value={doctorClinic} onChange={(event) => setDoctorClinic(event.target.value)}>
            <option value="">Zgjidh kliniken</option>
            {sortedClinics.map((clinic) => (
              <option key={clinic.id || clinic.name} value={clinic.name}>
                {clinic.name}
              </option>
            ))}
          </select>
          <select value={doctorDepartment} onChange={(event) => setDoctorDepartment(event.target.value)}>
            <option value="">Zgjidh departamentin</option>
            {sortedDepartments.map((department) => (
              <option key={department.id || department.name} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
          <select value={doctorSpecialty} onChange={(event) => setDoctorSpecialty(event.target.value)}>
            <option value="">Zgjidh specialitetin</option>
            {sortedSpecialties.map((specialty) => (
              <option key={specialty.id || specialty.name} value={specialty.name}>
                {specialty.name}
              </option>
            ))}
          </select>
          <input
            value={doctorLocation}
            onChange={(event) => setDoctorLocation(event.target.value)}
            placeholder="Qyteti, p.sh. Prishtine"
          />
          <input
            value={doctorFee}
            onChange={(event) => setDoctorFee(event.target.value)}
            placeholder="Cmimi, p.sh. 35 EUR"
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
                  <span>
                    {[doctor.clinic, doctor.department, doctor.specialty, doctor.location]
                      .filter(Boolean)
                      .join(" / ") || "Pa organizim klinikor"}
                  </span>
                  <span>{doctor.fee || "Pa cmim"}</span>
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
      )}

      {activeAdminView === "schedules" && (
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
        {blockedSlotsWarning && <div className="feedback-banner error-banner">{blockedSlotsWarning}</div>}

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

        <div className="schedule-divider" />

        <div className="panel-heading admin-table-heading">
          <div>
            <p className="section-eyebrow">Blocked slots</p>
            <h3>Pauza dhe takime tjera</h3>
          </div>
          <button type="button" className="ghost-button" onClick={resetBlockedSlotForm}>
            Pastro bllokimin
          </button>
        </div>

        <form className="admin-blocked-form" onSubmit={handleBlockedSlotSubmit}>
          <label>
            <span>Mjeku</span>
            <select value={blockedDoctorName} onChange={(event) => setBlockedDoctorName(event.target.value)}>
              <option value="">Zgjidh mjekun</option>
              {sortedDoctors.map((doctor) => (
                <option key={doctor.id || doctor.name} value={doctor.name}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Data</span>
            <input type="date" value={blockedDate} onChange={(event) => setBlockedDate(event.target.value)} />
          </label>

          <label>
            <span>Ora</span>
            <input type="time" value={blockedTime} onChange={(event) => setBlockedTime(event.target.value)} />
          </label>

          <label>
            <span>Arsyeja</span>
            <input
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
              placeholder="p.sh. Pauze, takim, operacion"
            />
          </label>

          <button type="submit" disabled={blockedSlotLoading}>
            {blockedSlotLoading ? "Duke ruajtur..." : "Blloko oren"}
          </button>
        </form>

        {sortedBlockedSlots.length === 0 ? (
          <p className="empty-state">Nuk ka orare te bllokuara ende.</p>
        ) : (
          <div className="admin-doctor-list">
            {sortedBlockedSlots.map((slot) => (
              <article key={slot.id || `${slot.doctor_name}-${slot.date}-${slot.time}`} className="admin-doctor-item">
                <div>
                  <strong>{slot.doctor_name}</strong>
                  <span>
                    {slot.date} / {slot.time}
                    {slot.reason ? ` / ${slot.reason}` : ""}
                  </span>
                </div>
                <button type="button" className="delete-btn" onClick={() => deleteBlockedSlot(slot.id)}>
                  Fshi
                </button>
              </article>
            ))}
          </div>
        )}
        </section>
      )}

      {activeAdminView === "appointments" && (
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
              placeholder="Kerko mjek, pacient, klinike ose date"
            />
            <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
              <option value="all">Te gjithe mjeket</option>
              {sortedDoctors.map((doctor) => (
                <option key={doctor.id || doctor.name} value={doctor.name}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <select value={clinicFilter} onChange={(event) => setClinicFilter(event.target.value)}>
              <option value="all">Te gjitha klinikat</option>
              {sortedClinics.map((clinic) => (
                <option key={clinic.id || clinic.name} value={clinic.name}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Te gjitha statuset</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(event) => setDateFromFilter(event.target.value)}
              aria-label="Filtro nga data"
            />
            <input
              type="date"
              value={dateToFilter}
              onChange={(event) => setDateToFilter(event.target.value)}
              aria-label="Filtro deri ne daten"
            />
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
                    <td>{getPatientDisplayName(appointment)}</td>
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
      )}
    </main>
  );
}
