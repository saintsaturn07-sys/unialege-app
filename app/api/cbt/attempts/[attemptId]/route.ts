import { noStoreHeaders, requireStudent } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Context = { params: Promise<{ attemptId: string }> };
type SafeQuestion = { id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string };
export async function GET(_request: Request, context: Context) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const { attemptId } = await context.params;
  const db = getSupabaseAdmin();
  const { data: attempt, error } = await db.from("exam_attempts").select("id, exam_id, started_at, ends_at, status, question_snapshot, score_out_of_70")
    .eq("id", attemptId).eq("student_id", student.id).maybeSingle();
  if (error) return Response.json({ error: "Unable to load this attempt." }, { status: 500, headers: noStoreHeaders() });
  if (!attempt) return Response.json({ error: "Attempt not found." }, { status: 404, headers: noStoreHeaders() });
  const { data: answers, error: answerError } = await db.from("exam_attempt_answers").select("question_id, selected_option").eq("attempt_id", attemptId);
  if (answerError) return Response.json({ error: "Unable to load saved answers." }, { status: 500, headers: noStoreHeaders() });
  const answerMap = Object.fromEntries((answers ?? []).map((answer) => [answer.question_id, answer.selected_option]));
  const safeQuestions = (attempt.question_snapshot as SafeQuestion[]).map(({ correct_option: _hidden, ...question }) => ({ ...question, selected_option: answerMap[question.id] ?? null }));
  return Response.json({ attempt: { id: attempt.id, exam_id: attempt.exam_id, started_at: attempt.started_at, ends_at: attempt.ends_at, status: attempt.status, score_out_of_70: attempt.status === "submitted" ? attempt.score_out_of_70 : null, questions: safeQuestions } }, { headers: noStoreHeaders() });
}
