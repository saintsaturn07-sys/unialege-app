import { normalizeAdmissionNumber } from "../../../lib/student-store";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { assertSameOrigin, noStoreHeaders, setStudentCookie } from "../../../lib/server-session";

type StudentLoginBody = { admissionNumber?: unknown; password?: unknown };

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
    const safeStages = ["initialize_supabase_admin", "load_student_record", "provision_auth_user", "link_auth_user", "load_linked_auth_user", "authenticate_student", "set_student_session"] as const;
    const safeStage = (safeStages as readonly string[]).includes(stage) ? stage : "unknown";
    const safeErrorName = (error instanceof Error ? error.name : "UnknownError").replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 80) || "UnknownError";
    let safeErrorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    for (const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY]) {
      if (secret) safeErrorMessage = safeErrorMessage.replaceAll(secret, "[REDACTED]");
    }
    safeErrorMessage = safeErrorMessage
      .replace(/https?:\/\/[^\s"'<>]+/gi, "[REDACTED_URL]")
      .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED]")
      .replace(/\b(?:authorization|cookie|set-cookie)\s*[:=]\s*[^\r\n]*/gi, "[REDACTED_HEADER]")
      .slice(0, 500);
    return Response.json({ error: "LOGIN_SERVER_ERROR", stage: safeStage, errorName: safeErrorName, errorMessage: safeErrorMessage }, { status: 503, headers: noStoreHeaders() });
  }
}
