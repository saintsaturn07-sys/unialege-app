import { normalizeAdmissionNumber } from "../../../lib/student-store";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { assertSameOrigin, noStoreHeaders, setStudentCookie } from "../../../lib/server-session";

type StudentLoginBody = { admissionNumber?: unknown; password?: unknown };

function safeDiagnosticText(value: unknown, secrets: string[] = []): string | undefined {
  if (typeof value !== "string") return undefined;
  let text = value;
  for (const secret of secrets) if (secret) text = text.split(secret).join("[REDACTED]");
  return text
    .replace(/\b(password|passwd|token|api[_-]?key|authorization|cookie|secret)\b\s*([=:])\s*([^\s,;]+)/gi, "$1$2[REDACTED]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/\b(?:sb_secret_|sb_publishable_|sk_live_|sk_test_)[a-zA-Z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\beyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, "[REDACTED]")
    .slice(0, 500);
}

function diagnosticError(error: unknown, secrets: string[], depth = 0): Record<string, unknown> {
  if (depth > 2) return { errorCause: "[cause omitted]" };
  const value = error !== null && typeof error === "object" ? error as Record<string, unknown> : {};
  const name = error instanceof Error ? error.name : safeDiagnosticText(value.name, secrets) ?? "UnknownError";
  const message = error instanceof Error ? error.message : value.message;
  const output: Record<string, unknown> = {
    errorName: safeDiagnosticText(name, secrets) ?? "UnknownError",
    errorMessage: safeDiagnosticText(message, secrets) ?? "An unknown error occurred.",
  };
  for (const key of ["code", "details", "hint"] as const) {
    if (key in value && value[key] !== undefined && value[key] !== null) {
      output[`error${key[0].toUpperCase()}${key.slice(1)}`] = safeDiagnosticText(value[key], secrets) ?? "[non-string value omitted]";
    }
  }
  if ("cause" in value && value.cause !== undefined) {
    output.errorCause = diagnosticError(value.cause, secrets, depth + 1);
  }
  return output;
}

function authEmail(studentId: string) { return `student.${studentId}@students.unialege.invalid`; }

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: StudentLoginBody;
  try { body = await request.json() as StudentLoginBody; }
  catch { return Response.json({ error: "Invalid sign-in request." }, { status: 400, headers: noStoreHeaders() }); }
  const admissionNumber = typeof body.admissionNumber === "string" ? normalizeAdmissionNumber(body.admissionNumber) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!admissionNumber || !password) return Response.json({ error: "Enter your admission number and password." }, { status: 400, headers: noStoreHeaders() });

  let stage = "initialize_supabase_admin";
  try {
    const db = getSupabaseAdmin();
    stage = "load_student_record";
    const { data: student, error } = await db.from("students")
      .select("id, created_at, admission_number, full_name, password, class_name, session, term, field_of_study, trade_subject, auth_user_id, phone, parent_guardian_name, parent_guardian_phone, is_active")
      .eq("admission_number", admissionNumber).maybeSingle();
    if (error) throw error;
    if (!student) return Response.json({ error: "Invalid admission number or password. Check your credentials or contact the school administrator." }, { status: 401, headers: noStoreHeaders() });
    if (!student.is_active) return Response.json({ error: "This student account is inactive. Contact the school administrator." }, { status: 403, headers: noStoreHeaders() });

    let authUserId: string | null = student.auth_user_id ?? null;
    if (!authUserId) {
      // One-time staged migration: compare the entered credential only on the
      // server, then provision Supabase Auth and immediately clear the legacy value.
      const expectedPassword = typeof student.password === "string" ? Buffer.from(student.password) : Buffer.alloc(0);
      const providedPassword = Buffer.from(password);
      if (expectedPassword.length === 0 || expectedPassword.length !== providedPassword.length || !timingSafeEqual(expectedPassword, providedPassword)) return Response.json({ error: "Invalid admission number or password. Check your credentials or contact the school administrator." }, { status: 401, headers: noStoreHeaders() });
      stage = "provision_auth_user";
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: authEmail(student.id), password, email_confirm: true,
        user_metadata: { student_id: student.id },
      });
      if (createError || !created.user) {
        return Response.json({ error: "This account needs a password reset before secure sign-in can be enabled. Contact the school administrator." }, { status: 409, headers: noStoreHeaders() });
      }
      authUserId = created.user.id;
      stage = "link_auth_user";
      const { error: linkError } = await db.from("students").update({ auth_user_id: authUserId, password: null }).eq("id", student.id).is("auth_user_id", null);
      if (linkError) {
        await db.auth.admin.deleteUser(authUserId);
        throw linkError;
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) throw new Error("Public Supabase configuration is missing.");
    stage = "load_linked_auth_user";
    const { data: linkedAuth, error: linkedAuthError } = await db.auth.admin.getUserById(authUserId);
    if (linkedAuthError || !linkedAuth.user?.email) throw new Error("The student's secure sign-in account could not be found.");
    const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    stage = "authenticate_student";
    const { data: authResult, error: authError } = await authClient.auth.signInWithPassword({ email: linkedAuth.user.email, password });
    if (authError || !authResult.user || authResult.user.id !== authUserId) {
      return Response.json({ error: "Unable to sign in with the linked secure account. Contact the school administrator to reset the password." }, { status: 401, headers: noStoreHeaders() });
    }
    stage = "set_student_session";
    await setStudentCookie(authUserId);
    return Response.json({ student: {
      id: student.id, fullName: student.full_name ?? "", admissionNumber,
      className: student.class_name ?? "", session: student.session ?? "", term: student.term ?? "",
      parentGuardianName: student.parent_guardian_name ?? "", parentGuardianPhone: student.parent_guardian_phone ?? "", fieldOfStudy: student.field_of_study ?? null,
      tradeSubject: student.trade_subject ?? null, email: linkedAuth.user.email, phone: student.phone ?? "",
    } }, { headers: noStoreHeaders() });
  } catch (error) {
    const secrets = [password, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY].filter((value): value is string => Boolean(value));
    return Response.json({ error: "LOGIN_SERVER_ERROR", stage, ...diagnosticError(error, secrets) }, { status: 503, headers: noStoreHeaders() });
  }
}
