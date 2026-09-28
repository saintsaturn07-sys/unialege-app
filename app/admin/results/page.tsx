"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { clearAdminSession, verifyAdminSession, type AdminSession } from "../../lib/admin-auth";
import { getStudents, type StudentRecord } from "../../lib/student-store";
import { getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../../lib/subjects";

type ResultRow = { id: string; student_id: string; subject: string; ca_score: number; exam_score: number; session: string; term: string };
type ResultForm = { subject: string; ca: string; exam: string; session: string; term: string };
const blankForm: ResultForm = { subject: "", ca: "", exam: "", session: "2026/2027", term: "First Term" };
const terms = ["First Term", "Second Term", "Third Term"];
const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function AdminResultsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [studentId, setStudentId] = useState("");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [form, setForm] = useState<ResultForm>(blankForm);
  const [editingId, setEditingId] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void verifyAdminSession().then((session) => {
      if (!active) return;
      if (!session) { router.replace("/admin/login"); return; }
      setAdmin(session);
      getStudents().then((data) => {
        if (!active) return;
        setStudents(data);
        setStudentId(data[0]?.id ?? "");
        if (data[0]) setForm((current) => ({ ...current, session: data[0].session || current.session, term: data[0].term || current.term }));
      }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? `Unable to load students: ${reason.message}` : "Unable to load students."); })
        .finally(() => { if (active) setLoadingStudents(false); });
    });
    return () => { active = false; };
  }, [router]);

  const loadResults = useCallback(async (id: string) => {
    if (!id) { setRows([]); return; }
    setLoadingResults(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/results?studentId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const body = await response.json() as { results?: ResultRow[]; error?: string };
      if (!response.ok) setError(`Unable to load results: ${body.error ?? "Please try again."}`);
      else setRows(body.results ?? []);
    } catch { setError("Unable to load results. Please try again."); }
    setLoadingResults(false);
  }, []);

  useEffect(() => { void loadResults(studentId); }, [studentId, loadResults]);

  function chooseStudent(id: string) {
    const student = students.find((item) => item.id === id);
    setStudentId(id); setEditingId(""); setForm({ ...blankForm, session: student?.session || blankForm.session, term: terms.includes(student?.term ?? "") ? student!.term : blankForm.term }); setError(""); setSuccess("");
  }

  function editResult(row: ResultRow) {
    setEditingId(row.id);
    setForm({ subject: row.subject, ca: String(row.ca_score), exam: String(row.exam_score), session: row.session, term: row.term });
    setError(""); setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!studentId) { setError("Select a student first."); return; }
    if (!studentProfileReady) { setError("Complete this senior student’s field and trade subject in Student Management first."); return; }
    const ca = Number(form.ca); const exam = Number(form.exam);
    if (!form.ca.trim() || !Number.isFinite(ca) || ca < 0 || ca > 30) { setError("CA score must be a number from 0 to 30."); return; }
    if (!form.exam.trim() || !Number.isFinite(exam) || exam < 0 || exam > 70) { setError("Exam score must be a number from 0 to 70."); return; }
    if (!form.subject.trim() || !form.session.trim() || !form.term) { setError("Enter a subject, session, and term."); return; }
    if (!allowedSubjects.some((subject) => subject.name === form.subject)) { setError("Choose a subject offered for this student’s class and field."); return; }
    setSaving(true);
    const record = { student_id: studentId, subject: form.subject.trim(), ca_score: ca, exam_score: exam, session: form.session.trim(), term: form.term };
    let response: Response;
    try { response = await fetch("/api/admin/results", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", body: JSON.stringify({ ...record, id: editingId || undefined }) }); }
    catch { setSaving(false); setError("Unable to save result. Please try again."); return; }
    const result = await response.json().catch(() => ({})) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok) { setError(`Unable to save result: ${result.error ?? "Please try again."}`); return; }
    setSuccess(editingId ? "Result updated successfully." : "Result saved successfully.");
    setEditingId(""); setForm((current) => ({ ...blankForm, session: current.session, term: current.term }));
    await loadResults(studentId);
  }

  async function deleteResult(row: ResultRow) {
    const student = students.find((item) => item.id === studentId);
    if (!window.confirm(`Delete ${row.subject} for ${student?.fullName ?? "this student"}?`)) return;
    setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/admin/results/${row.id}?studentId=${encodeURIComponent(studentId)}`, { method: "DELETE", cache: "no-store" });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) setError(`Unable to delete result: ${result.error ?? "Please try again."}`);
      else { setSuccess("Result deleted successfully."); if (editingId === row.id) { setEditingId(""); setForm(blankForm); } await loadResults(studentId); }
    } catch { setError("Unable to delete result. Please try again."); }
  }

  function logout() { clearAdminSession(); }
  if (!admin) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  const selectedStudent = students.find((item) => item.id === studentId);
  const allowedSubjects = selectedStudent ? getSubjectsForStudent(selectedStudent.className, selectedStudent.fieldOfStudy, selectedStudent.tradeSubject) : [];
  const studentProfileReady = Boolean(selectedStudent && (!isSeniorClass(selectedStudent.className) || (selectedStudent.fieldOfStudy && (!requiresTradeSubject(selectedStudent.className) || selectedStudent.tradeSubject))));

  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/admin" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4"><Link href="/admin" className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 md:px-4">Dashboard</Link><Link href="/admin/students" className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 md:px-4">Students</Link><Link href="/admin/results" aria-current="page" className="shrink-0 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 md:px-4">Results</Link><Link href="/admin/login" onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">Logout</Link></nav>
        <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/admin/login" onClick={logout} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">Logout</Link></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">UniAllege Admin</p><h1 className="mt-1 text-lg font-semibold">Result Entry</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:block">{admin.name}</span><Link href="/admin/login" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Logout</Link></div></header>
        <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-10">
          <section><p className="text-sm font-medium text-blue-700">Secondary Education</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Manage Results</h2><p className="mt-2 text-sm text-slate-500">Enter and update subject scores for enrolled students.</p></section>
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          {success && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</p>}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="font-bold">{editingId ? "Edit Result" : "Enter a Result"}</h3>
            <div className="mt-4"><label className="block text-sm font-medium">Select Student<select value={studentId} disabled={loadingStudents} onChange={(event) => chooseStudent(event.target.value)} className={inputClass}><option value="">{loadingStudents ? "Loading students…" : "Choose a student"}</option>{students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.admissionNumber}</option>)}</select></label></div>
            {students.length === 0 && !loadingStudents ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Add a student before entering results.</p> : <form onSubmit={saveResult} className="mt-4">
              {selectedStudent && !studentProfileReady && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Assign this senior student a field of study and one trade subject in Student Management before entering results.</p>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">Subject<select required disabled={allowedSubjects.length === 0} value={allowedSubjects.some((subject) => subject.name === form.subject) ? form.subject : ""} onChange={(event) => setForm({ ...form, subject: event.target.value })} className={inputClass}><option value="">{allowedSubjects.length ? "Select an eligible subject" : "No subjects available"}</option>{allowedSubjects.map((subject) => <option key={subject.name} value={subject.name}>{subject.name} · {subject.category}</option>)}</select></label>
                <label className="text-sm font-medium">CA Score <span className="font-normal text-slate-500">(0–30)</span><input required type="number" min="0" max="30" step="any" value={form.ca} onChange={(event) => setForm({ ...form, ca: event.target.value })} className={inputClass} /></label>
                <label className="text-sm font-medium">Exam Score <span className="font-normal text-slate-500">(0–70)</span><input required type="number" min="0" max="70" step="any" value={form.exam} onChange={(event) => setForm({ ...form, exam: event.target.value })} className={inputClass} /></label>
                <label className="text-sm font-medium">Session<input required value={form.session} onChange={(event) => setForm({ ...form, session: event.target.value })} placeholder="e.g. 2026/2027" className={inputClass} /></label>
                <label className="text-sm font-medium">Term<select value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} className={inputClass}>{terms.map((term) => <option key={term}>{term}</option>)}</select></label>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-3">{editingId && <button type="button" onClick={() => { setEditingId(""); setForm(blankForm); setError(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel Edit</button>}<button type="submit" disabled={saving || !studentId || !studentProfileReady || allowedSubjects.length === 0} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? "Saving…" : editingId ? "Save Changes" : "Save Result"}</button></div>
            </form>}
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div><h3 className="font-bold">Existing Results</h3><p className="mt-1 text-sm text-slate-500">{selectedStudent ? `Recorded results for ${selectedStudent.fullName}.` : "Select a student to view results."}</p></div>
            {loadingResults ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading results…</p> : !error && rows.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">{selectedStudent ? "No results recorded for this student yet." : "Select a student to view their results."}</p> : rows.length > 0 && <>
              <div className="mt-5 space-y-3 md:hidden">{rows.map((row) => <article key={row.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><h4 className="font-semibold">{row.subject}</h4><span className="text-right text-xs text-slate-500">{row.term}<br />{row.session}</span></div><p className="mt-3 text-sm text-slate-600">CA {Number(row.ca_score)} / 30 · Exam {Number(row.exam_score)} / 70 · Total {Number(row.ca_score) + Number(row.exam_score)} / 100</p><div className="mt-4 flex gap-4"><button type="button" onClick={() => editResult(row)} className="text-sm font-semibold text-blue-700">Edit</button><button type="button" onClick={() => void deleteResult(row)} className="text-sm font-semibold text-red-700">Delete</button></div></article>)}</div>
              <div className="mt-5 hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] border-collapse text-left"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Subject</th><th className="px-3 py-3">CA</th><th className="px-3 py-3">Exam</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Session</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="text-sm hover:bg-slate-50"><td className="px-3 py-4 font-semibold">{row.subject}</td><td className="px-3 py-4">{Number(row.ca_score)} / 30</td><td className="px-3 py-4">{Number(row.exam_score)} / 70</td><td className="px-3 py-4 font-bold">{Number(row.ca_score) + Number(row.exam_score)} / 100</td><td className="px-3 py-4">{row.session}</td><td className="px-3 py-4">{row.term}</td><td className="px-3 py-4"><div className="flex gap-3"><button type="button" onClick={() => editResult(row)} className="font-semibold text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => void deleteResult(row)} className="font-semibold text-red-700 hover:underline">Delete</button></div></td></tr>)}</tbody></table></div>
            </>}
          </section>
        </div>
      </div>
    </div>
  </main>;
}
