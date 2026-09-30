import { noStoreHeaders, requireStudent } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Row = { student_id: string; subject: string; ca_score: number | string; exam_score: number | string };
function grade(total: number) { return total >= 75 ? "A" : total >= 65 ? "B" : total >= 55 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F"; }
function csv(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+@\-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const student = await requireStudent();
  if (!student) return Response.json({ error: "Student sign-in required." }, { status: 401, headers: noStoreHeaders() });
  const params = new URL(request.url).searchParams;
  const session = params.get("session") ?? ""; const term = params.get("term") ?? "";
  if (!session || !term || session.length > 20 || !["First Term", "Second Term", "Third Term"].includes(term)) return Response.json({ error: "Choose a valid session and term." }, { status: 400, headers: noStoreHeaders() });
  const db = getSupabaseAdmin();
  const { data: ownRaw, error: ownError } = await db.from("results").select("id, student_id, subject, ca_score, exam_score")
    .eq("student_id", student.id).eq("session", session).eq("term", term).eq("is_published", true).eq("ca_recorded", true).eq("assessment_type", "formal").order("subject");
  if (ownError) return Response.json({ error: "Unable to load your report." }, { status: 500, headers: noStoreHeaders() });
  const { data: classStudents, error: classError } = await db.from("students").select("id").eq("class_name", student.class_name ?? "").eq("is_active", true);
  if (classError) return Response.json({ error: "Unable to calculate your report positions." }, { status: 500, headers: noStoreHeaders() });
  const classIds = (classStudents ?? []).map((row) => row.id);
  if (!classIds.includes(student.id)) classIds.push(student.id);
  const { data: cohort, error: cohortError } = await db.from("results").select("student_id, subject, ca_score, exam_score")
    .in("student_id", classIds).eq("session", session).eq("term", term).eq("is_published", true).eq("ca_recorded", true).eq("assessment_type", "formal");
  if (cohortError) return Response.json({ error: "Unable to calculate your report positions." }, { status: 500, headers: noStoreHeaders() });

  const groups = new Map<string, Row[]>();
  for (const row of (cohort ?? []) as Row[]) { const key = `${row.student_id}\0${row.subject}`; groups.set(key, [...(groups.get(key) ?? []), row]); }
  const valid = new Map<string, Row[]>();
  for (const rows of groups.values()) {
    if (rows.length !== 1) continue;
    const ca = Number(rows[0].ca_score); const exam = Number(rows[0].exam_score);
    if (Number.isFinite(ca) && ca >= 0 && ca <= 30 && Number.isFinite(exam) && exam >= 0 && exam <= 70) valid.set(rows[0].student_id, [...(valid.get(rows[0].student_id) ?? []), rows[0]]);
  }
  const ownGroups = new Map<string, Row[]>();
  for (const row of (ownRaw ?? []) as Row[]) ownGroups.set(row.subject, [...(ownGroups.get(row.subject) ?? []), row]);
  const subjects = [...ownGroups.entries()].flatMap(([subject, rows]) => {
    if (rows.length !== 1) return [];
    const row = rows[0]; const ca = Number(row.ca_score); const exam = Number(row.exam_score); const total = ca + exam;
    const classmates = [...valid.values()].map((scores) => scores.find((entry) => entry.subject === subject)).filter((entry): entry is Row => Boolean(entry));
    const position = classmates.length >= 2 ? 1 + classmates.filter((entry) => Number(entry.ca_score) + Number(entry.exam_score) > total).length : null;
    return [{ subject, ca, exam, total, grade: grade(total), position }];
  });
  const ownRows = valid.get(student.id) ?? [];
  const total = ownRows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0);
  const maximum = ownRows.length * 100;
  const eligible = [...valid.entries()].filter(([, rows]) => rows.length >= 3).map(([id, rows]) => ({ id, avg: rows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0) / (rows.length * 100) }));
  const own = eligible.find((entry) => entry.id === student.id);
  const overallPosition = own && eligible.length >= 2 ? 1 + eligible.filter((entry) => entry.avg > own.avg).length : null;
  const lines = [
    ["UniAllege School Report", ""], ["Student", student.full_name], ["Admission Number", student.admission_number], ["Class", student.class_name], ["Session", session], ["Term", term], ["", ""],
    ["Subject", "CA / 30", "Exam / 70", "Total / 100", "Grade", "Subject Position"],
    ...subjects.map((row) => [row.subject, row.ca, row.exam, row.total, row.grade, row.position ?? "Not available"]),
    ["", ""], ["Total Marks", maximum ? `${total} / ${maximum}` : "Not available"], ["Overall Percentage / Average", maximum ? `${(total / maximum * 100).toFixed(2)}%` : "Not available"], ["Overall Class Position", overallPosition ?? "Not available"],
    ["Teacher Comment", "Not available in the current results data"], ["Principal Comment", "Not available in the current results data"],
  ];
  const body = `\uFEFF${lines.map((line) => line.map(csv).join(",")).join("\r\n")}`;
  const safeName = String(student.admission_number ?? "student").replace(/[^a-z0-9_-]/gi, "_");
  return new Response(body, { headers: { ...noStoreHeaders(), "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="unialege-report-${safeName}-${term.toLowerCase().replaceAll(" ", "-")}.csv"` } });
}
