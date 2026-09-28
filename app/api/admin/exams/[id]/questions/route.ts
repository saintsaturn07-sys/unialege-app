import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { id } = await context.params;
  const { data, error } = await getSupabaseAdmin().from("exam_questions").select("*").eq("exam_id", id).order("question_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) return Response.json({ error: "Unable to load questions." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ questions: data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  const { id } = await context.params;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid question data." }, { status: 400, headers: noStoreHeaders() }); }
  const parsed = parseQuestion(body);
  if (!parsed) return Response.json({ error: "Enter a question, all four options, and a valid correct answer." }, { status: 400, headers: noStoreHeaders() });
  const { data: orderRows, error: orderError } = await getSupabaseAdmin().from("exam_questions").select("question_order").eq("exam_id", id).order("question_order", { ascending: false }).limit(1);
  if (orderError) return Response.json({ error: "Unable to determine question order." }, { status: 500, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("exam_questions").insert({ exam_id: id, ...parsed, question_order: Number(orderRows?.[0]?.question_order ?? -1) + 1 }).select("*").single();
  if (error) return Response.json({ error: "Unable to create question." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ question: data }, { status: 201, headers: noStoreHeaders() });
}

export function parseQuestion(body: Record<string, unknown>) {
  const text = typeof body.question_text === "string" ? body.question_text.trim() : "";
  const a = typeof body.option_a === "string" ? body.option_a.trim() : "";
  const b = typeof body.option_b === "string" ? body.option_b.trim() : "";
  const c = typeof body.option_c === "string" ? body.option_c.trim() : "";
  const d = typeof body.option_d === "string" ? body.option_d.trim() : "";
  const answer = body.correct_answer;
  return text && a && b && c && d && (answer === "A" || answer === "B" || answer === "C" || answer === "D")
    ? { question_text: text, option_a: a, option_b: b, option_c: c, option_d: d, correct_answer: answer as "A" | "B" | "C" | "D" }
    : null;
}
