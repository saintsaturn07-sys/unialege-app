/**
 * Temporary browser-backed student store for local demos.
 * TODO: Replace this adapter with server-side database/auth persistence before
 * using student accounts across devices or deploying as a real school system.
 */
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
};

export type StudentInput = Omit<StudentRecord, "id" | "createdAt" | "status">;

export type StudentSession = Pick<
  StudentRecord,
  | "id"
  | "fullName"
  | "admissionNumber"
  | "className"
  | "session"
  | "term"
  | "parentGuardianName"
  | "parentGuardianPhone"
>;

type StoreResult =
  | { ok: true; student: StudentRecord }
  | { ok: false; reason: "duplicate" | "invalid" | "missing" | "storage" };

const STUDENTS_KEY = "unialege-students-v1";
const STUDENT_SESSION_KEY = "unialege-student-session-v1";

export function normalizeAdmissionNumber(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function isStudentRecord(value: unknown): value is StudentRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.fullName === "string" &&
    typeof record.admissionNumber === "string" &&
    typeof record.password === "string" &&
    typeof record.className === "string" &&
    typeof record.session === "string" &&
    typeof record.term === "string" &&
    typeof record.parentGuardianName === "string" &&
    typeof record.parentGuardianPhone === "string" &&
    typeof record.createdAt === "string" &&
    (record.status === "Active" || record.status === "Inactive")
  );
}

function readStudents(): StudentRecord[] {
  try {
    // Discard the retired single demo account/session from the earlier prototype.
    window.localStorage.removeItem("unialege-demo-account");
    window.localStorage.removeItem("unialege-demo-session");

    const raw = window.localStorage.getItem(STUDENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isStudentRecord)) {
      window.localStorage.setItem(STUDENTS_KEY, "[]");
      window.localStorage.removeItem(STUDENT_SESSION_KEY);
      return [];
    }
    return parsed.map((student) => ({
      ...student,
      admissionNumber: normalizeAdmissionNumber(student.admissionNumber),
    }));
  } catch {
    try {
      window.localStorage.setItem(STUDENTS_KEY, "[]");
      window.localStorage.removeItem(STUDENT_SESSION_KEY);
    } catch {
      // Storage is unavailable; return a safe empty state to the UI.
    }
    return [];
  }
}

function writeStudents(students: StudentRecord[]) {
  window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

export function getStudents() {
  return readStudents();
}

export function findStudentByAdmissionNumber(admissionNumber: string) {
  const normalized = normalizeAdmissionNumber(admissionNumber);
  return readStudents().find((student) => student.admissionNumber === normalized) ?? null;
}

function validInput(input: StudentInput) {
  return Boolean(
    input.fullName.trim() &&
    normalizeAdmissionNumber(input.admissionNumber) &&
    input.password &&
    input.className.trim() &&
    input.session.trim() &&
    input.term.trim() &&
    input.parentGuardianName.trim() &&
    input.parentGuardianPhone.trim()
  );
}

export function addStudent(input: StudentInput): StoreResult {
  if (!validInput(input)) return { ok: false, reason: "invalid" };

  const students = readStudents();
  const admissionNumber = normalizeAdmissionNumber(input.admissionNumber);
  if (students.some((student) => student.admissionNumber === admissionNumber)) {
    return { ok: false, reason: "duplicate" };
  }

  const student: StudentRecord = {
    ...input,
    fullName: input.fullName.trim(),
    admissionNumber,
    className: input.className.trim(),
    session: input.session.trim(),
    term: input.term.trim(),
    parentGuardianName: input.parentGuardianName.trim(),
    parentGuardianPhone: input.parentGuardianPhone.trim(),
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${admissionNumber}`,
    createdAt: new Date().toISOString(),
    status: "Active",
  };

  try {
    writeStudents([student, ...students]);
    return { ok: true, student };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export function updateStudent(id: string, input: StudentInput): StoreResult {
  if (!validInput(input)) return { ok: false, reason: "invalid" };
  const students = readStudents();
  const existing = students.find((student) => student.id === id);
  if (!existing) return { ok: false, reason: "missing" };

  const admissionNumber = normalizeAdmissionNumber(input.admissionNumber);
  if (students.some((student) => student.id !== id && student.admissionNumber === admissionNumber)) {
    return { ok: false, reason: "duplicate" };
  }

  const updated: StudentRecord = {
    ...existing,
    ...input,
    fullName: input.fullName.trim(),
    admissionNumber,
    className: input.className.trim(),
    session: input.session.trim(),
    term: input.term.trim(),
    parentGuardianName: input.parentGuardianName.trim(),
    parentGuardianPhone: input.parentGuardianPhone.trim(),
  };

  try {
    writeStudents(students.map((student) => student.id === id ? updated : student));
    return { ok: true, student: updated };
  } catch {
    return { ok: false, reason: "storage" };
  }
}

export function deleteStudent(id: string) {
  const students = readStudents();
  const next = students.filter((student) => student.id !== id);
  if (next.length === students.length) return false;
  try {
    writeStudents(next);
    const session = readStudentSessionId();
    if (session === id) window.localStorage.removeItem(STUDENT_SESSION_KEY);
    return true;
  } catch {
    return false;
  }
}

function readStudentSessionId(): string | null {
  try {
    const raw = window.localStorage.getItem(STUDENT_SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "studentId" in parsed && typeof parsed.studentId === "string") return parsed.studentId;
  } catch {
    try {
      window.localStorage.removeItem(STUDENT_SESSION_KEY);
    } catch {
      // Ignore inaccessible storage and treat it as signed out.
    }
  }
  return null;
}

export function saveStudentSession(student: StudentRecord) {
  window.localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify({ studentId: student.id }));
}

export function getStudentSession(): StudentSession | null {
  const studentId = readStudentSessionId();
  if (!studentId) return null;
  const student = readStudents().find((item) => item.id === studentId);
  if (!student || student.status !== "Active") {
    clearStudentSession();
    return null;
  }
  const { id, fullName, admissionNumber, className, session, term, parentGuardianName, parentGuardianPhone } = student;
  return { id, fullName, admissionNumber, className, session, term, parentGuardianName, parentGuardianPhone };
}

export function clearStudentSession() {
  try {
    window.localStorage.removeItem(STUDENT_SESSION_KEY);
  } catch {
    // A missing/blocked browser store is already effectively logged out.
  }
}
