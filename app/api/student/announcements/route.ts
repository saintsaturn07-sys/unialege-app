import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("announcements")
    .select("id, title, category, description, details, target_class, target_stream, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Unable to load announcements." }, { status: 500, headers: noStoreHeaders() });
  const announcements = (data ?? []).filter((item) => {
    const matchesClass = item.target_class === null || item.target_class === student.class_name;
    const matchesStream = item.target_stream === null || item.target_stream === student.field_of_study;
    return matchesClass && matchesStream;
  });
  return Response.json({ announcements }, { headers: noStoreHeaders() });
}
