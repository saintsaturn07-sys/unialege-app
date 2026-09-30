import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

function cleanPhone(value: unknown, label: string) {
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  const phone = value.trim();
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!/^\+?[0-9][0-9\s().-]{5,19}$/.test(phone) || digits.length < 7 || digits.length > 15) throw new Error(`Enter a valid ${label.toLowerCase()} with 7 to 15 digits.`);
  return phone;
}

export async function GET() {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().auth.admin.getUserById(student.auth_user_id);
  if (error || !data.user) return Response.json({ error: "Unable to load your account profile." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ profile: {
    full_name: student.full_name,
    admission_number: student.admission_number,
    class_name: student.class_name,
    field_of_study: student.field_of_study,
    trade_subject: student.trade_subject,
    session: student.session,
    term: student.term,
    email: data.user.email?.endsWith("@students.unialege.invalid") ? "" : data.user.email ?? "",
    phone: student.phone ?? "",
    parent_guardian_name: student.parent_guardian_name ?? "",
    parent_guardian_phone: student.parent_guardian_phone ?? "",
  } }, { headers: noStoreHeaders() });
}

export async function PATCH(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid profile data." }, { status: 400, headers: noStoreHeaders() }); }
  try {
    const changed: Record<string, string | null> = {};
    if (Object.hasOwn(body, "phone")) changed.phone = cleanPhone(body.phone, "Phone number");
    if (Object.hasOwn(body, "parent_guardian_name")) {
      if (typeof body.parent_guardian_name !== "string" || body.parent_guardian_name.trim().length > 100) throw new Error("Enter a parent or guardian name no longer than 100 characters.");
      changed.parent_guardian_name = body.parent_guardian_name.trim() || null;
    }
    if (Object.hasOwn(body, "parent_guardian_phone")) changed.parent_guardian_phone = cleanPhone(body.parent_guardian_phone, "Parent/guardian phone number");
    if (!Object.keys(changed).length || Object.keys(body).some((key) => !["phone", "parent_guardian_name", "parent_guardian_phone"].includes(key))) throw new Error("Update only the contact fields shown in your profile.");
    const { data, error } = await getSupabaseAdmin().from("students").update(changed)
      .eq("id", student.id).eq("auth_user_id", student.auth_user_id)
      .select("phone, parent_guardian_name, parent_guardian_phone").maybeSingle();
    if (error) return Response.json({ error: "Unable to save your contact details." }, { status: 500, headers: noStoreHeaders() });
    if (!data) return Response.json({ error: "Your student profile could not be found." }, { status: 404, headers: noStoreHeaders() });
    return Response.json({ profile: data, message: "Contact details saved successfully." }, { headers: noStoreHeaders() });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid profile data." }, { status: 400, headers: noStoreHeaders() }); }
}
