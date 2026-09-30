import { noStoreHeaders, requireStudent } from "../../../lib/server-session";
import { getSupabaseAdmin } from "../../../lib/supabase-admin";

export async function GET(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const url = new URL(request.url);
  const session = url.searchParams.get("session") ?? "";
  const term = url.searchParams.get("term") ?? "";
  if (!session || !term) return Response.json({ error: "Choose a session and term." }, { status: 400, headers: noStoreHeaders() });

  const db = getSupabaseAdmin();
  const { data: ownResults, error: ownError } = await db.from("results")
    .select("id, student_id, subject, ca_score, exam_score, ca_recorded")
    .eq("student_id", student.id).eq("session", session).eq("term", term).eq("is_published", true).eq("ca_recorded", true).eq("assessment_type", "formal")
    .order("subject", { ascending: true });
  if (ownError) return Response.json({ error: "Unable to load results." }, { status: 500, headers: noStoreHeaders() });

  const { data: periodRows, error: periodsError } = await db.from("results")
    .select("session")
    .eq("student_id", student.id).eq("is_published", true).eq("ca_recorded", true).eq("assessment_type", "formal");
  if (periodsError) return Response.json({ error: "Unable to load available result periods." }, { status: 500, headers: noStoreHeaders() });
  const availableSessions = [...new Set((periodRows ?? []).map((row) => row.session).filter((value): value is string => typeof value === "string" && value.length > 0))].sort().reverse();

  const { data: classStudents, error: studentsError } = student.class_name
    ? await db.from("students").select("id").eq("class_name", student.class_name).eq("is_active", true)
    : { data: [], error: null };
  if (studentsError) return Response.json({ error: "Unable to calculate class results." }, { status: 500, headers: noStoreHeaders() });
  const classIds = (classStudents ?? []).map((row) => row.id);
  if (!classIds.includes(student.id)) classIds.push(student.id);
  const { data: cohortResults, error: cohortError } = await db.from("results")
    .select("id, student_id, subject, ca_score, exam_score, ca_recorded")
    .in("student_id", classIds).eq("session", session).eq("term", term).eq("is_published", true).eq("ca_recorded", true).eq("assessment_type", "formal");
  if (cohortError) return Response.json({ error: "Unable to calculate class results." }, { status: 500, headers: noStoreHeaders() });

  type ScoreRow = { id?: string; student_id: string; subject: string; ca_score: number | string; exam_score: number | string };
  const grouped = new Map<string, ScoreRow[]>();
  for (const row of (cohortResults ?? []) as ScoreRow[]) {
    const key = `${row.student_id}\u0000${row.subject}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  const validByStudent = new Map<string, ScoreRow[]>();
  for (const rows of grouped.values()) {
    if (rows.length !== 1) continue;
    const row = rows[0];
    const ca = Number(row.ca_score); const exam = Number(row.exam_score);
    if (!Number.isFinite(ca) || ca < 0 || ca > 30 || !Number.isFinite(exam) || exam < 0 || exam > 70) continue;
    validByStudent.set(row.student_id, [...(validByStudent.get(row.student_id) ?? []), row]);
  }

  const ownGrouped = new Map<string, ScoreRow[]>();
  for (const row of (ownResults ?? []) as ScoreRow[]) {
    ownGrouped.set(row.subject, [...(ownGrouped.get(row.subject) ?? []), row]);
  }
  const results = [...ownGrouped.entries()].map(([subject, rows]) => {
    const unique = rows.length === 1 ? rows[0] : null;
    const total = unique ? Number(unique.ca_score) + Number(unique.exam_score) : null;
    const classmates = [...validByStudent.entries()]
      .filter(([, entries]) => entries.some((entry) => entry.subject === subject))
      .map(([id, entries]) => ({ id, total: Number(entries.find((entry) => entry.subject === subject)!.ca_score) + Number(entries.find((entry) => entry.subject === subject)!.exam_score) }));
    const subjectPosition = total !== null && classmates.length >= 2
      ? 1 + classmates.filter((entry) => entry.total > total).length
      : null;
    return {
      id: unique?.id ?? rows[0]?.id ?? subject,
      subject, ca_score: unique?.ca_score ?? null, exam_score: unique?.exam_score ?? null,
      total, subject_position: subjectPosition,
    };
  }).sort((a, b) => a.subject.localeCompare(b.subject));

  const overall = [...validByStudent.entries()]
    .filter(([, rows]) => rows.length >= 3)
    .map(([id, rows]) => ({ id, total: rows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0), possible: rows.length * 100, subjects: rows.length }));
  const ownOverall = overall.find((row) => row.id === student.id);
  const ownRows = validByStudent.get(student.id) ?? [];
  const ownTotal = ownRows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0);
  const ownPossible = ownRows.length * 100;
  const classPosition = ownOverall && overall.length >= 2
    ? 1 + overall.filter((row) => row.total / row.possible > ownOverall.total / ownOverall.possible).length
    : null;

  return Response.json({
    results,
    available_sessions: availableSessions,
    summary: {
      total_marks: ownRows.length ? ownTotal : null,
      maximum_marks: ownRows.length ? ownPossible : null,
      percentage: ownRows.length ? (ownTotal / ownPossible) * 100 : null,
      average_subjects: ownRows.length,
      class_position: classPosition,
      minimum_subjects_for_position: 3,
    },
  }, { headers: noStoreHeaders() });
}
