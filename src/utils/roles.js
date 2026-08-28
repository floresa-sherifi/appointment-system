const DEFAULT_ADMIN_EMAILS = ["floresasherifi97@gmail.com"];
const DEFAULT_DOCTOR_EMAILS = ["floresa.sherifi@umib.net"];

function parseEmailList(value) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().replace(/^["']|["']$/g, "").toLowerCase())
    .filter(Boolean);
}

function looksLikeDoctorProfile(user) {
  const doctorName = user?.user_metadata?.doctor_name || user?.user_metadata?.name || "";

  return /^dr\.?\s*\S+/i.test(doctorName.trim());
}

export function getUserRole(user) {
  const email = user?.email?.toLowerCase();
  const metadataRole = user?.user_metadata?.role;
  const adminEmails = [
    ...DEFAULT_ADMIN_EMAILS,
    ...parseEmailList(import.meta.env.VITE_ADMIN_EMAILS),
  ];
  const doctorEmails = [
    ...DEFAULT_DOCTOR_EMAILS,
    ...parseEmailList(import.meta.env.VITE_DOCTOR_EMAILS),
  ];

  if (metadataRole === "admin" || adminEmails.includes(email)) return "admin";
  if (metadataRole === "doctor" || doctorEmails.includes(email) || looksLikeDoctorProfile(user)) return "doctor";

  return "patient";
}

export function isAdminUser(user) {
  return getUserRole(user) === "admin";
}

export function isDoctorUser(user) {
  return getUserRole(user) === "doctor";
}

export function getDisplayName(user, fallback = "Perdorues") {
  return user?.user_metadata?.name || user?.email || fallback;
}

export function getDoctorName(user) {
  return user?.user_metadata?.doctor_name || user?.user_metadata?.name || "";
}
