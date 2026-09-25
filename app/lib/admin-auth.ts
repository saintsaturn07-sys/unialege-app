export type AdminSession = { username: string; name: string };

export const ADMIN_DEMO_CREDENTIALS = {
  username: "admin@unialege.edu",
  password: "AdminDemo!2026",
  name: "School Administrator",
};

const ADMIN_SESSION_KEY = "unialege-admin-session";

export function signInAdmin(username: string, password: string) {
  if (
    username.trim().toLowerCase() !== ADMIN_DEMO_CREDENTIALS.username ||
    password !== ADMIN_DEMO_CREDENTIALS.password
  ) {
    return false;
  }

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({ username: ADMIN_DEMO_CREDENTIALS.username, name: ADMIN_DEMO_CREDENTIALS.name }),
  );
  return true;
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" && value !== null &&
      "username" in value && value.username === ADMIN_DEMO_CREDENTIALS.username &&
      "name" in value && typeof value.name === "string"
    ) {
      return { username: value.username, name: value.name };
    }
  } catch {
    return null;
  }
  return null;
}

export function clearAdminSession() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}
