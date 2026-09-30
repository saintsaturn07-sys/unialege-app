import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid payment record." }, { status: 400, headers: noStoreHeaders() }); }
  const studentId = typeof body.student_id === "string" ? body.student_id : "";
  const feeItemId = typeof body.fee_item_id === "string" ? body.fee_item_id : "";
  const amount = Number(body.amount);
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!studentId || !feeItemId || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000 || !reference || reference.length > 120) return Response.json({ error: "Enter a student, fee item, positive amount, and verified payment reference." }, { status: 400, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const [{ data: student, error: studentError }, { data: fee, error: feeError }] = await Promise.all([
    db.from("students").select("id, class_name, field_of_study, session, term").eq("id", studentId).maybeSingle(),
    db.from("fee_items").select("id, amount_due, target_class, target_stream, session, term").eq("id", feeItemId).eq("is_active", true).maybeSingle(),
  ]);
  if (studentError || feeError) return Response.json({ error: "Unable to verify the student and fee item." }, { status: 500, headers: noStoreHeaders() });
  if (!student || !fee) return Response.json({ error: "Student or active fee item not found." }, { status: 404, headers: noStoreHeaders() });
  if ((fee.target_class && fee.target_class !== student.class_name) || (fee.target_stream && fee.target_stream !== student.field_of_study) || fee.session !== student.session || fee.term !== student.term) return Response.json({ error: "This fee item does not apply to the selected student." }, { status: 400, headers: noStoreHeaders() });
  const { data: previous, error: previousError } = await db.from("fee_payments").select("amount").eq("fee_item_id", feeItemId).eq("student_id", studentId).eq("status", "completed");
  if (previousError) return Response.json({ error: "Unable to verify previous payments." }, { status: 500, headers: noStoreHeaders() });
  const paid = (previous ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  if (amount + paid > Number(fee.amount_due)) return Response.json({ error: "Payment amount exceeds the remaining fee balance." }, { status: 400, headers: noStoreHeaders() });
  const { data, error } = await db.from("fee_payments").insert({ student_id: studentId, fee_item_id: feeItemId, amount, reference, status: "completed", paid_at: new Date().toISOString(), recorded_by: admin.username }).select("id, reference").single();
  if (error?.code === "23505") return Response.json({ error: "That payment reference has already been recorded." }, { status: 409, headers: noStoreHeaders() });
  if (error) return Response.json({ error: "Unable to record payment." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ payment: data }, { status: 201, headers: noStoreHeaders() });
}
