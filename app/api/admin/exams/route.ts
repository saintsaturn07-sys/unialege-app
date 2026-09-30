import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";
import { normalizeQuestionBankSubject } from "../../../lib/question-bank-subject";

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("exams").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Unable to load exams." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ exams: data ?? [] }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid exam data." }, { status: 400, headers: noStoreHeaders() }); }
  const duration = Number(body.duration_minutes);
  const status = body.status === "published" ? "published" : body.status === "draft" ? "draft" : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subject = typeof body.subject === "string" ? normalizeQuestionBankSubject(body.subject) : "";
  const className = typeof body.class_name === "string" ? body.class_name.trim() : "";
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const assessmentType = body.assessment_type === "formal" || body.assessment_type === "mock" || body.assessment_type === "unclassified" ? body.assessment_type : "";
  const category = typeof body.category === "string" && body.category.trim() ? body.category.trim().toLowerCase() : null;
  const topic = typeof body.topic === "string" ? body.topic.trim() || null : null;
  const questionCount = Number(body.question_count);
  if (!title || !subject || !className || !session || !term || !status || !assessmentType || (category !== null && !["science", "commercial", "arts"].includes(category)) || !Number.isInteger(duration) || duration < 1 || duration > 600 || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 500) {
    return Response.json({ error: "Enter valid exam details, duration, and question count." }, { status: 400, headers: noStoreHeaders() });
  }
  const { data, error } = await getSupabaseAdmin().from("exams").insert({ title, subject, class_name: className, session, term, duration_minutes: duration, status, assessment_type: assessmentType, question_count: questionCount, category, topic }).select("*").single();
  if (error) return Response.json({ error: "Unable to create exam." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ exam: data }, { status: 201, headers: noStoreHeaders() });
}
