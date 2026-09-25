export type AdminSession = { username: string; name: string };

const ADMIN_SESSION_KEY = "unialege-admin-session";

// TEMPORARY DEMO AUTHENTICATION: credential verification is performed by the
// server route. Replace this browser-only session with a real server session
// before using the portal for production school accounts.
export function saveAdminSession(session: AdminSession) {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" && value !== null &&
      "username" in value && typeof value.username === "string" &&
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
  try {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // A blocked browser store is already effectively signed out.
  }
}
