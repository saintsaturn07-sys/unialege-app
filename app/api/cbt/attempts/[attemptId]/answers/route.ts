import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";

type Context = { params: Promise<{ attemptId: string }> };
export async function POST(request: Request, context: Context) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: { questionId?: unknown; selectedOption?: unknown };
  try { body = await request.json() as typeof body; } catch { return Response.json({ error: "Invalid answer." }, { status: 400, headers: noStoreHeaders() }); }
  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  const selected = body.selectedOption;
  if (!questionId || !(selected === "A" || selected === "B" || selected === "C" || selected === "D")) return Response.json({ error: "Choose one of the listed options." }, { status: 400, headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().rpc("save_cbt_attempt_answer", {
    p_attempt_id: (await context.params).attemptId, p_student_id: student.id,
    p_question_id: questionId, p_selected_option: selected,
  });
  if (error) {
    const status = /not found/i.test(error.message) ? 404 : /cannot accept|not part of/i.test(error.message) ? 409 : 500;
    return Response.json({ error: status === 404 ? "Attempt not found." : status === 409 ? "This answer cannot be saved for the attempt." : "Unable to save this answer." }, { status, headers: noStoreHeaders() });
  }
  return Response.json({ saved: true }, { headers: noStoreHeaders() });
}
