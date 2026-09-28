"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Exam = {
  id: string; title: string; subject: string; class_name: string; category: string | null;
  session: string; term: string; duration_minutes: number; question_count: number;
  student_status: "available" | "in_progress" | "completed"; attempt_id: string | null; last_score: number | null;
};
type Question = {
  id: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string;
  selected_option: "A" | "B" | "C" | "D" | null;
};
type Attempt = {
  id: string; exam_id?: string; started_at: string; ends_at: string; status: "in_progress" | "submitted";
  score_out_of_70?: number | null; questions: Question[];
  exam?: { id: string; title: string; subject: string; duration_minutes: number };
};
type Submission = { correct: number; total: number; score_out_of_70: number };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) {
    if (response.status === 401) throw Object.assign(new Error(body.error ?? "Student sign-in required."), { status: 401 });
    throw new Error(body.error ?? "Unable to complete the request.");
  }
  return body;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function CbtPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const attemptRef = useRef<Attempt | null>(null);
  const autoSubmitRef = useRef(false);
  const submitLockRef = useRef(false);

  const updateAttempt = useCallback((next: Attempt | null) => {
    attemptRef.current = next;
    setAttempt(next);
  }, []);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await requestJson<{ exams: Exam[] }>("/api/cbt/exams");
      setExams(result.exams);
      return result.exams;
    } catch (reason) {
      if ((reason as { status?: number })?.status === 401) { router.replace("/login"); return []; }
      setError(reason instanceof Error ? reason.message : "Unable to load exams.");
      return [];
    } finally { setLoading(false); }
  }, [router]);

  const openAttempt = useCallback(async (attemptId: string, exam: Exam) => {
    setError("");
    setLoading(true);
    try {
      const result = await requestJson<{ attempt: Attempt }>(`/api/cbt/attempts/${encodeURIComponent(attemptId)}`);
      setSelectedExam(exam);
      updateAttempt({ ...result.attempt, exam: { id: exam.id, title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes } });
      setQuestionIndex(0);
      if (result.attempt.status === "submitted") {
        setSubmission({ correct: 0, total: result.attempt.questions.length, score_out_of_70: result.attempt.score_out_of_70 ?? 0 });
      }
    } catch (reason) {
      if ((reason as { status?: number })?.status === 401) { router.replace("/login"); return; }
      setError(reason instanceof Error ? reason.message : "Unable to restore this attempt.");
    } finally { setLoading(false); }
  }, [router, updateAttempt]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const available = await loadExams();
      if (!active) return;
      const attemptId = new URLSearchParams(window.location.search).get("attempt");
      if (attemptId) {
        const matchingExam = available.find((exam) => exam.attempt_id === attemptId);
        if (matchingExam) await openAttempt(attemptId, matchingExam);
        else setError("This attempt is no longer available. Refresh the exam list or contact your school administrator.");
      }
    })();
    return () => { active = false; };
  }, [loadExams, openAttempt]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const update = () => {
      const remaining = Math.ceil((new Date(attempt.ends_at).getTime() - Date.now()) / 1000);
      setSecondsLeft(Math.max(remaining, 0));
      if (remaining <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        void submitAttempt(false);
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);

  function saveAnswer(questionId: string, selectedOption: "A" | "B" | "C" | "D") {
    const current = attemptRef.current;
    if (!current || current.status !== "in_progress") return;
    const updated = { ...current, questions: current.questions.map((question) => question.id === questionId ? { ...question, selected_option: selectedOption } : question) };
    updateAttempt(updated);
    setSaveNotice("Saving answer…");
    const operation = saveQueue.current.catch(() => {}).then(async () => {
      await requestJson(`/api/cbt/attempts/${encodeURIComponent(current.id)}/answers`, {
        method: "POST", body: JSON.stringify({ questionId, selectedOption }),
      });
    });
    saveQueue.current = operation;
    void operation.then(() => { setSaveNotice(""); setSavedAt(new Date().toLocaleTimeString()); })
      .catch((reason: unknown) => setSaveNotice(reason instanceof Error ? `Answer not saved: ${reason.message}` : "Answer not saved. Check your connection."));
  }

  async function flushAnswers() {
    await saveQueue.current.catch(() => {});
    const current = attemptRef.current;
    if (!current) return false;
    try {
      for (const question of current.questions) {
        if (!question.selected_option) continue;
        await requestJson(`/api/cbt/attempts/${encodeURIComponent(current.id)}/answers`, {
          method: "POST", body: JSON.stringify({ questionId: question.id, selectedOption: question.selected_option }),
        });
      }
      setSaveNotice("");
      return true;
    } catch (reason) {
      setSaveNotice(reason instanceof Error ? `Could not save every answer: ${reason.message}` : "Could not save every answer. Check your connection.");
      return false;
    }
  }

  async function startExam(exam: Exam) {
    setStarting(true); setError(""); setSubmission(null);
    try {
      const result = await requestJson<{ attempt: Attempt }>("/api/cbt/attempts", { method: "POST", body: JSON.stringify({ examId: exam.id }) });
      setSelectedExam(exam);
      updateAttempt({ ...result.attempt, exam: { id: exam.id, title: exam.title, subject: exam.subject, duration_minutes: exam.duration_minutes } });
      setQuestionIndex(0); setSavedAt(""); autoSubmitRef.current = false;
      submitLockRef.current = false;
      window.history.replaceState(null, "", `/cbt?attempt=${encodeURIComponent(result.attempt.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to start this exam.");
      void loadExams();
    } finally { setStarting(false); }
  }

  async function submitAttempt(confirmUnanswered = true) {
    const current = attemptRef.current;
    if (!current || current.status !== "in_progress" || submitting || submitLockRef.current) return;
    const unanswered = current.questions.filter((question) => !question.selected_option).length;
    if (confirmUnanswered && unanswered && !window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. Submit anyway?`)) return;
    submitLockRef.current = true;
    setSubmitting(true); setError("");
    const answersSaved = await flushAnswers();
    if (!answersSaved) { submitLockRef.current = false; setSubmitting(false); return; }
    try {
      const result = await requestJson<{ result: Submission }>(`/api/cbt/attempts/${encodeURIComponent(current.id)}/submit`, { method: "POST", body: "{}" });
      setSubmission(result.result);
      updateAttempt({ ...current, status: "submitted" });
      window.history.replaceState(null, "", "/cbt");
      await loadExams();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit this exam.");
    } finally { submitLockRef.current = false; setSubmitting(false); }
  }

  const currentQuestion = attempt?.questions[questionIndex];
  const answeredCount = attempt?.questions.filter((question) => Boolean(question.selected_option)).length ?? 0;
  const categoryLabel = (category: string | null) => category === "science" ? "Science" : category === "commercial" ? "Commercial" : category === "arts" ? "Arts" : "Common subject";

  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-7 sm:py-9">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Student Portal</p><h1 className="mt-1 text-2xl font-bold">CBT / Exams</h1><p className="mt-1 text-sm text-slate-500">Published assessments for your class, subjects and stream.</p></div>
        <Link href="/dashboard" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to dashboard</Link>
      </header>

      {error && <p role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {loading && <p role="status" className="rounded-xl border border-slate-100 bg-white px-5 py-10 text-center text-sm text-slate-500">Loading your exams…</p>}

      {!loading && submission && <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8" aria-live="polite">
        <p className="text-sm font-semibold text-emerald-700">Submission received</p><h2 className="mt-2 text-2xl font-bold">{selectedExam?.title ?? "Exam complete"}</h2>
        <p className="mt-4 text-4xl font-bold text-slate-900">{submission.score_out_of_70.toFixed(2)}<span className="ml-2 text-base font-medium text-slate-500">/ 70</span></p>
        {submission.total > 0 && <p className="mt-2 text-sm text-slate-600">{submission.correct} of {submission.total} answers correct.</p>}
        <p className="mt-2 text-sm text-slate-500">Your result has been recorded. Correct answers are not displayed here.</p>
        <button type="button" onClick={() => { setSubmission(null); setSelectedExam(null); updateAttempt(null); void loadExams(); }} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">Return to exams</button>
      </section>}

      {!loading && !submission && attempt && selectedExam && attempt.status === "in_progress" && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{selectedExam.subject} · {selectedExam.class_name} · {categoryLabel(selectedExam.category)}</p><h2 className="mt-1 text-xl font-bold">{selectedExam.title}</h2><p className="mt-1 text-sm text-slate-500">Question {questionIndex + 1} of {attempt.questions.length} · {answeredCount} answered</p></div>
          <div className={`rounded-xl px-4 py-2 text-center ${secondsLeft <= 60 ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-800"}`} aria-live="polite"><span className="block text-[11px] font-semibold uppercase tracking-wide">Time remaining</span><span className="font-mono text-2xl font-bold">{formatTime(secondsLeft)}</span></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label="Question progress">{attempt.questions.map((question, index) => <button key={question.id} type="button" onClick={() => setQuestionIndex(index)} aria-label={`Question ${index + 1}${question.selected_option ? ", answered" : ", unanswered"}`} aria-current={questionIndex === index ? "step" : undefined} className={`h-9 w-9 rounded-lg text-xs font-bold ${questionIndex === index ? "bg-blue-700 text-white" : question.selected_option ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{index + 1}</button>)}</div>
        {currentQuestion && <div className="mt-7 rounded-2xl bg-slate-50 p-5 sm:p-7"><p className="text-lg font-semibold leading-8">{currentQuestion.question_text}</p><div className="mt-5 grid gap-3">{(["A", "B", "C", "D"] as const).map((option) => {
          const text = currentQuestion[`option_${option.toLowerCase()}` as "option_a" | "option_b" | "option_c" | "option_d"];
          return <button key={option} type="button" onClick={() => saveAnswer(currentQuestion.id, option)} aria-pressed={currentQuestion.selected_option === option} className={`flex items-start gap-3 rounded-xl border p-4 text-left text-sm transition-colors ${currentQuestion.selected_option === option ? "border-blue-500 bg-blue-50 text-blue-900" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">{option}</span><span className="pt-1 leading-6">{text}</span></button>;
        })}</div></div>}
        <div className="mt-4 flex min-h-6 items-center justify-between gap-3 text-xs text-slate-500"><span role="status">{saveNotice || (savedAt ? `Answers saved · ${savedAt}` : "Answers save automatically as you choose them.")}</span><span>{answeredCount}/{attempt.questions.length} answered</span></div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(index - 1, 0))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Previous</button><div className="flex flex-wrap gap-3"><button type="button" disabled={questionIndex === attempt.questions.length - 1} onClick={() => setQuestionIndex((index) => Math.min(index + 1, attempt.questions.length - 1))} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">Next</button><button type="button" disabled={submitting} onClick={() => void submitAttempt()} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{submitting ? "Submitting…" : secondsLeft === 0 ? "Submit expired exam" : "Submit exam"}</button></div></div>
      </section>}

      {!loading && !submission && !attempt && <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold">Available exams</h2><p className="mt-1 text-sm text-slate-500">Only published exams for your assigned class and subjects are listed.</p></div><button type="button" onClick={() => void loadExams()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Refresh</button></div>
        {exams.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">There are no exams available for your current class, session and term.</p> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{exams.map((exam) => <article key={exam.id} className="rounded-xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{exam.subject} · {exam.class_name} · {categoryLabel(exam.category)}</p><h3 className="mt-1 text-lg font-bold">{exam.title}</h3></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${exam.student_status === "completed" ? "bg-emerald-50 text-emerald-700" : exam.student_status === "in_progress" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{exam.student_status === "completed" ? "Completed" : exam.student_status === "in_progress" ? "In progress" : "Available"}</span></div>
          <p className="mt-3 text-sm text-slate-600">{exam.duration_minutes} minutes · {exam.question_count} questions · {exam.session} · {exam.term}</p>
          {exam.student_status === "completed" && <p className="mt-2 text-sm text-slate-500">Submitted{exam.last_score != null ? ` · Score ${Number(exam.last_score).toFixed(2)}/70` : ""}</p>}
          {exam.student_status !== "completed" && <button type="button" disabled={starting} onClick={() => exam.attempt_id ? void openAttempt(exam.attempt_id, exam) : (setSelectedExam(exam), setError(""))} className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60">{exam.student_status === "in_progress" ? "Continue exam" : "View instructions"}</button>}
          {selectedExam?.id === exam.id && !attempt && <div className="mt-4 rounded-xl bg-slate-50 p-4"><h4 className="font-semibold">Before you start</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600"><li>You have {exam.duration_minutes} minutes. The timer begins when you start.</li><li>Your answers save as you select them. Keep your connection active.</li><li>You may move between questions and return to unanswered items.</li><li>When time expires, your attempt will be submitted automatically.</li></ul><button type="button" disabled={starting} onClick={() => void startExam(exam)} className="mt-4 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{starting ? "Starting…" : "Start exam"}</button></div>}
        </article>)}</div>}
      </section>}
      <footer className="mt-6 text-center text-xs text-slate-400">Your selected answers are saved securely. The answer key remains private during the attempt.</footer>
    </div>
  </main>;
}
