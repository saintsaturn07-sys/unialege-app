import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const url = new URL(request.url);
  const session = url.searchParams.get("session") ?? "";
  const term = url.searchParams.get("term") ?? "";
  const { data, error } = await getSupabaseAdmin().from("results").select("id, subject, ca_score, exam_score")
    .eq("student_id", student.id).eq("session", session).eq("term", term).order("subject", { ascending: true });
  if (error) return Response.json({ error: "Unable to load results." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ results: data ?? [] }, { headers: noStoreHeaders() });
}
