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

  try {
    const db = getSupabaseAdmin();
    const { data: student, error } = await db.from("students")
      .select("id, created_at, admission_number, full_name, password, class_name, session, term, field_of_study, trade_subject, auth_user_id")
      .eq("admission_number", admissionNumber).maybeSingle();
    if (error) throw error;
    if (!student) return Response.json({ error: "Invalid admission number or password. Check your credentials or contact the school administrator." }, { status: 401, headers: noStoreHeaders() });

    let authUserId: string | null = student.auth_user_id ?? null;
    if (!authUserId) {
      // One-time staged migration: compare the entered credential only on the
      // server, then provision Supabase Auth and immediately clear the legacy value.
      const expectedPassword = typeof student.password === "string" ? Buffer.from(student.password) : Buffer.alloc(0);
      const providedPassword = Buffer.from(password);
      if (expectedPassword.length === 0 || expectedPassword.length !== providedPassword.length || !timingSafeEqual(expectedPassword, providedPassword)) return Response.json({ error: "Invalid admission number or password. Check your credentials or contact the school administrator." }, { status: 401, headers: noStoreHeaders() });
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: authEmail(student.id), password, email_confirm: true,
        user_metadata: { student_id: student.id },
      });
      if (createError || !created.user) {
        return Response.json({ error: "This account needs a password reset before secure sign-in can be enabled. Contact the school administrator." }, { status: 409, headers: noStoreHeaders() });
      }
      authUserId = created.user.id;
      const { error: linkError } = await db.from("students").update({ auth_user_id: authUserId, password: null }).eq("id", student.id).is("auth_user_id", null);
      if (linkError) {
        await db.auth.admin.deleteUser(authUserId);
        throw linkError;
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) throw new Error("Public Supabase configuration is missing.");
    const authClient = createClient(supabaseUrl, publishableKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
    const { data: authResult, error: authError } = await authClient.auth.signInWithPassword({ email: authEmail(student.id), password });
    if (authError || !authResult.user || authResult.user.id !== authUserId) {
      return Response.json({ error: "Unable to sign in with the linked secure account. Contact the school administrator to reset the password." }, { status: 401, headers: noStoreHeaders() });
    }
    await setStudentCookie(authUserId);
    return Response.json({ student: {
      id: student.id, fullName: student.full_name ?? "", admissionNumber,
      className: student.class_name ?? "", session: student.session ?? "", term: student.term ?? "",
      parentGuardianName: "", parentGuardianPhone: "", fieldOfStudy: student.field_of_study ?? null,
      tradeSubject: student.trade_subject ?? null,
    } }, { headers: noStoreHeaders() });
  } catch {
    return Response.json({ error: "Unable to check your login right now. Please try again." }, { status: 503, headers: noStoreHeaders() });
  }
}
