import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "./supabase-admin";

export const STUDENT_COOKIE = "unialege_student_session";
export const ADMIN_COOKIE = "unialege_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;
type SessionPayload = { sub: string; role: "student" | "admin"; exp: number };

function signature(value: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Server session signing key is not configured.");
  return createHmac("sha256", secret).update(`unialege-session:${value}`).digest("base64url");
}

function sign(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body)}`;
}

function verify(token: string | undefined, expectedRole: SessionPayload["role"]) {
  if (!token) return null;
  const [body, supplied] = token.split(".");
  if (!body || !supplied) return null;
  const expected = signature(body);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (value.role !== expectedRole || !value.sub || !Number.isInteger(value.exp) || value.exp <= Math.floor(Date.now() / 1000)) return null;
    return value;
  } catch { return null; }
}

function cookieOptions() {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS };
}

export async function setStudentCookie(authUserId: string) {
  (await cookies()).set(STUDENT_COOKIE, sign({ sub: authUserId, role: "student", exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }), cookieOptions());
}

export async function setAdminCookie(username: string) {
  (await cookies()).set(ADMIN_COOKIE, sign({ sub: username, role: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS }), cookieOptions());
}

export async function clearCookie(name: string) {
  (await cookies()).set(name, "", { ...cookieOptions(), maxAge: 0 });
}

export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const session = verify(token, "admin");
  return session ? { username: session.sub } : null;
}

export async function requireStudent() {
  const token = (await cookies()).get(STUDENT_COOKIE)?.value;
  const session = verify(token, "student");
  if (!session) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("students")
    .select("id, auth_user_id, admission_number, full_name, class_name, session, term, field_of_study, trade_subject")
    .eq("auth_user_id", session.sub).maybeSingle();
  if (error || !data) return null;
  const { data: authUser, error: authError } = await db.auth.admin.getUserById(session.sub);
  if (authError || !authUser.user) return null;
  return data;
}

export function noStoreHeaders() {
  return { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie" };
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
