import { supabase } from "./supabase";
import { requiresTradeSubject, isSeniorClass, type SeniorField, tradeSubjects } from "./subjects";

export type StudentRecord = {
  id: string;
  fullName: string;
  admissionNumber: string;
  password: string;
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

export type StudentInput = Omit<StudentRecord, "id" | "createdAt" | "status">;
export type StudentSession = Pick<StudentRecord, "id" | "fullName" | "admissionNumber" | "className" | "session" | "term" | "parentGuardianName" | "parentGuardianPhone" | "fieldOfStudy" | "tradeSubject">;

export type StoreResult =
  | { ok: true; student: StudentRecord }
  | { ok: false; reason: "duplicate" | "invalid" | "missing" | "storage" | "database"; message?: string };

type StudentRow = {
  id: string;
  created_at: string;
  full_name: string;
  admission_number: string;
  password: string;
  class_name: string;
  session: string;
  term: string;
  field_of_study?: SeniorField | null;
  trade_subject?: string | null;
};

const STUDENTS_KEY = "unialege-students-v1";
const STUDENT_EXTRAS_KEY = "unialege-student-extras-v1";
const STUDENT_SESSION_KEY = "unialege-student-session-v1";

export function normalizeAdmissionNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function isStudentRecord(value: unknown): value is StudentRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.fullName === "string" &&
    typeof record.admissionNumber === "string" && typeof record.password === "string" &&
    typeof record.className === "string" && typeof record.session === "string" &&
    typeof record.term === "string" && typeof record.parentGuardianName === "string" &&
    typeof record.parentGuardianPhone === "string" && typeof record.createdAt === "string" &&
    (record.status === "Active" || record.status === "Inactive");
}

function readLocalStudents(): StudentRecord[] {
  try {
    window.localStorage.removeItem("unialege-demo-account");
    window.localStorage.removeItem("unialege-demo-session");
    const raw = window.localStorage.getItem(STUDENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isStudentRecord)) return [];
    return parsed.map((student) => ({ ...student, admissionNumber: normalizeAdmissionNumber(student.admissionNumber) }));
  } catch {
    return [];
  }
}

function writeLocalStudents(students: StudentRecord[]) {
  window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

type StudentExtras = Record<string, { parentGuardianName: string; parentGuardianPhone: string }>;

function readExtras(): StudentExtras {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STUDENT_EXTRAS_KEY) ?? "{}");
    return typeof value === "object" && value !== null ? value as StudentExtras : {};
  } catch {
    return {};
  }
}

function saveExtras(student: StudentRecord) {
  try {
    const extras = readExtras();
    extras[student.id] = { parentGuardianName: student.parentGuardianName, parentGuardianPhone: student.parentGuardianPhone };
    window.localStorage.setItem(STUDENT_EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    // Parent/guardian fields are not part of the current Supabase schema.
  }
}

function fromRow(row: StudentRow): StudentRecord {
  const extra = readExtras()[row.id];
  return {
    id: row.id,
    createdAt: row.created_at,
    fullName: row.full_name,
    admissionNumber: normalizeAdmissionNumber(row.admission_number),
    password: row.password,
    className: row.class_name,
    fieldOfStudy: row.field_of_study ?? null,
    tradeSubject: row.trade_subject ?? null,
    session: row.session,
    term: row.term,
    parentGuardianName: extra?.parentGuardianName ?? "",
    parentGuardianPhone: extra?.parentGuardianPhone ?? "",
    status: "Active",
  };
}

function toRowInput(input: StudentInput) {
  return {
    full_name: input.fullName.trim(),
    admission_number: normalizeAdmissionNumber(input.admissionNumber),
    password: input.password,
    class_name: input.className.trim(),
    session: input.session.trim(),
    term: input.term.trim(),
    field_of_study: input.fieldOfStudy ?? null,
    trade_subject: input.tradeSubject ?? null,
  };
}

function validInput(input: StudentInput) {
  const hasRequiredSeniorFields = !isSeniorClass(input.className) || Boolean(input.fieldOfStudy);
  const hasValidTrade = !requiresTradeSubject(input.className) || tradeSubjects.includes(input.tradeSubject ?? "");
  return Boolean(input.fullName.trim() && normalizeAdmissionNumber(input.admissionNumber) && input.password && input.className.trim() && input.session.trim() && input.term.trim() && input.parentGuardianName.trim() && input.parentGuardianPhone.trim() && hasRequiredSeniorFields && hasValidTrade);
}

function cleanInput(input: StudentInput): StudentInput {
  const className = input.className.trim();
  return { ...input, fullName: input.fullName.trim(), admissionNumber: normalizeAdmissionNumber(input.admissionNumber), className, session: input.session.trim(), term: input.term.trim(), parentGuardianName: input.parentGuardianName.trim(), parentGuardianPhone: input.parentGuardianPhone.trim(), fieldOfStudy: isSeniorClass(className) ? input.fieldOfStudy ?? null : null, tradeSubject: requiresTradeSubject(className) ? input.tradeSubject ?? null : null };
}

function databaseError(message: string): StoreResult {
  return { ok: false, reason: "database", message };
}

export async function getStudents(): Promise<StudentRecord[]> {
  if (!supabase) return readLocalStudents();
  const { data, error } = await supabase.from("students").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as StudentRow[]).map(fromRow);
}

