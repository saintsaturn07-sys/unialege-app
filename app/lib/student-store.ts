import { requiresTradeSubject, isSeniorClass, type SeniorField, tradeSubjects } from "./subjects";

export type StudentRecord = {
  id: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  session: string;
  term: string;
  parentGuardianName: string;
  parentGuardianPhone: string;
  createdAt: string;
  status: "Active" | "Inactive";
  fieldOfStudy?: SeniorField | null;
  tradeSubject?: string | null;
};

export type StudentInput = Omit<StudentRecord, "id" | "createdAt" | "status"> & { password: string };
export type StudentSession = Pick<StudentRecord, "id" | "fullName" | "admissionNumber" | "className" | "session" | "term" | "parentGuardianName" | "parentGuardianPhone" | "fieldOfStudy" | "tradeSubject">;
export type StoreResult =
  | { ok: true; student: StudentRecord }
  | { ok: false; reason: "duplicate" | "invalid" | "missing" | "storage" | "database"; message?: string };

const STUDENT_EXTRAS_KEY = "unialege-student-extras-v1";
const STUDENT_SESSION_KEY = "unialege-student-session-v1";

export function normalizeAdmissionNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

type StudentRow = {
  id: string; created_at: string; full_name: string | null; admission_number: string | null;
  class_name: string | null; session: string | null; term: string | null;
  field_of_study?: SeniorField | null; trade_subject?: string | null;
};

type StudentExtras = Record<string, { parentGuardianName: string; parentGuardianPhone: string }>;
function readExtras(): StudentExtras {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STUDENT_EXTRAS_KEY) ?? "{}");
    return typeof value === "object" && value !== null ? value as StudentExtras : {};
  } catch { return {}; }
}

function fromRow(row: StudentRow): StudentRecord {
  const extra = readExtras()[row.id];
  return {
    id: row.id, createdAt: row.created_at, fullName: row.full_name ?? "",
    admissionNumber: normalizeAdmissionNumber(row.admission_number ?? ""),
    className: row.class_name ?? "", session: row.session ?? "", term: row.term ?? "",
    fieldOfStudy: row.field_of_study ?? null, tradeSubject: row.trade_subject ?? null,
    parentGuardianName: extra?.parentGuardianName ?? "", parentGuardianPhone: extra?.parentGuardianPhone ?? "", status: "Active",
  };
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string; student?: StudentRow; students?: StudentRow[] };
  if (!response.ok) throw new Error(body.error ?? "The server could not complete the request.");
  return body;
}

export async function getStudents(): Promise<StudentRecord[]> {
  const body = await parseResponse(await fetch("/api/admin/students", { cache: "no-store" }));
  return (body.students ?? []).map(fromRow);
}

function validInput(input: StudentInput) {
  const hasRequiredSeniorFields = !isSeniorClass(input.className) || Boolean(input.fieldOfStudy);
  const hasValidTrade = !requiresTradeSubject(input.className) || tradeSubjects.includes(input.tradeSubject ?? "");
  return Boolean(input.fullName.trim() && normalizeAdmissionNumber(input.admissionNumber) && input.className.trim() && input.session.trim() && input.term.trim() && hasRequiredSeniorFields && hasValidTrade);
}

function inputPayload(input: StudentInput) {
  return { fullName: input.fullName.trim(), admissionNumber: normalizeAdmissionNumber(input.admissionNumber), password: input.password,
    className: input.className.trim(), session: input.session.trim(), term: input.term.trim(),
    fieldOfStudy: isSeniorClass(input.className) ? input.fieldOfStudy ?? null : null,
    tradeSubject: requiresTradeSubject(input.className) ? input.tradeSubject ?? null : null,
    parentGuardianName: input.parentGuardianName.trim(), parentGuardianPhone: input.parentGuardianPhone.trim() };
}

export async function addStudent(input: StudentInput): Promise<StoreResult> {
  if (!validInput(input) || !input.password) return { ok: false, reason: "invalid" };
  try {
    const body = await parseResponse(await fetch("/api/admin/students", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(inputPayload(input)) }));
    const student = fromRow(body.student!);
    saveExtras({ ...student, parentGuardianName: input.parentGuardianName, parentGuardianPhone: input.parentGuardianPhone });
    return { ok: true, student: { ...student, parentGuardianName: input.parentGuardianName, parentGuardianPhone: input.parentGuardianPhone } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save student.";
    return { ok: false, reason: /already|duplicate/i.test(message) ? "duplicate" : /required|invalid|valid/i.test(message) ? "invalid" : "database", message };
  }
}

export async function updateStudent(id: string, input: StudentInput): Promise<StoreResult> {
  if (!validInput(input)) return { ok: false, reason: "invalid" };
  try {
    const body = await parseResponse(await fetch(`/api/admin/students/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify(inputPayload(input)) }));
    const student = fromRow(body.student!);
    saveExtras({ ...student, parentGuardianName: input.parentGuardianName, parentGuardianPhone: input.parentGuardianPhone });
    return { ok: true, student: { ...student, parentGuardianName: input.parentGuardianName, parentGuardianPhone: input.parentGuardianPhone } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update student.";
    return { ok: false, reason: /not found/i.test(message) ? "missing" : /already|duplicate/i.test(message) ? "duplicate" : "database", message };
  }
}

export async function deleteStudent(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/admin/students/${encodeURIComponent(id)}`, { method: "DELETE", cache: "no-store" });
    return response.ok;
  } catch { return false; }
}

function saveExtras(student: StudentSession) {
  try {
    const extras = readExtras();
    extras[student.id] = { parentGuardianName: student.parentGuardianName, parentGuardianPhone: student.parentGuardianPhone };
    window.localStorage.setItem(STUDENT_EXTRAS_KEY, JSON.stringify(extras));
  } catch { /* Guardian details are optional local display fields. */ }
}

export function saveStudentSession(student: StudentSession) {
  const safe = { ...student, admissionNumber: normalizeAdmissionNumber(student.admissionNumber) };
  if (safe.parentGuardianName || safe.parentGuardianPhone) saveExtras(safe);
  window.localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(safe));
}

export function getStudentSession(): StudentSession | null {
  try {
    // Remove the retired browser-side account cache, which may contain legacy
    // plaintext passwords from earlier versions. Persistent records are in Supabase.
    window.localStorage.removeItem("unialege-students-v1");
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STUDENT_SESSION_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.id !== "string" || typeof value.fullName !== "string" || typeof value.admissionNumber !== "string") return null;
    const extra = readExtras()[value.id];
    return {
      id: value.id, fullName: value.fullName, admissionNumber: value.admissionNumber,
      className: typeof value.className === "string" ? value.className : "",
      session: typeof value.session === "string" ? value.session : "", term: typeof value.term === "string" ? value.term : "",
      parentGuardianName: extra?.parentGuardianName ?? "", parentGuardianPhone: extra?.parentGuardianPhone ?? "",
      fieldOfStudy: value.fieldOfStudy === "science" || value.fieldOfStudy === "commercial" || value.fieldOfStudy === "art" ? value.fieldOfStudy : null,
      tradeSubject: typeof value.tradeSubject === "string" ? value.tradeSubject : null,
    };
  } catch { return null; }
}

export function clearStudentSession() {
  try { window.localStorage.removeItem(STUDENT_SESSION_KEY); } catch { /* Already signed out if storage is unavailable. */ }
  void fetch("/api/student/logout", { method: "POST", cache: "no-store", keepalive: true }).catch(() => {});
}
