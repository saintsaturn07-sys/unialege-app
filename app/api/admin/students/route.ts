import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { normalizeAdmissionNumber } from "../../../lib/student-store";
import { isSeniorClass, requiresTradeSubject, tradeSubjects } from "../../../lib/subjects";

const fields = "id, created_at, full_name, admission_number, class_name, session, term, field_of_study, trade_subject, phone, parent_guardian_name, parent_guardian_phone, is_active";
type Input = Record<string, unknown>;
function studentData(body: Input) {
  const full_name = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const admission_number = typeof body.admissionNumber === "string" ? normalizeAdmissionNumber(body.admissionNumber) : "";
  const class_name = typeof body.className === "string" ? body.className.trim() : "";
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const field_of_study = body.fieldOfStudy === "science" || body.fieldOfStudy === "commercial" || body.fieldOfStudy === "art" ? body.fieldOfStudy : null;
  const trade_subject = typeof body.tradeSubject === "string" && tradeSubjects.includes(body.tradeSubject) ? body.tradeSubject : null;
  const parent_guardian_name = typeof body.parentGuardianName === "string" ? body.parentGuardianName.trim() : "";
  const parent_guardian_phone = typeof body.parentGuardianPhone === "string" ? body.parentGuardianPhone.trim() : "";
  if (!full_name || !admission_number || !class_name || !session || !term) throw new Error("Complete all required student fields.");
  if (parent_guardian_name.length > 100) throw new Error("Parent or guardian name must be 100 characters or fewer.");
  if (parent_guardian_phone && !validPhone(parent_guardian_phone)) throw new Error("Enter a valid parent or guardian phone number.");
  if (isSeniorClass(class_name) && !field_of_study) throw new Error("Select a valid field of study for this senior student.");
  if (requiresTradeSubject(class_name) && !trade_subject) throw new Error("Select a valid trade subject for this student.");
  return { full_name, admission_number, class_name, session, term, field_of_study: isSeniorClass(class_name) ? field_of_study : null, trade_subject: requiresTradeSubject(class_name) ? trade_subject : null, parent_guardian_name: parent_guardian_name || null, parent_guardian_phone: parent_guardian_phone || null };
}
function validPhone(value: string) { const digits = value.replace(/\D/g, ""); return /^\+?[0-9][0-9\s().-]{5,19}$/.test(value) && digits.length >= 7 && digits.length <= 15; }
function authEmail(studentId: string) { return `student.${studentId}@students.unialege.invalid`; }

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("students").select(fields).order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Unable to load student records." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ students: data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Input;
  try { body = await request.json() as Input; } catch { return Response.json({ error: "Invalid student data." }, { status: 400, headers: noStoreHeaders() }); }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 6) return Response.json({ error: "Set a password of at least 6 characters." }, { status: 400, headers: noStoreHeaders() });
  try {
    const record = studentData(body);
    const db = getSupabaseAdmin();
    const { data: existing, error: duplicateError } = await db.from("students").select("id").eq("admission_number", record.admission_number).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (existing) return Response.json({ error: "That admission number is already in use." }, { status: 409, headers: noStoreHeaders() });
    const provisionalId = crypto.randomUUID();
    const { data: auth, error: authError } = await db.auth.admin.createUser({ email: authEmail(provisionalId), password, email_confirm: true, user_metadata: { student_id: provisionalId } });
    if (authError || !auth.user) return Response.json({ error: "Unable to create the student's secure sign-in. Check the password and try again." }, { status: 400, headers: noStoreHeaders() });
    const { data, error } = await db.from("students").insert({ id: provisionalId, ...record, password: null, auth_user_id: auth.user.id, is_active: true }).select(fields).single();
    if (error) { await db.auth.admin.deleteUser(auth.user.id); throw error; }
    return Response.json({ student: data }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to create student." }, { status: 400, headers: noStoreHeaders() });
  }
}