export async function findStudentByAdmissionNumber(admissionNumber: string): Promise<StudentRecord | null> {
  const normalized = normalizeAdmissionNumber(admissionNumber);
  if (!supabase) return readLocalStudents().find((student) => student.admissionNumber === normalized) ?? null;
  const { data, error } = await supabase.from("students").select("*").eq("admission_number", normalized).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as StudentRow) : null;
}

export async function addStudent(input: StudentInput): Promise<StoreResult> {
  if (!validInput(input)) return { ok: false, reason: "invalid" };
  const cleaned = cleanInput(input);
  if (!supabase) {
    const students = readLocalStudents();
    if (students.some((student) => student.admissionNumber === cleaned.admissionNumber)) return { ok: false, reason: "duplicate" };
    const student: StudentRecord = { ...cleaned, id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${cleaned.admissionNumber}`, createdAt: new Date().toISOString(), status: "Active" };
    try { writeLocalStudents([student, ...students]); return { ok: true, student }; } catch { return { ok: false, reason: "storage" }; }
  }

  const duplicate = await supabase.from("students").select("id").eq("admission_number", cleaned.admissionNumber).maybeSingle();
  if (duplicate.error) return databaseError(duplicate.error.message);
  if (duplicate.data) return { ok: false, reason: "duplicate" };
  const { data, error } = await supabase.from("students").insert(toRowInput(cleaned)).select("*").single();
  if (error) return databaseError(error.message);
  const student = fromRow(data as StudentRow);
  saveExtras(student);
  return { ok: true, student: { ...student, parentGuardianName: cleaned.parentGuardianName, parentGuardianPhone: cleaned.parentGuardianPhone } };
}

export async function updateStudent(id: string, input: StudentInput): Promise<StoreResult> {
  if (!validInput(input)) return { ok: false, reason: "invalid" };
  const cleaned = cleanInput(input);
  if (!supabase) {
    const students = readLocalStudents();
    const existing = students.find((student) => student.id === id);
    if (!existing) return { ok: false, reason: "missing" };
    if (students.some((student) => student.id !== id && student.admissionNumber === cleaned.admissionNumber)) return { ok: false, reason: "duplicate" };
    const updated = { ...existing, ...cleaned };
    try { writeLocalStudents(students.map((student) => student.id === id ? updated : student)); return { ok: true, student: updated }; } catch { return { ok: false, reason: "storage" }; }
  }

  const duplicate = await supabase.from("students").select("id").eq("admission_number", cleaned.admissionNumber).neq("id", id).maybeSingle();
  if (duplicate.error) return databaseError(duplicate.error.message);
  if (duplicate.data) return { ok: false, reason: "duplicate" };
  const { data, error } = await supabase.from("students").update(toRowInput(cleaned)).eq("id", id).select("*").maybeSingle();
  if (error) return databaseError(error.message);
  if (!data) return { ok: false, reason: "missing" };
  const student = { ...fromRow(data as StudentRow), parentGuardianName: cleaned.parentGuardianName, parentGuardianPhone: cleaned.parentGuardianPhone };
  saveExtras(student);
  return { ok: true, student };
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (!supabase) {
    const students = readLocalStudents();
    const next = students.filter((student) => student.id !== id);
    if (next.length === students.length) return false;
    try { writeLocalStudents(next); if (readStudentSessionId() === id) clearStudentSession(); return true; } catch { return false; }
  }
  const { data, error } = await supabase.from("students").delete().eq("id", id).select("id").maybeSingle();
  if (error || !data) return false;
  if (readStudentSessionId() === id) clearStudentSession();
  const extras = readExtras();
  delete extras[id];
  try { window.localStorage.setItem(STUDENT_EXTRAS_KEY, JSON.stringify(extras)); } catch { /* Optional local-only fields. */ }
  return true;
}

function readStudentSessionId(): string | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STUDENT_SESSION_KEY) ?? "null");
    if (typeof parsed === "object" && parsed !== null && "studentId" in parsed && typeof parsed.studentId === "string") return parsed.studentId;
    if (typeof parsed === "object" && parsed !== null && "id" in parsed && typeof parsed.id === "string") return parsed.id;
  } catch { /* Treat invalid session data as signed out. */ }
  return null;
}

export function saveStudentSession(student: StudentRecord) {
  const { id, fullName, admissionNumber, className, session, term, parentGuardianName, parentGuardianPhone, fieldOfStudy, tradeSubject } = student;
  window.localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({ id, fullName, admissionNumber, className, session, term, parentGuardianName, parentGuardianPhone, fieldOfStudy, tradeSubject } satisfies StudentSession));
}

export function getStudentSession(): StudentSession | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STUDENT_SESSION_KEY) ?? "null");
    if (typeof parsed === "object" && parsed !== null && "fullName" in parsed && "admissionNumber" in parsed && "id" in parsed && typeof parsed.fullName === "string" && typeof parsed.admissionNumber === "string" && typeof parsed.id === "string") {
      const snapshot = parsed as Record<string, unknown>;
      return { id: snapshot.id as string, fullName: snapshot.fullName as string, admissionNumber: snapshot.admissionNumber as string, className: typeof snapshot.className === "string" ? snapshot.className : "", session: typeof snapshot.session === "string" ? snapshot.session : "", term: typeof snapshot.term === "string" ? snapshot.term : "", parentGuardianName: typeof snapshot.parentGuardianName === "string" ? snapshot.parentGuardianName : "", parentGuardianPhone: typeof snapshot.parentGuardianPhone === "string" ? snapshot.parentGuardianPhone : "", fieldOfStudy: snapshot.fieldOfStudy === "science" || snapshot.fieldOfStudy === "commercial" || snapshot.fieldOfStudy === "art" ? snapshot.fieldOfStudy : null, tradeSubject: typeof snapshot.tradeSubject === "string" ? snapshot.tradeSubject : null };
    }
    // Migrate the earlier id-only browser session while local fallback data exists.
    const id = readStudentSessionId();
    const legacyStudent = id ? readLocalStudents().find((student) => student.id === id) : null;
    if (!legacyStudent || legacyStudent.status !== "Active") { clearStudentSession(); return null; }
    saveStudentSession(legacyStudent);
    return getStudentSession();
  } catch {
    clearStudentSession();
    return null;
  }
}

export function clearStudentSession() {
  try { window.localStorage.removeItem(STUDENT_SESSION_KEY); } catch { /* Already signed out if storage is unavailable. */ }
}
