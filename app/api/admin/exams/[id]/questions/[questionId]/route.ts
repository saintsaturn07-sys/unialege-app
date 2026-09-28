import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../../../lib/supabase-admin";
import { parseQuestion } from "../route";

type Context = { params: Promise<{ id: string; questionId: string }> };
export async function PATCH(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id, questionId } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid question data." }, { status: 400, headers: noStoreHeaders() }); }
  const parsed = parseQuestion(body);
  if (!parsed) return Response.json({ error: "Enter a question, all four options, and a valid correct answer." }, { status: 400, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("exam_questions").update(parsed).eq("id", questionId).eq("exam_id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: "Unable to update question." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Question not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}

export async function DELETE(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id, questionId } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("exam_questions").delete().eq("id", questionId).eq("exam_id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: "Unable to delete question." }, { status: 500, headers: noStoreHeaders() });
  if (!data) return Response.json({ error: "Question not found." }, { status: 404, headers: noStoreHeaders() });
  return Response.json({ ok: true }, { headers: noStoreHeaders() });
}
