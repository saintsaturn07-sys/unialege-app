import { getSubjectsForStudent } from "../../../lib/subjects";
import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET() {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const subjects = getSubjectsForStudent(student.class_name ?? "", student.field_of_study, student.trade_subject).map((item) => item.name.toLocaleLowerCase());
  if (!subjects.length || !student.class_name) return Response.json({ exams: [] }, { headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("exams")
    .select("id, title, subject, class_name, category, session, term, duration_minutes, question_count")
    .eq("status", "published").ilike("class_name", student.class_name)
    .eq("session", student.session ?? "").eq("term", student.term ?? "");
  if (error) return Response.json({ error: "Unable to load available exams." }, { status: 500, headers: noStoreHeaders() });
  const fieldCategory = student.field_of_study === "art" ? "arts" : student.field_of_study;
  const eligible = (data ?? []).filter((exam) => subjects.includes(exam.subject.toLocaleLowerCase())
    && (!exam.category || exam.category === fieldCategory));
  if (!eligible.length) return Response.json({ exams: [] }, { headers: noStoreHeaders() });
  const { data: attempts, error: attemptError } = await getSupabaseAdmin().from("exam_attempts")
    .select("id, exam_id, status, ends_at, score_out_of_70, created_at")
    .eq("student_id", student.id).in("exam_id", eligible.map((exam) => exam.id))
    .order("created_at", { ascending: false });
  if (attemptError) return Response.json({ error: "Unable to check your exam history." }, { status: 500, headers: noStoreHeaders() });
  const latestByExam = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts ?? []) if (!latestByExam.has(attempt.exam_id)) latestByExam.set(attempt.exam_id, attempt);
  const exams = eligible.map((exam) => {
    const latest = latestByExam.get(exam.id);
    return { ...exam,
      student_status: latest?.status === "submitted" ? "completed" : latest?.status === "in_progress" ? "in_progress" : "available",
      attempt_id: latest?.status === "in_progress" ? latest.id : null,
      last_score: latest?.status === "submitted" ? latest.score_out_of_70 : null,
    };
  });
  return Response.json({ exams }, { headers: noStoreHeaders() });
}
