"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { clearAdminSession, verifyAdminSession, type AdminSession } from "../../lib/admin-auth";

type ExamStatus = "draft" | "published";
type AssessmentType = "formal" | "mock" | "unclassified";
type ExamRow = { id: string; title: string; subject: string; class_name: string; session: string; term: string; category: "science" | "commercial" | "arts" | null; topic: string | null; duration_minutes: number; question_count: number; status: ExamStatus; assessment_type: AssessmentType; created_at: string };
type QuestionRow = { id: string; exam_id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: "A" | "B" | "C" | "D"; question_order: number; created_at: string };
type ExamForm = { title: string; subject: string; className: string; session: string; term: string; category: "" | "science" | "commercial" | "arts"; topic: string; duration: string; questionCount: string; status: ExamStatus; assessmentType: AssessmentType };
type QuestionForm = { questionText: string; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: "A" | "B" | "C" | "D" };
const blankExam: ExamForm = { title: "", subject: "", className: "JSS 1", session: "2026/2027", term: "First Term", category: "", topic: "", duration: "60", questionCount: "40", status: "draft", assessmentType: "formal" };
const blankQuestion: QuestionForm = { questionText: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A" };
const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const terms = ["First Term", "Second Term", "Third Term"];
const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

export default function AdminExamsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [examForm, setExamForm] = useState<ExamForm>(blankExam);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(blankQuestion);
  const [editingExamId, setEditingExamId] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSavingExam, setIsSavingExam] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const questionRequestId = useRef(0);

  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try { const result = await api<{ exams: ExamRow[] }>("/api/admin/exams"); setExams(result.exams); setError(""); }
    catch (reason) { setError(`Unable to load exams: ${reason instanceof Error ? reason.message : "Please try again."}`); }
    setIsLoading(false);
  }, []);

  const loadQuestions = useCallback(async (examId: string) => {
    const requestId = ++questionRequestId.current;
    if (!examId) { setQuestions([]); return; }
    setQuestions([]);
    setError("");
    setIsLoadingQuestions(true);
    let data: QuestionRow[];
    try { ({ questions: data } = await api<{ questions: QuestionRow[] }>(`/api/admin/exams/${examId}/questions`)); }
    catch (reason) { if (requestId === questionRequestId.current) { setError(`Unable to load exam questions: ${reason instanceof Error ? reason.message : "Please try again."}`); setIsLoadingQuestions(false); } return; }
    if (requestId !== questionRequestId.current) return;
    setQuestions(data); setError("");
    setIsLoadingQuestions(false);
  }, []);

  useEffect(() => {
    let active = true;
    void verifyAdminSession().then((session) => {
      if (!active) return;
      if (!session) { router.replace("/admin/login"); return; }
      setAdmin(session);
      void loadExams();
    });
    return () => { active = false; };
  }, [router, loadExams]);

  useEffect(() => { void loadQuestions(selectedExamId); }, [selectedExamId, loadQuestions]);

  async function saveExam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setFeedback("");
    const duration = Number(examForm.duration);
    const questionCount = Number(examForm.questionCount);
    if (!Number.isInteger(duration) || duration < 1 || duration > 600) { setError("Duration must be a whole number from 1 to 600 minutes."); return; }
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 500) { setError("Question count must be a whole number from 1 to 500."); return; }
    if (!examForm.title.trim() || !examForm.subject.trim() || !examForm.session.trim()) { setError("Complete the exam title, subject, and session."); return; }
    setIsSavingExam(true);
    const record = { title: examForm.title.trim(), subject: examForm.subject.trim(), class_name: examForm.className, session: examForm.session.trim(), term: examForm.term, category: examForm.category || null, topic: examForm.topic.trim() || null, duration_minutes: duration, question_count: questionCount, status: examForm.status, assessment_type: examForm.assessmentType };
    let savedExam: ExamRow;
    try { const response = await api<{ exam: ExamRow }>(editingExamId ? `/api/admin/exams/${editingExamId}` : "/api/admin/exams", editingExamId ? "PATCH" : "POST", record); savedExam = response.exam; }
    catch (reason) { setIsSavingExam(false); setError(`Unable to save exam: ${reason instanceof Error ? reason.message : "Please try again."}`); return; }
    setIsSavingExam(false);
    setSelectedExamId(savedExam.id);
    setEditingExamId(""); setExamForm(blankExam);
    setFeedback(editingExamId ? "Exam updated successfully." : "Exam created successfully.");
    await loadExams();
  }

  function editExam(exam: ExamRow) {
    setEditingExamId(exam.id); setSelectedExamId(exam.id);
    setExamForm({ title: exam.title, subject: exam.subject, className: exam.class_name, session: exam.session, term: exam.term, category: exam.category ?? "", topic: exam.topic ?? "", duration: String(exam.duration_minutes), questionCount: String(exam.question_count ?? 40), status: exam.status, assessmentType: exam.assessment_type ?? "unclassified" });
    setError(""); setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExam(exam: ExamRow) {
    if (!window.confirm(`Delete “${exam.title}” and all its questions?`)) return;
    setError(""); setFeedback("");
    try { await api(`/api/admin/exams/${exam.id}`, "DELETE"); }
    catch (reason) { setError(`Unable to delete exam: ${reason instanceof Error ? reason.message : "Please try again."}`); return; }
    if (selectedExamId === exam.id) { setSelectedExamId(""); setQuestions([]); }
    if (editingExamId === exam.id) { setEditingExamId(""); setExamForm(blankExam); }
    setFeedback("Exam and its questions deleted successfully."); await loadExams();
  }

  async function changeStatus(exam: ExamRow) {
    const status: ExamStatus = exam.status === "published" ? "draft" : "published";
    setError(""); setFeedback("");
    try { await api(`/api/admin/exams/${exam.id}`, "PATCH", { ...exam, status, question_count: exam.question_count ?? 40 }); if (editingExamId === exam.id) setExamForm((current) => ({ ...current, status })); setFeedback(`Exam ${status === "published" ? "published" : "moved to draft"} successfully.`); await loadExams(); }
    catch (reason) { setError(`Unable to change exam status: ${reason instanceof Error ? reason.message : "Please try again."}`); }
  }

  async function saveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setFeedback("");
    if (!selectedExamId) { setError("Select an exam before adding questions."); return; }
    if (![questionForm.questionText, questionForm.optionA, questionForm.optionB, questionForm.optionC, questionForm.optionD].every((value) => value.trim())) { setError("Enter the question and all four options."); return; }
    setIsSavingQuestion(true);
    const record = { question_text: questionForm.questionText.trim(), option_a: questionForm.optionA.trim(), option_b: questionForm.optionB.trim(), option_c: questionForm.optionC.trim(), option_d: questionForm.optionD.trim(), correct_answer: questionForm.correctAnswer };
    try { await api(editingQuestionId ? `/api/admin/exams/${selectedExamId}/questions/${editingQuestionId}` : `/api/admin/exams/${selectedExamId}/questions`, editingQuestionId ? "PATCH" : "POST", record); }
    catch (reason) { setIsSavingQuestion(false); setError(`Unable to save question: ${reason instanceof Error ? reason.message : "Please try again."}`); return; }
    setIsSavingQuestion(false);
    setQuestionForm(blankQuestion); setEditingQuestionId("");
    setFeedback(editingQuestionId ? "Question updated successfully." : "Question added successfully.");
    await loadQuestions(selectedExamId);
  }

  async function generateQuestions(exam: ExamRow) {
    setError(""); setFeedback(""); setIsGeneratingQuestions(true);
    try {
      const result = await api<{ result: { inserted: number } }>(`/api/admin/exams/${exam.id}/generate`, "POST", {});
      setFeedback(result.result.inserted
        ? `Added ${result.result.inserted} question${result.result.inserted === 1 ? "" : "s"} from the reusable question bank.`
        : "This exam already has its requested number of questions.");
      await Promise.all([loadQuestions(exam.id), loadExams()]);
    } catch (reason) {
      setError(`Unable to generate questions: ${reason instanceof Error ? reason.message : "Please try again."}`);
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  function editQuestion(question: QuestionRow) {
    setEditingQuestionId(question.id);
    setQuestionForm({ questionText: question.question_text, optionA: question.option_a, optionB: question.option_b, optionC: question.option_c, optionD: question.option_d, correctAnswer: question.correct_answer });
    setError(""); setFeedback("");
    document.getElementById("exam-question-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function deleteQuestion(question: QuestionRow) {
    if (!window.confirm("Delete this question?")) return;
    setError(""); setFeedback("");
    try { await api(`/api/admin/exams/${selectedExamId}/questions/${question.id}`, "DELETE"); if (editingQuestionId === question.id) { setEditingQuestionId(""); setQuestionForm(blankQuestion); } setFeedback("Question deleted successfully."); await loadQuestions(selectedExamId); }
    catch (reason) { setError(`Unable to delete question: ${reason instanceof Error ? reason.message : "Please try again."}`); }
  }

  function logout() { clearAdminSession(); }
  if (!admin) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  const selectedExam = exams.find((exam) => exam.id === selectedExamId);

  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/admin" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4"><Link href="/admin" className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 md:px-4">Dashboard</Link><Link href="/admin/students" className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 md:px-4">Students</Link><Link href="/admin/results" className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 md:px-4">Results</Link><Link href="/admin/exams" aria-current="page" className="shrink-0 rounded-xl bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-700 md:px-4">CBT Exams</Link><Link href="/admin/login" onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">Logout</Link></nav>
        <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/admin/login" onClick={logout} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">Logout</Link></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">UniAllege Admin</p><h1 className="mt-1 text-lg font-semibold">CBT Exam Management</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:block">{admin.name}</span><Link href="/admin/login" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Logout</Link></div></header>
        <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-10">
          <section><p className="text-sm font-medium text-blue-700">Assessment Management</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">CBT Exams</h2><p className="mt-2 text-sm text-slate-500">Create exams, manage questions, and control publication status.</p></section>
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
          {feedback && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{feedback}</p>}
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5"><h3 className="font-bold">{editingExamId ? "Edit Exam" : "Create Exam"}</h3><p className="mt-1 text-sm text-slate-500">Published exams can be made available to students when exam-taking is added.</p></div>
            <form onSubmit={saveExam}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">Exam Title<input required value={examForm.title} onChange={(event) => setExamForm({ ...examForm, title: event.target.value })} placeholder="e.g. First Term Mathematics CBT" className={inputClass} /></label>
                <label className="text-sm font-medium">Subject<input required value={examForm.subject} onChange={(event) => setExamForm({ ...examForm, subject: event.target.value })} placeholder="Subject" className={inputClass} /></label>
                <label className="text-sm font-medium">Class<select value={examForm.className} onChange={(event) => setExamForm({ ...examForm, className: event.target.value })} className={inputClass}>{classes.map((className) => <option key={className}>{className}</option>)}</select></label>
                <label className="text-sm font-medium">Category / Stream<select value={examForm.category} onChange={(event) => setExamForm({ ...examForm, category: event.target.value as ExamForm["category"] })} className={inputClass}><option value="">Common / any applicable</option><option value="science">Science</option><option value="commercial">Commercial</option><option value="arts">Arts</option></select></label>
                <label className="text-sm font-medium">Topic (optional)<input value={examForm.topic} onChange={(event) => setExamForm({ ...examForm, topic: event.target.value })} placeholder="Leave blank to use any topic" className={inputClass} /></label>
                <label className="text-sm font-medium">Session<input required value={examForm.session} onChange={(event) => setExamForm({ ...examForm, session: event.target.value })} placeholder="e.g. 2026/2027" className={inputClass} /></label>
                <label className="text-sm font-medium">Term<select value={examForm.term} onChange={(event) => setExamForm({ ...examForm, term: event.target.value })} className={inputClass}>{terms.map((term) => <option key={term}>{term}</option>)}</select></label>
                <label className="text-sm font-medium">Duration (minutes)<input required type="number" min="1" max="600" step="1" value={examForm.duration} onChange={(event) => setExamForm({ ...examForm, duration: event.target.value })} className={inputClass} /></label>
                <label className="text-sm font-medium">Questions per attempt<input required type="number" min="1" max="500" step="1" value={examForm.questionCount} onChange={(event) => setExamForm({ ...examForm, questionCount: event.target.value })} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Selects up to this many questions randomly from the exam pool.</span></label>
                <label className="text-sm font-medium">Status<select value={examForm.status} onChange={(event) => setExamForm({ ...examForm, status: event.target.value as ExamStatus })} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option></select></label>
                <label className="text-sm font-medium">Assessment type<select value={examForm.assessmentType} onChange={(event) => setExamForm({ ...examForm, assessmentType: event.target.value as AssessmentType })} className={inputClass}><option value="formal">Formal academic exam</option><option value="mock">Mock exam (excluded from results)</option><option value="unclassified">Unclassified existing exam</option></select><span className="mt-1 block text-xs font-normal text-slate-500">Only a completed exam that remains published and is marked formal can feed academic results.</span></label>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-3">{editingExamId && <button type="button" onClick={() => { setEditingExamId(""); setExamForm(blankExam); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel Edit</button>}<button type="submit" disabled={isSavingExam} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{isSavingExam ? "Saving…" : editingExamId ? "Save Exam" : "Create Exam"}</button></div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">Existing Exams</h3><p className="mt-1 text-sm text-slate-500">{exams.length} exam{exams.length === 1 ? "" : "s"}</p></div></div>
            {isLoading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading exams…</p> : exams.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">No exams have been created yet.</p> : <div className="mt-5 grid gap-3">{exams.map((exam) => <article key={exam.id} className={`rounded-xl border p-4 ${selectedExamId === exam.id ? "border-blue-200 bg-blue-50/40" : "border-slate-100"}`}>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">{exam.title}</h4><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${exam.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{exam.status === "published" ? "Published" : "Draft"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${exam.assessment_type === "formal" ? "bg-blue-50 text-blue-700" : exam.assessment_type === "mock" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>{exam.assessment_type === "formal" ? "Formal" : exam.assessment_type === "mock" ? "Mock · excluded" : "Unclassified · excluded"}</span></div><p className="mt-1 text-sm text-slate-500">{exam.subject} · {exam.class_name} · {exam.term} · {exam.session} · {exam.duration_minutes} min · {exam.question_count} questions/attempt</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSelectedExamId(exam.id); setEditingQuestionId(""); setQuestionForm(blankQuestion); setFeedback(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white">Questions</button><button type="button" onClick={() => editExam(exam)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white">Edit</button><button type="button" onClick={() => void changeStatus(exam)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white">{exam.status === "published" ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => void deleteExam(exam)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button></div></div>
            </article>)}</div>}
          </section>

          {selectedExam && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{selectedExam.subject} · {selectedExam.class_name}</p><h3 className="mt-1 text-lg font-bold">Questions for {selectedExam.title}</h3><p className="mt-1 text-sm text-slate-500">{questions.length} question{questions.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => void generateQuestions(selectedExam)} disabled={isGeneratingQuestions} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60">{isGeneratingQuestions ? "Selecting questions…" : "Generate from question bank"}</button></div>
            <form id="exam-question-form" onSubmit={saveQuestion} className="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
              <h4 className="font-semibold">{editingQuestionId ? "Edit Question" : "Add a Question"}</h4>
              <label className="mt-4 block text-sm font-medium">Question Text<textarea required rows={3} value={questionForm.questionText} onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })} className={inputClass} /></label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Option A<input required value={questionForm.optionA} onChange={(event) => setQuestionForm({ ...questionForm, optionA: event.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Option B<input required value={questionForm.optionB} onChange={(event) => setQuestionForm({ ...questionForm, optionB: event.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Option C<input required value={questionForm.optionC} onChange={(event) => setQuestionForm({ ...questionForm, optionC: event.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Option D<input required value={questionForm.optionD} onChange={(event) => setQuestionForm({ ...questionForm, optionD: event.target.value })} className={inputClass} /></label><label className="text-sm font-medium">Correct Answer<select value={questionForm.correctAnswer} onChange={(event) => setQuestionForm({ ...questionForm, correctAnswer: event.target.value as QuestionForm["correctAnswer"] })} className={inputClass}><option value="A">Option A</option><option value="B">Option B</option><option value="C">Option C</option><option value="D">Option D</option></select></label></div>
              <div className="mt-5 flex flex-wrap justify-end gap-3">{editingQuestionId && <button type="button" onClick={() => { setEditingQuestionId(""); setQuestionForm(blankQuestion); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">Cancel Edit</button>}<button type="submit" disabled={isSavingQuestion} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{isSavingQuestion ? "Saving…" : editingQuestionId ? "Save Question" : "Add Question"}</button></div>
            </form>
            <div className="mt-5 space-y-3">{isLoadingQuestions ? <p role="status" className="py-6 text-center text-sm text-slate-500">Loading questions…</p> : questions.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">No questions have been added to this exam yet.</p> : questions.map((question, index) => <article key={question.id} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Question {index + 1}</p><p className="mt-1 font-medium">{question.question_text}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => editQuestion(question)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Edit</button><button type="button" onClick={() => void deleteQuestion(question)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700">Delete</button></div></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p className={question.correct_answer === "A" ? "font-semibold text-emerald-700" : "text-slate-600"}>A. {question.option_a}</p><p className={question.correct_answer === "B" ? "font-semibold text-emerald-700" : "text-slate-600"}>B. {question.option_b}</p><p className={question.correct_answer === "C" ? "font-semibold text-emerald-700" : "text-slate-600"}>C. {question.option_c}</p><p className={question.correct_answer === "D" ? "font-semibold text-emerald-700" : "text-slate-600"}>D. {question.option_d}</p></div></article>)}</div>
          </section>}
        </div>
      </div>
    </div>
  </main>;
}
