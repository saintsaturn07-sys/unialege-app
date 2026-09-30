import { noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const [students, results, exams, fees, payments, timetable, announcements] = await Promise.all([
    db.from("students").select("id, class_name", { count: "exact" }),
    db.from("results").select("id", { count: "exact", head: true }),
    db.from("exams").select("id", { count: "exact", head: true }),
    db.from("fee_items").select("id", { count: "exact", head: true }),
    db.from("fee_payments").select("id", { count: "exact", head: true }),
    db.from("timetable_entries").select("id", { count: "exact", head: true }),
    db.from("announcements").select("id", { count: "exact", head: true }),
  ]);
  if (students.error || results.error || exams.error || fees.error || payments.error || timetable.error || announcements.error) return Response.json({ error: "Unable to load school summary." }, { status: 500, headers: noStoreHeaders() });
  const classes = new Set((students.data ?? []).map((row) => row.class_name).filter(Boolean));
  return Response.json({ students: students.count ?? 0, classes: classes.size, results: results.count ?? 0, exams: exams.count ?? 0, fee_items: fees.count ?? 0, payments: payments.count ?? 0, timetable_entries: timetable.count ?? 0, announcements: announcements.count ?? 0 }, { headers: noStoreHeaders() });
}
