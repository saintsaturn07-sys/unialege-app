import { noStoreHeaders, requireStudent } from "../../../../lib/server-session";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getSubjectsForStudent } from "../../../../lib/subjects";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Row = { student_id: string; subject: string; ca_score: number | string; exam_score: number | string };
function grade(total: number) { return total >= 75 ? "A" : total >= 65 ? "B" : total >= 55 ? "C" : total >= 45 ? "D" : total >= 40 ? "E" : "F"; }
function ordinal(value: number | null) {
  if (value === null) return "None";
  const mod100 = value % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

async function createReportPdf(input: {
  fullName: string;
  admissionNumber: string;
  className: string;
  session: string;
  term: string;
  subjects: { subject: string; total: number | "None"; grade: string; position: number | null }[];
  total: number;
  maximum: number;
  overallPosition: number | null;
}) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const navy = rgb(0.08, 0.16, 0.31);
  const blue = rgb(0.12, 0.32, 0.63);
  const pale = rgb(0.94, 0.96, 0.99);
  const muted = rgb(0.36, 0.41, 0.49);
  const ink = rgb(0.12, 0.15, 0.2);
  const white = rgb(1, 1, 1);
  const margin = 48;
  const width = pageSize[0] - margin * 2;
  const pages = [];
  let page = pdf.addPage(pageSize);
  pages.push(page);
  let cursor = 0;

  const drawPageHeading = (continued: boolean) => {
    page.drawRectangle({ x: margin, y: 788, width, height: 5, color: blue });
    page.drawText("UNIALEGE SCHOOL", { x: margin, y: 752, size: 19, font: bold, color: navy });
    page.drawText(continued ? "STUDENT REPORT CARD · CONTINUED" : "STUDENT REPORT CARD", { x: margin, y: 731, size: 9, font: bold, color: blue });
    page.drawText("ACADEMIC PERFORMANCE", { x: pageSize[0] - margin - 134, y: 752, size: 8, font: bold, color: muted });
    cursor = 710;
  };

  const drawTableHeading = () => {
    const height = 27;
    const y = cursor - height;
    page.drawRectangle({ x: margin, y, width, height, color: navy });
    page.drawText("Subject", { x: margin + 12, y: y + 9, size: 9, font: bold, color: white });
    page.drawText("Score", { x: 344, y: y + 9, size: 9, font: bold, color: white });
    page.drawText("Position", { x: 416, y: y + 9, size: 9, font: bold, color: white });
    page.drawText("Grade", { x: 500, y: y + 9, size: 9, font: bold, color: white });
    cursor = y;
  };

  const drawFooter = (current: number) => {
    page.drawLine({ start: { x: margin, y: 42 }, end: { x: pageSize[0] - margin, y: 42 }, thickness: 0.6, color: pale });
    page.drawText("UniAllege School · Student Report", { x: margin, y: 27, size: 8, font: regular, color: muted });
    page.drawText(`Page ${current}`, { x: pageSize[0] - margin - 42, y: 27, size: 8, font: regular, color: muted });
  };

  drawPageHeading(false);
  const infoY = cursor - 96;
  page.drawRectangle({ x: margin, y: infoY, width, height: 84, color: pale, borderColor: rgb(0.87, 0.9, 0.94), borderWidth: 0.7 });
  const drawInfo = (label: string, value: string, x: number, y: number, valueWidth: number) => {
    page.drawText(label.toUpperCase(), { x, y, size: 7, font: bold, color: muted });
    const safeValue = value || "None";
    let size = 10;
    while (bold.widthOfTextAtSize(safeValue, size) > valueWidth && size > 7) size -= 0.5;
    page.drawText(safeValue, { x, y: y - 16, size, font: bold, color: ink, maxWidth: valueWidth });
  };
  drawInfo("Student", input.fullName, margin + 13, cursor - 25, 240);
  drawInfo("Admission Number", input.admissionNumber, 345, cursor - 25, 150);
  drawInfo("Class", input.className, margin + 13, cursor - 63, 145);
  drawInfo("Session", input.session, 220, cursor - 63, 135);
  drawInfo("Term", input.term, 390, cursor - 63, 130);
  cursor = infoY - 22;
  drawTableHeading();

  for (const [index, row] of input.subjects.entries()) {
    const rowHeight = 25;
    if (cursor - rowHeight < 76) {
      drawFooter(pages.length);
      page = pdf.addPage(pageSize);
      pages.push(page);
      drawPageHeading(true);
      drawTableHeading();
    }
    const y = cursor - rowHeight;
    if (index % 2 === 0) page.drawRectangle({ x: margin, y, width, height: rowHeight, color: rgb(0.975, 0.98, 0.99) });
    page.drawLine({ start: { x: margin, y }, end: { x: pageSize[0] - margin, y }, thickness: 0.4, color: pale });
    page.drawText(row.subject, { x: margin + 12, y: y + 8, size: 9, font: regular, color: ink, maxWidth: 270 });
    page.drawText(row.total === "None" ? "None" : `${row.total} / 100`, { x: 344, y: y + 8, size: 9, font: regular, color: ink });
    page.drawText(ordinal(row.position), { x: 416, y: y + 8, size: 9, font: regular, color: ink });
    page.drawText(row.grade, { x: 500, y: y + 8, size: 9, font: bold, color: row.grade === "None" ? muted : blue });
    cursor = y;
  }

  const summaryHeight = 78;
  if (cursor - summaryHeight < 76) {
    drawFooter(pages.length);
    page = pdf.addPage(pageSize);
    pages.push(page);
    drawPageHeading(true);
  }
  const summaryY = cursor - summaryHeight;
  page.drawRectangle({ x: margin, y: summaryY, width, height: summaryHeight, color: pale, borderColor: rgb(0.87, 0.9, 0.94), borderWidth: 0.7 });
  page.drawText("TOTAL MARKS", { x: margin + 13, y: summaryY + 55, size: 7, font: bold, color: muted });
  page.drawText(input.maximum ? `${input.total} / ${input.maximum}` : "None", { x: margin + 13, y: summaryY + 35, size: 12, font: bold, color: navy });
  page.drawText("AVERAGE / PERCENTAGE", { x: 235, y: summaryY + 55, size: 7, font: bold, color: muted });
  page.drawText(input.maximum ? `${(input.total / input.maximum * 100).toFixed(2)}%` : "None", { x: 235, y: summaryY + 35, size: 12, font: bold, color: navy });
  page.drawText("OVERALL POSITION", { x: 423, y: summaryY + 55, size: 7, font: bold, color: muted });
  page.drawText(ordinal(input.overallPosition), { x: 423, y: summaryY + 35, size: 12, font: bold, color: navy });
  for (const [index, reportPage] of pages.entries()) {
    page = reportPage;
    drawFooter(index + 1);
  }
  return pdf.save();
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
  const validOwnBySubject = new Map((valid.get(student.id) ?? []).map((row) => [row.subject, row]));
  const applicableSubjects = getSubjectsForStudent(student.class_name ?? "", student.field_of_study, student.trade_subject);
  const subjects: { subject: string; ca: number | "None"; exam: number | "None"; total: number | "None"; grade: string; position: number | null }[] = applicableSubjects.map(({ name: subject }) => {
    const ownSubjectRows = ownGroups.get(subject) ?? [];
    const row = ownSubjectRows.length === 1 ? validOwnBySubject.get(subject) : undefined;
    if (!row) return { subject, ca: "None", exam: "None", total: "None", grade: "None", position: null as number | null };
    const ca = Number(row.ca_score); const exam = Number(row.exam_score); const total = ca + exam;
    const classmates = [...valid.values()].map((scores) => scores.find((entry) => entry.subject === subject)).filter((entry): entry is Row => Boolean(entry));
    const position = classmates.length >= 2 ? 1 + classmates.filter((entry) => Number(entry.ca_score) + Number(entry.exam_score) > total).length : null;
    return { subject, ca, exam, total, grade: grade(total), position };
  });
  const ownRows = (valid.get(student.id) ?? []).filter((row) => applicableSubjects.some(({ name }) => name === row.subject));
  const total = ownRows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0);
  const maximum = ownRows.length * 100;
  const eligible = [...valid.entries()].filter(([, rows]) => rows.length >= 3).map(([id, rows]) => ({ id, avg: rows.reduce((sum, row) => sum + Number(row.ca_score) + Number(row.exam_score), 0) / (rows.length * 100) }));
  const own = eligible.find((entry) => entry.id === student.id);
  const overallPosition = own && eligible.length >= 2 ? 1 + eligible.filter((entry) => entry.avg > own.avg).length : null;
  const pdfBytes = await createReportPdf({
    fullName: student.full_name ?? "",
    admissionNumber: student.admission_number ?? "",
    className: student.class_name ?? "",
    session,
    term,
    subjects: subjects.map((row) => ({ subject: row.subject, total: row.total, grade: row.grade, position: row.position })),
    total,
    maximum,
    overallPosition,
  });
  const body = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(body).set(pdfBytes);
  const safeName = String(student.admission_number ?? "student").replace(/[^a-z0-9_-]/gi, "_");
  return new Response(body, { headers: { ...noStoreHeaders(), "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="unialege-report-${safeName}-${term.toLowerCase().replaceAll(" ", "-")}.pdf"` } });
}
