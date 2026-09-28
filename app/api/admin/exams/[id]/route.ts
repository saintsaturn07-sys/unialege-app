import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid exam data." }, { status: 400, headers: noStoreHeaders() }); }
  const duration = Number(body.duration_minutes);
  const questionCount = Number(body.question_count);
  const status = body.status === "published" ? "published" : body.status === "draft" ? "draft" : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const className = typeof body.class_name === "string" ? body.class_name.trim() : "";
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().toLowerCase() : null;
  const topic = typeof body.topic === "string" ? body.topic.trim() || null : null;
  if (!title || !subject || !className || !session || !term || !status || (category !== null && !["science", "commercial", "arts"].includes(category)) || !Number.isInteger(duration) || duration < 1 || duration > 600 || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 500) {
    return Response.json({ error: "Enter valid exam details, duration, and question count." }, { status: 400, headers: noStoreHeaders() });
  }
  const { data, error } = await getSupabaseAdmin().from("exams").update({ title, subject, class_name: className, session, term, duration_minutes: duration, status, question_count: questionCount, category, topic }).eq("id", id).select("*").maybeSingle();
  if (error) return Response.json({ error: "Unable to update exam." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Exam not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ exam: data }, { headers: noStoreHeaders() });
}

export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("exams").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: "Unable to delete exam. Exams with recorded attempts cannot be deleted." }, { status: 409, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Exam not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
