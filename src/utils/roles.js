const DEFAULT_ADMIN_EMAILS = ["floresasherifi97@gmail.com"];

function parseEmailList(value) {
  return (value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function getUserRole(user) {
  const email = user?.email?.toLowerCase();
  const metadataRole = user?.user_metadata?.role;
  const adminEmails = [
    ...DEFAULT_ADMIN_EMAILS,
    ...parseEmailList(import.meta.env.VITE_ADMIN_EMAILS),
  ];
  const doctorEmails = parseEmailList(import.meta.env.VITE_DOCTOR_EMAILS);

  if (metadataRole === "admin" || adminEmails.includes(email)) return "admin";
  if (metadataRole === "doctor" || doctorEmails.includes(email)) return "doctor";

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
