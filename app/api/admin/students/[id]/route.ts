import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { normalizeAdmissionNumber } from "../../../../lib/student-store";
import { isSeniorClass, requiresTradeSubject, tradeSubjects } from "../../../../lib/subjects";

const fields = "id, created_at, full_name, admission_number, class_name, session, term, field_of_study, trade_subject, phone, parent_guardian_name, parent_guardian_phone, is_active";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  let body: Input;
  try { body = await request.json() as Input; } catch { return Response.json({ error: "Invalid student data." }, { status: 400, headers: noStoreHeaders() }); }
  const db = getSupabaseAdmin();
  if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
    const { data, error } = await db.from("students").update({ is_active: body.isActive }).eq("id", id).select(fields).maybeSingle();
    if (error) return Response.json({ error: "Unable to update student account status." }, { status: 500, headers: noStoreHeaders() });
    if (!data) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
    return Response.json({ student: data }, { headers: noStoreHeaders() });
  }
  try {
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
    const { data: student, error: findError } = await db.from("students").select("id, auth_user_id, password").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!student) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
    const { data: duplicate, error: duplicateError } = await db.from("students").select("id").eq("admission_number", admission_number).neq("id", id).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return Response.json({ error: "That admission number is already in use." }, { status: 409, headers: noStoreHeaders() });

    const password = typeof body.password === "string" ? body.password : "";
    const changed: Record<string, unknown> = { full_name, admission_number, class_name, session, term,
      field_of_study: isSeniorClass(class_name) ? field_of_study : null,
      trade_subject: requiresTradeSubject(class_name) ? trade_subject : null,
      parent_guardian_name: parent_guardian_name || null, parent_guardian_phone: parent_guardian_phone || null };
    if (password) {
      if (password.length < 6) return Response.json({ error: "Set a password of at least 6 characters." }, { status: 400, headers: noStoreHeaders() });
      if (student.auth_user_id) {
        const { error } = await db.auth.admin.updateUserById(student.auth_user_id, { password });
        if (error) throw error;
      } else {
        // Upgrade a legacy account when an administrator sets/resets its
        // password. Keep its existing student ID and academic references.
        const { data: auth, error: authError } = await db.auth.admin.createUser({
          email: authEmail(id), password, email_confirm: true,
          user_metadata: { student_id: id },
        });
        if (authError || !auth.user) throw new Error("Unable to create the student's secure sign-in. Try a different password or contact support.");
        changed.auth_user_id = auth.user.id;
        try {
          const { data, error } = await db.from("students").update({ ...changed, password: null }).eq("id", id).select(fields).maybeSingle();
          if (error) throw error;
          if (!data) throw new Error("Student not found.");
          return Response.json({ student: data }, { headers: noStoreHeaders() });
        } catch (error) {
          await db.auth.admin.deleteUser(auth.user.id);
          throw error;
        }
      }
      changed.password = null;
    }
    const { data, error } = await db.from("students").update(changed).eq("id", id).select(fields).maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
    return Response.json({ student: data }, { headers: noStoreHeaders() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to update student." }, { status: 400, headers: noStoreHeaders() });
  }
}

function authEmail(studentId: string) { return `student.${studentId}@students.unialege.invalid`; }
function validPhone(value: string) { const digits = value.replace(/\D/g, ""); return /^\+?[0-9][0-9\s().-]{5,19}$/.test(value) && digits.length >= 7 && digits.length <= 15; }

type Input = Record<string, unknown>;

export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: student, error: findError } = await db.from("students").select("auth_user_id").eq("id", id).maybeSingle();
  if (findError) return Response.json({ error: "Unable to find student." }, { status: 500, headers: noStoreHeaders() });
  if (!student) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
  const { error } = await db.from("students").delete().eq("id", id);
  if (error) return Response.json({ error: "Unable to delete student. Existing academic records may refer to this account." }, { status: 409, headers: noStoreHeaders() });
  if (student.auth_user_id) await db.auth.admin.deleteUser(student.auth_user_id);
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
