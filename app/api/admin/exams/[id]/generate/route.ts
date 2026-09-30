import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../../lib/supabase-admin";
import { normalizeQuestionBankSubject } from "../../../../../lib/question-bank-subject";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });

  const { id } = await context.params;
  const db = getSupabaseAdmin();
  const { data: exam, error: examError } = await db.from("exams").select("id, subject").eq("id", id).maybeSingle();
  if (examError) return Response.json({ error: "Unable to load exam for question generation." }, { status: 500, headers: noStoreHeaders() });
  if (!exam) return Response.json({ error: "Exam not found." }, { status: 404, headers: noStoreHeaders() });

  const subject = normalizeQuestionBankSubject(exam.subject);
  if (subject !== exam.subject) {
    const { error: normalizeError } = await db.from("exams").update({ subject }).eq("id", id);
    if (normalizeError) return Response.json({ error: "Unable to normalize the exam subject for question generation." }, { status: 500, headers: noStoreHeaders() });
  }

  const { data, error } = await db.rpc("generate_exam_questions_from_bank", { p_exam_id: id });
  if (error) {
    const status = /not found/i.test(error.message) ? 404 : /not enough matching/i.test(error.message) ? 409 : 500;
    const shortage = error.message.match(/requested\s+(\d+),\s*available\s+(\d+)/i);
    const message = status === 404
      ? "Exam not found."
      : status === 409
        ? shortage
          ? `The exam needs ${shortage[1]} matching active bank questions, but only ${shortage[2]} are available.`
          : "There are not enough matching active bank questions to fill this exam."
        : "Unable to generate questions from the reusable question bank.";
    return Response.json({ error: message }, { status, headers: noStoreHeaders() });
  }

  return Response.json({ result: data }, { headers: noStoreHeaders() });
}
