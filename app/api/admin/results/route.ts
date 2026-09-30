import { getSubjectsForStudent } from "../../../lib/subjects";
import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

type Body = { student_id?: unknown; subject?: unknown; ca_score?: unknown; exam_score?: unknown; session?: unknown; term?: unknown; id?: unknown; is_published?: unknown; assessment_type?: unknown };
type Student = { id: string; class_name: string | null; field_of_study: "science" | "commercial" | "art" | null; trade_subject: string | null };

export async function GET(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
  if (!studentId) return Response.json({ results: [] }, { headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const [{ data, error }, { data: attempts, error: attemptError }] = await Promise.all([
    db.from("results").select("id, student_id, subject, ca_score, exam_score, session, term, is_published, ca_recorded, assessment_type").eq("student_id", studentId).order("session", { ascending: false }).order("term", { ascending: true }).order("subject", { ascending: true }),
    db.from("exam_attempts").select("subject, session, term, score_out_of_70, submitted_at").eq("student_id", studentId).eq("status", "submitted"),
  ]);
  if (error) return Response.json({ error: "Unable to load results." }, { status: 500, headers: noStoreHeaders() });
  if (attemptError) return Response.json({ error: "Unable to review completed CBT scores." }, { status: 500, headers: noStoreHeaders() });
  const results = (data ?? []).map((row) => {
    const matching = (attempts ?? []).find((attempt) => attempt.subject === row.subject && attempt.session === row.session && attempt.term === row.term && Number(attempt.score_out_of_70) === Number(row.exam_score));
    return { ...row, cbt_score: matching?.score_out_of_70 ?? null, cbt_submitted_at: matching?.submitted_at ?? null };
  });
  return Response.json({ results }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  if (!assertSameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStoreHeaders() });
  let body: Body;
  try { body = await request.json() as Body; } catch { return Response.json({ error: "Invalid result data." }, { status: 400, headers: noStoreHeaders() }); }
  const studentId = typeof body.student_id === "string" ? body.student_id : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const ca = Number(body.ca_score); const exam = Number(body.exam_score);
  const session = typeof body.session === "string" ? body.session.trim() : "";
  const term = typeof body.term === "string" ? body.term.trim() : "";
  const isPublished = body.is_published === true;
  const assessmentType = body.assessment_type === "formal" || body.assessment_type === "mock" || body.assessment_type === "unclassified" ? body.assessment_type : "";
  if (!assessmentType) return Response.json({ error: "Choose whether this result is formal, mock, or unclassified." }, { status: 400, headers: noStoreHeaders() });
  if (isPublished && assessmentType !== "formal") return Response.json({ error: "Only formal academic results can be published to student reports and rankings." }, { status: 400, headers: noStoreHeaders() });
  if (!studentId || !subject || !session || !term || !Number.isFinite(ca) || ca < 0 || ca > 30 || !Number.isFinite(exam) || exam < 0 || exam > 70) return Response.json({ error: "Enter a student, subject, valid session and term, CA from 0–30, and exam score from 0–70." }, { status: 400, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const { data: student, error: studentError } = await db.from("students").select("id, class_name, field_of_study, trade_subject").eq("id", studentId).maybeSingle();
  if (studentError) return Response.json({ error: "Unable to verify the student." }, { status: 500, headers: noStoreHeaders() });
  if (!student) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
  const profile = student as Student;
  if (!getSubjectsForStudent(profile.class_name ?? "", profile.field_of_study, profile.trade_subject).some((item) => item.name === subject)) return Response.json({ error: "Choose a subject assigned to this student." }, { status: 400, headers: noStoreHeaders() });
  const record = { student_id: studentId, subject, ca_score: ca, exam_score: exam, session, term, is_published: isPublished, ca_recorded: true, assessment_type: assessmentType };
  const id = typeof body.id === "string" ? body.id : "";
  let duplicateQuery = db.from("results").select("id").eq("student_id", studentId).eq("subject", subject).eq("session", session).eq("term", term).eq("assessment_type", assessmentType);
  if (id) duplicateQuery = duplicateQuery.neq("id", id);
  const { data: existing, error: existingError } = await duplicateQuery.limit(1);
  if (existingError) return Response.json({ error: "Unable to check for an existing result." }, { status: 500, headers: noStoreHeaders() });
  if (existing?.length) return Response.json({ error: "A result of this assessment type already exists for this subject and period. Edit the existing result instead." }, { status: 409, headers: noStoreHeaders() });
  const response = id
    ? await db.from("results").update(record).eq("id", id).eq("student_id", studentId).select("id").maybeSingle()
    : await db.from("results").insert(record).select("id").single();
  if (response.error) return Response.json({ error: "Unable to save result." }, { status: 500, headers: noStoreHeaders() });
  if (id && !response.data) return Response.json({ error: "Result not found." }, { status: 404, headers: noStoreHeaders() });
  if (!response.data) return Response.json({ error: "Result could not be saved." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ id: response.data.id }, { status: id ? 200 : 201, headers: noStoreHeaders() });
}
