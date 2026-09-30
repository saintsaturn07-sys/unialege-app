import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  let query = db.from("timetable_entries").select("id, day_of_week, period, start_time, end_time, subject, teacher, class_name, target_stream, session, term")
    .eq("class_name", student.class_name ?? "").eq("session", student.session ?? "").eq("term", student.term ?? "");
  query = student.field_of_study
    ? query.or(`target_stream.is.null,target_stream.eq.${student.field_of_study}`)
    : query.is("target_stream", null);
  const { data, error } = await query.order("day_of_week").order("period");
  if (error) return Response.json({ error: "Unable to load your class timetable." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ entries: data ?? [], scope: { class_name: student.class_name, session: student.session, term: student.term } }, { headers: noStoreHeaders() });
}
