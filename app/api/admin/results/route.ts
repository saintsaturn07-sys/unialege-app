import { getSubjectsForStudent } from "../../../lib/subjects";
import { assertSameOrigin, noStoreHeaders, requireAdmin } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

type Body = { student_id?: unknown; subject?: unknown; ca_score?: unknown; exam_score?: unknown; session?: unknown; term?: unknown; id?: unknown };
type Student = { id: string; class_name: string | null; field_of_study: "science" | "commercial" | "art" | null; trade_subject: string | null };

export async function GET(request: Request) {
  if (!await requireAdmin()) return Response.json({ error: "Administrator sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const studentId = new URL(request.url).searchParams.get("studentId") ?? "";
  if (!studentId) return Response.json({ results: [] }, { headers: noStoreHeaders() });
  const { data, error } = await getSupabaseAdmin().from("results").select("id, student_id, subject, ca_score, exam_score, session, term").eq("student_id", studentId).order("session", { ascending: false }).order("term", { ascending: true }).order("subject", { ascending: true });
  if (error) return Response.json({ error: "Unable to load results." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ results: data ?? [] }, { headers: noStoreHeaders() });
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
  if (!studentId || !subject || !session || !term || !Number.isFinite(ca) || ca < 0 || ca > 30 || !Number.isFinite(exam) || exam < 0 || exam > 70) return Response.json({ error: "Enter a student, subject, valid session and term, CA from 0–30, and exam score from 0–70." }, { status: 400, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const { data: student, error: studentError } = await db.from("students").select("id, class_name, field_of_study, trade_subject").eq("id", studentId).maybeSingle();
  if (studentError) return Response.json({ error: "Unable to verify the student." }, { status: 500, headers: noStoreHeaders() });
  if (!student) return Response.json({ error: "Student not found." }, { status: 404, headers: noStoreHeaders() });
  const profile = student as Student;
  if (!getSubjectsForStudent(profile.class_name ?? "", profile.field_of_study, profile.trade_subject).some((item) => item.name === subject)) return Response.json({ error: "Choose a subject assigned to this student." }, { status: 400, headers: noStoreHeaders() });
  const record = { student_id: studentId, subject, ca_score: ca, exam_score: exam, session, term };
  const id = typeof body.id === "string" ? body.id : "";
  const response = id
    ? await db.from("results").update(record).eq("id", id).eq("student_id", studentId).select("id").maybeSingle()
    : await db.from("results").insert(record).select("id").single();
  if (response.error) return Response.json({ error: "Unable to save result." }, { status: 500, headers: noStoreHeaders() });
  if (id && !response.data) return Response.json({ error: "Result not found." }, { status: 404, headers: noStoreHeaders() });
  if (!response.data) return Response.json({ error: "Result could not be saved." }, { status: 500, headers: noStoreHeaders() });
  return Response.json({ id: response.data.id }, { status: id ? 200 : 201, headers: noStoreHeaders() });
}
