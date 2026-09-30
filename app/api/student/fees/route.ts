import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const { data: items, error: itemError } = await db.from("fee_items")
    .select("id, name, amount_due, target_class, target_stream, session, term")
    .eq("is_active", true).eq("session", student.session ?? "").eq("term", student.term ?? "");
  if (itemError) return Response.json({ error: "Unable to load fee items." }, { status: 500, headers: noStoreHeaders() });
  const visibleItems = (items ?? []).filter((item) => (!item.target_class || item.target_class === student.class_name)
    && (!item.target_stream || item.target_stream === student.field_of_study));
  const { data: payments, error: paymentError } = await db.from("fee_payments")
    .select("id, fee_item_id, amount, reference, status, paid_at, created_at, notes")
    .eq("student_id", student.id).order("created_at", { ascending: false });
  if (paymentError) return Response.json({ error: "Unable to load payment history." }, { status: 500, headers: noStoreHeaders() });
  const paymentItemIds = [...new Set((payments ?? []).map((payment) => payment.fee_item_id))];
  const { data: paymentItems, error: paymentItemsError } = paymentItemIds.length
    ? await db.from("fee_items").select("id, name").in("id", paymentItemIds)
    : { data: [], error: null };
  if (paymentItemsError) return Response.json({ error: "Unable to load payment descriptions." }, { status: 500, headers: noStoreHeaders() });
  const feeNames = new Map((paymentItems ?? []).map((item) => [item.id, item.name]));
  const feeItems = visibleItems.map((item) => {
    const itemPayments = (payments ?? []).filter((payment) => payment.fee_item_id === item.id);
    const paid = itemPayments.filter((payment) => payment.status === "completed").reduce((sum, payment) => sum + Number(payment.amount), 0);
    return { ...item, amount_paid: paid, balance: Math.max(0, Number(item.amount_due) - paid), payments: itemPayments };
  });
  return Response.json({ fee_items: feeItems, payments: (payments ?? []).map((payment) => ({ ...payment, fee_name: feeNames.get(payment.fee_item_id) ?? "Fee item" })), total_due: feeItems.reduce((sum, item) => sum + Number(item.amount_due), 0), total_paid: feeItems.reduce((sum, item) => sum + Number(item.amount_paid), 0) }, { headers: noStoreHeaders() });
}
