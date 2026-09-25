"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { clearAdminSession, getAdminSession, type AdminSession } from "../../lib/admin-auth";
import { addStudent, deleteStudent as deleteStudentRecord, getStudents, normalizeAdmissionNumber, updateStudent, type StudentInput, type StudentRecord } from "../../lib/student-store";

type ModalMode = "add" | "edit" | "view" | null;

const blankStudent: StudentInput = {
  fullName: "",
  admissionNumber: "",
  password: "",
  className: "JSS 1",
  session: "2026/2027",
  term: "First Term",
  parentGuardianName: "",
  parentGuardianPhone: "",
};

const classes = ["All Classes", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const adminNavigation = ["Dashboard", "Students"];
const adminHrefs: Record<string, string> = { Dashboard: "/admin", Students: "/admin/students" };

export default function AdminStudentsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All Classes");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<StudentInput>(blankStudent);
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const session = getAdminSession();
    if (!session) {
      router.replace("/admin/login");
      return;
    }
    setAdmin(session);
    setStudents(getStudents());
    setIsLoading(false);
  }, [router]);

  const visibleStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch = student.fullName.toLowerCase().includes(query) || student.admissionNumber.toLowerCase().includes(query);
      return matchesSearch && (classFilter === "All Classes" || student.className === classFilter);
    });
  }, [students, search, classFilter]);

  function logout() { clearAdminSession(); }

  function openAdd() {
    setForm(blankStudent);
    setFormError("");
    setFeedback("");
    setModal("add");
  }

  function openEdit(student: StudentRecord) {
    setSelectedId(student.id);
    setForm({
      fullName: student.fullName,
      admissionNumber: student.admissionNumber,
      password: student.password,
      className: student.className,
      session: student.session,
      term: student.term,
      parentGuardianName: student.parentGuardianName,
      parentGuardianPhone: student.parentGuardianPhone,
    });
    setFormError("");
    setFeedback("");
    setModal("edit");
  }

  function openView(student: StudentRecord) {
    setSelectedId(student.id);
    setModal("view");
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    const result = modal === "edit" ? updateStudent(selectedId, form) : addStudent(form);
    setIsSaving(false);

    if (!result.ok) {
      const errors = {
        duplicate: "That admission number is already in use.",
        invalid: "Complete all required fields with valid information.",
        missing: "This student record could not be found. Refresh and try again.",
        storage: "Unable to save this student in browser storage. Check storage settings and try again.",
      };
      setFormError(errors[result.reason]);
      return;
    }

    setStudents(getStudents());
    setModal(null);
    setFeedback(modal === "edit" ? "Student record updated." : `Student account created. Admission Number: ${result.student.admissionNumber}. The account is ready for student login.`);
  }

  function removeStudent(student: StudentRecord) {
    if (!window.confirm(`Delete ${student.fullName} (${student.admissionNumber})? This removes the student account from this browser.`)) return;
    const removed = deleteStudentRecord(student.id);
    setStudents(getStudents());
    setFeedback(removed ? "Student account deleted." : "Unable to delete this student record.");
  }

  if (!admin) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;

  const selectedStudent = students.find((student) => student.id === selectedId);

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes student-admin-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .student-admin-rise { animation: student-admin-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .student-admin-rise { animation: none; } }`}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/admin" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
          <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{adminNavigation.map((label) => <Link key={label} href={adminHrefs[label] ?? `/admin#${label.toLowerCase()}`} aria-current={label === "Students" ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${label === "Students" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{label}</Link>)}<Link href="/admin/login" onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">Logout</Link></nav>
          <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/admin/login" onClick={logout} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">Logout</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">UniAllege Admin</p><h1 className="mt-1 text-lg font-semibold">Student Management</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:block">{admin.name}</span><Link href="/admin/login" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Logout</Link></div></header>
          <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-10">
            <section className="student-admin-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-blue-700">Secondary Education</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Students</h2><p className="mt-2 text-sm text-slate-500">Issue and manage student admission credentials.</p></div><button type="button" onClick={openAdd} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">＋ Add Student</button></section>
            {feedback && <p role="status" className="student-admin-rise rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{feedback}</p>}

            <section className="student-admin-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="font-bold">Student Directory</h3><p className="mt-1 text-sm text-slate-500">{visibleStudents.length} of {students.length} student accounts</p></div><div className="grid gap-3 sm:grid-cols-2"><label><span className="sr-only">Search students by name or admission number</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search students..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label><span className="sr-only">Filter by class</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{classes.map((className) => <option key={className}>{className}</option>)}</select></label></div></div>

              {isLoading ? <p className="py-12 text-center text-sm text-slate-500">Loading student accounts…</p> : visibleStudents.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-blue-700 shadow-sm" aria-hidden="true">◎</span><h3 className="mt-4 font-semibold">{students.length === 0 ? "No students have been added yet." : "No students match your search."}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Add a student to create and issue their admission number and password. The account will then be available on the student login page in this browser.</p>{students.length === 0 && <button type="button" onClick={openAdd} className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Add the first student</button>}</div> : <>
                <div className="mt-5 space-y-3 md:hidden">{visibleStudents.map((student) => <article key={student.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold">{student.fullName}</h3><p className="mt-1 text-xs text-blue-700">{student.admissionNumber}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{student.status}</span></div><div className="mt-3 flex justify-between text-sm text-slate-500"><span>{student.className}</span><span>{student.session}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => openView(student)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">View</button><button type="button" onClick={() => openEdit(student)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Edit</button><button type="button" onClick={() => removeStudent(student)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button></div></article>)}</div>
                <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[850px] border-collapse text-left"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th scope="col" className="px-3 py-3">Student Name</th><th scope="col" className="px-3 py-3">Admission Number</th><th scope="col" className="px-3 py-3">Class</th><th scope="col" className="px-3 py-3">Session</th><th scope="col" className="px-3 py-3">Status</th><th scope="col" className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleStudents.map((student) => <tr key={student.id} className="text-sm hover:bg-slate-50"><td className="px-3 py-4 font-semibold">{student.fullName}</td><td className="px-3 py-4 text-blue-700">{student.admissionNumber}</td><td className="px-3 py-4">{student.className}</td><td className="px-3 py-4">{student.session}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${student.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{student.status}</span></td><td className="px-3 py-4"><div className="flex gap-2"><button type="button" onClick={() => openView(student)} className="font-semibold text-blue-700 hover:underline">View</button><button type="button" onClick={() => openEdit(student)} className="font-semibold text-slate-600 hover:underline">Edit</button><button type="button" onClick={() => removeStudent(student)} className="font-semibold text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div>
              </>}
            </section>
          </div>
        </div>
      </div>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="student-modal-title" className="my-6 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Admin · Student records</p><h2 id="student-modal-title" className="mt-1 text-xl font-bold">{modal === "add" ? "Add Student" : modal === "edit" ? "Edit Student" : "Student Details"}</h2></div><button type="button" onClick={() => setModal(null)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">×</button></div>
        {modal === "view" && selectedStudent ? <div className="mt-6 grid gap-4 sm:grid-cols-2">{[["Full Name", selectedStudent.fullName], ["Admission Number", selectedStudent.admissionNumber], ["Class", selectedStudent.className], ["Session", selectedStudent.session], ["Term", selectedStudent.term], ["Parent/Guardian", selectedStudent.parentGuardianName], ["Guardian Phone", selectedStudent.parentGuardianPhone], ["Status", selectedStudent.status]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}<p className="sm:col-span-2 text-xs text-slate-400">Credentials are issued by the school administrator. Passwords are never shown in student details.</p></div> : <form onSubmit={handleSave} className="mt-6"><div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">The school administrator creates and issues the student&apos;s Admission Number and Password.</div><div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Full Name<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Student full name" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium">Admission Number<input required value={form.admissionNumber} onChange={(event) => setForm({ ...form, admissionNumber: normalizeAdmissionNumber(event.target.value) })} placeholder="e.g. AD/2026/1050" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium">Password<input required type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Set initial password" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium">Class<select value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{classes.slice(1).map((className) => <option key={className}>{className}</option>)}</select></label>
          <label className="text-sm font-medium">Session<input required value={form.session} onChange={(event) => setForm({ ...form, session: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium">Term<select value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{["First Term", "Second Term", "Third Term"].map((term) => <option key={term}>{term}</option>)}</select></label>
          <label className="text-sm font-medium">Parent/Guardian Name<input required value={form.parentGuardianName} onChange={(event) => setForm({ ...form, parentGuardianName: event.target.value })} placeholder="Parent or guardian" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium">Parent/Guardian Phone<input required type="tel" autoComplete="tel" value={form.parentGuardianPhone} onChange={(event) => setForm({ ...form, parentGuardianPhone: event.target.value })} placeholder="Phone number" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>{formError && <p role="alert" className="mt-4 text-sm text-red-700">{formError}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{isSaving ? "Saving..." : modal === "add" ? "Create Student" : "Save Changes"}</button></div></form>}</section></div>}
    </main>
  );
}
