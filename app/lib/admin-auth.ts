export type AdminSession = { username: string; name: string };

const ADMIN_SESSION_KEY = "unialege-admin-session";

// This stores display metadata only. Server access is authorized by the
// signed HttpOnly cookie, verified through /api/admin/session.
export function saveAdminSession(session: AdminSession) {
  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export async function verifyAdminSession(): Promise<AdminSession | null> {
  try {
    const response = await fetch("/api/admin/session", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) return null;
    const value: unknown = await response.json();
    if (
      typeof value === "object" && value !== null &&
      "username" in value && typeof value.username === "string" &&
      "name" in value && typeof value.name === "string"
    ) return { username: value.username, name: value.name };
  } catch {
    return null;
  }
  return null;
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
  void fetch("/api/admin/logout", { method: "POST", cache: "no-store", keepalive: true }).catch(() => {});
}
