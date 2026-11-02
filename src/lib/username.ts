export const USERNAME_DOMAIN = "akun.bonanza.id";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,32}$/.test(normalizeUsername(username));
}

export function usernameToEmail(username: string) {
  return `${normalizeUsername(username)}@${USERNAME_DOMAIN}`;
}

export function emailToUsername(email: string) {
  const local = email.split("@")[0] ?? email;
  return local.trim().toLowerCase();
}

export function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  if (role === "guest") return "Guest";
  if (role === "dapur") return "Dapur";
  return "Pelanggan";
}
