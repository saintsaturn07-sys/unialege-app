import { randomInt } from "node:crypto";
import { getSubjectsForStudent } from "../../../lib/subjects";
import { assertSameOrigin, noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

type SnapshotQuestion = {
  id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string;
  correct_option: "A" | "B" | "C" | "D";
};
function shuffle<T>(values: T[]) {
  for (let i = values.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

export async function POST(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let examId = "";
  try { const body = await request.json() as { examId?: unknown }; examId = typeof body.examId === "string" ? body.examId : ""; }
  catch { return Response.json({ error: "Invalid attempt request." }, { status: 400, headers: noStoreHeaders() }); }
  if (!examId) return Response.json({ error: "Choose an exam." }, { status: 400, headers: noStoreHeaders() });

  const db = getSupabaseAdmin();
  const { data: exam, error: examError } = await db.from("exams").select("*").eq("id", examId).eq("status", "published").maybeSingle();
  if (examError) return Response.json({ error: "Unable to check exam eligibility." }, { status: 500, headers: noStoreHeaders() });
  if (!exam || exam.class_name.trim().toLowerCase() !== (student.class_name ?? "").trim().toLowerCase() || exam.session !== student.session || exam.term !== student.term) {
    return Response.json({ error: "This exam is not available for your class, session, or term." }, { status: 403, headers: noStoreHeaders() });
  }
  const subjects = getSubjectsForStudent(student.class_name ?? "", student.field_of_study, student.trade_subject);
  const fieldCategory = student.field_of_study === "art" ? "arts" : student.field_of_study;
  if (!subjects.some((subject) => subject.name.toLocaleLowerCase() === exam.subject.toLocaleLowerCase())
    || (exam.category && exam.category !== fieldCategory)) return Response.json({ error: "This subject or category is not assigned to your student profile." }, { status: 403, headers: noStoreHeaders() });

  const { data: priorAttempts, error: priorError } = await db.from("exam_attempts")
    .select("id, status, started_at, ends_at, submitted_at, score_out_of_70, question_snapshot")
    .eq("student_id", student.id).eq("exam_id", exam.id).order("created_at", { ascending: false }).limit(1);
  if (priorError) return Response.json({ error: "Unable to check your previous attempt." }, { status: 500, headers: noStoreHeaders() });
  const prior = priorAttempts?.[0];
  if (prior?.status === "submitted") return Response.json({ error: "You have already completed this exam.", completed: true }, { status: 409, headers: noStoreHeaders() });
  if (prior?.status === "in_progress") {
    const { data: savedAnswers, error: savedError } = await db.from("exam_attempt_answers")
      .select("question_id, selected_option").eq("attempt_id", prior.id);
    if (savedError) return Response.json({ error: "Unable to restore your saved answers." }, { status: 500, headers: noStoreHeaders() });
    const saved = new Map((savedAnswers ?? []).map((answer) => [answer.question_id, answer.selected_option]));
    const questions = (prior.question_snapshot as SnapshotQuestion[]).map(({ correct_option: _hidden, ...question }) => ({ ...question, selected_option: saved.get(question.id) ?? null }));
    return Response.json({ attempt: { id: prior.id, started_at: prior.started_at, ends_at: prior.ends_at, status: prior.status,
      exam: { id: exam.id, title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes }, questions } }, { headers: noStoreHeaders() });
  }
  const { data: source, error: questionError } = await db.from("exam_questions")
    .select("id, question_text, option_a, option_b, option_c, option_d, correct_answer")
    .eq("exam_id", exam.id);
  if (questionError) return Response.json({ error: "Unable to load the exam question pool." }, { status: 500, headers: noStoreHeaders() });
  if (!source?.length) return Response.json({ error: "This exam does not have any questions yet." }, { status: 409, headers: noStoreHeaders() });
  const selected = shuffle([...source]).slice(0, Math.min(exam.question_count ?? 40, source.length));
  const snapshot: SnapshotQuestion[] = selected.map((question) => {
    const options = shuffle([
      { original: "A", text: question.option_a }, { original: "B", text: question.option_b },
      { original: "C", text: question.option_c }, { original: "D", text: question.option_d },
    ]);
    const correctIndex = options.findIndex((option) => option.original === question.correct_answer);
    return {
      id: question.id, question_text: question.question_text,
      option_a: options[0].text, option_b: options[1].text, option_c: options[2].text, option_d: options[3].text,
      correct_option: (["A", "B", "C", "D"] as const)[correctIndex],
    };
  });
  const startedAt = new Date();
  const { data: attempt, error: insertError } = await db.from("exam_attempts").insert({
    student_id: student.id, exam_id: exam.id, subject: exam.subject, session: exam.session, term: exam.term,
    started_at: startedAt.toISOString(), ends_at: new Date(startedAt.getTime() + exam.duration_minutes * 60_000).toISOString(),
    status: "in_progress", question_snapshot: snapshot,
  }).select("id, started_at, ends_at").single();
  if (insertError) {
    if (insertError.code === "23505") return Response.json({ error: "An attempt is already open. Refresh the exam list to continue it." }, { status: 409, headers: noStoreHeaders() });
    return Response.json({ error: "Unable to start this exam." }, { status: 500, headers: noStoreHeaders() });
  }
  return Response.json({ attempt: { ...attempt, exam: { id: exam.id, title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes }, questions: snapshot.map(({ correct_option: _hidden, ...question }) => question) } }, { status: 201, headers: noStoreHeaders() });
}
