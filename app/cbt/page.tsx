"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressMeter, SectionHeading } from "../components/portal-ui";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, RefreshCw } from "lucide-react";
import { StudentPortalShell } from "../components/student-portal-shell";

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

  return <StudentPortalShell title="CBT / Exams">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">Online assessments</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">CBT / Exams</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Published assessments for your class, subjects, and stream.</p></div>{!attempt && !submission && <button type="button" onClick={() => void loadExams()} className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw className="h-3.5 w-3.5"/>Refresh exams</button>}</section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
    {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your exams…</div>}

    {!loading && submission && <section className="mx-auto w-full max-w-2xl rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900 dark:bg-slate-900 sm:p-9" aria-live="polite"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><CheckCircle2 className="h-7 w-7"/></span><p className="mt-4 text-[10px] font-semibold uppercase tracking-[.18em] text-emerald-700">Submission received</p><h2 className="mt-2 text-xl font-semibold dark:text-white">{selectedExam?.title ?? "Exam complete"}</h2><p className="mt-5 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white">{submission.score_out_of_70.toFixed(2)}<span className="ml-2 text-base font-medium text-slate-400">/ 70</span></p>{submission.total>0&&<p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{submission.correct} of {submission.total} answers correct.</p>}<p className="mt-3 text-xs text-slate-500">Your result has been recorded. Correct answers are not displayed here.</p><button type="button" onClick={()=>{setSubmission(null);setSelectedExam(null);updateAttempt(null);void loadExams();}} className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Return to exams</button></section>}

    {!loading && !submission && attempt && selectedExam && attempt.status === "in_progress" && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{selectedExam.subject} · {selectedExam.class_name} · {categoryLabel(selectedExam.category)}</p><h2 className="mt-1 truncate text-lg font-semibold dark:text-white">{selectedExam.title}</h2><p className="mt-1 text-xs text-slate-500">Question {questionIndex+1} of {attempt.questions.length} · {answeredCount} answered</p></div><div className={`flex items-center gap-2 self-start rounded-lg px-3 py-2 ${secondsLeft<=60?"bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300":"bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200"}`} aria-live="polite"><Clock3 className="h-4 w-4"/><span><span className="mr-2 text-[9px] font-semibold uppercase tracking-wide">Remaining</span><span className="font-mono text-lg font-bold">{formatTime(secondsLeft)}</span></span></div></div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]"><div className="min-w-0 p-4 sm:p-6"><div className="flex items-center justify-between text-[10px] text-slate-500"><span>Question progress</span><span>{answeredCount}/{attempt.questions.length} answered</span></div><div className="mt-2"><ProgressMeter value={(questionIndex+1)/attempt.questions.length*100} label={`Question ${questionIndex+1} of ${attempt.questions.length}`}/></div>{currentQuestion&&<div className="mt-6"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Question {questionIndex+1}</p><h3 className="mt-2 text-base font-semibold leading-7 text-slate-900 dark:text-white sm:text-lg">{currentQuestion.question_text}</h3><div className="mt-5 grid gap-2.5">{(["A","B","C","D"] as const).map((option)=>{const text=currentQuestion[`option_${option.toLowerCase()}` as "option_a"|"option_b"|"option_c"|"option_d"];return <button key={option} type="button" onClick={()=>saveAnswer(currentQuestion.id,option)} aria-pressed={currentQuestion.selected_option===option} className={`flex items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition-colors sm:p-4 ${currentQuestion.selected_option===option?"border-blue-500 bg-blue-50 text-blue-950 dark:bg-blue-950/40 dark:text-blue-100":"border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${currentQuestion.selected_option===option?"border-blue-500 bg-blue-600 text-white":"border-slate-300 text-slate-500 dark:border-slate-600"}`}>{option}</span><span className="pt-1 leading-5">{text}</span></button>})}</div></div>}<div className="mt-4 flex min-h-5 items-center justify-between gap-3 text-[10px] text-slate-500"><span role="status" className="truncate">{saveNotice||(savedAt?`Answers saved · ${savedAt}`:"Answers save automatically as you choose them.")}</span><span className="shrink-0">{answeredCount}/{attempt.questions.length}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><button type="button" disabled={questionIndex===0} onClick={()=>setQuestionIndex((index)=>Math.max(index-1,0))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold disabled:opacity-40 dark:border-slate-700"><ArrowLeft className="h-3.5 w-3.5"/>Previous</button><div className="flex gap-2"><button type="button" disabled={questionIndex===attempt.questions.length-1} onClick={()=>setQuestionIndex((index)=>Math.min(index+1,attempt.questions.length-1))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold disabled:opacity-40 dark:border-slate-700">Next<ArrowRight className="h-3.5 w-3.5"/></button><button type="button" disabled={submitting} onClick={()=>void submitAttempt()} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting?"Submitting…":secondsLeft===0?"Submit expired exam":"Submit exam"}</button></div></div></div><aside className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 lg:border-l lg:border-t-0"><div className="flex items-center justify-between"><p className="text-xs font-semibold dark:text-white">Questions</p><span className="text-[10px] text-slate-400">Tap to navigate</span></div><div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-4" aria-label="Question progress">{attempt.questions.map((question,index)=><button key={question.id} type="button" onClick={()=>setQuestionIndex(index)} aria-label={`Question ${index+1}${question.selected_option?", answered":", unanswered"}`} aria-current={questionIndex===index?"step":undefined} className={`h-9 rounded-lg text-[10px] font-semibold ${questionIndex===index?"bg-blue-600 text-white":question.selected_option?"bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200":"border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>{index+1}</button>)}</div><div className="mt-5 space-y-2 text-[10px] text-slate-500"><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-600"/>Current question</p><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Answered</p><p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300"/>Unanswered</p></div></aside></div></section>}

    {!loading && !submission && !attempt && <section><div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30"><span className="rounded-lg bg-white p-2 text-blue-700 dark:bg-slate-900 dark:text-blue-300"><FileText className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold dark:text-white">Your assessments</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Only published exams for your assigned class and subjects are listed.</p></div></div>{exams.length===0?<div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><BookOpen className="mx-auto h-8 w-8 text-slate-300"/><h3 className="mt-3 text-sm font-semibold dark:text-white">No exams available</h3><p className="mt-1 text-xs text-slate-500">There are no exams for your current class, session, and term.</p></div>:<div className="grid gap-4 xl:grid-cols-2">{exams.map((exam)=><article key={exam.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{exam.subject} · {exam.class_name} · {categoryLabel(exam.category)}</p><h3 className="mt-1 break-words text-sm font-semibold dark:text-white">{exam.title}</h3></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${exam.student_status==="completed"?"bg-emerald-50 text-emerald-700":exam.student_status==="in_progress"?"bg-amber-50 text-amber-800":"bg-blue-50 text-blue-700"}`}>{exam.student_status==="completed"?"Completed":exam.student_status==="in_progress"?"In progress":"Available"}</span></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500 dark:border-slate-800"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>{exam.duration_minutes} minutes</span><span>{exam.question_count} questions</span><span>{exam.session} · {exam.term}</span>{exam.student_status==="completed"&&exam.last_score!=null&&<span className="font-semibold text-slate-700 dark:text-slate-200">Score {Number(exam.last_score).toFixed(2)}/70</span>}</div>{exam.student_status!=="completed"&&<button type="button" disabled={starting} onClick={()=>exam.attempt_id?void openAttempt(exam.attempt_id,exam):(setSelectedExam(exam),setError(""))} className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{exam.student_status==="in_progress"?"Continue exam":"View instructions"}</button>}{selectedExam?.id===exam.id&&!attempt&&<div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"><h4 className="text-xs font-semibold dark:text-white">Before you start</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-5 text-slate-600 dark:text-slate-300"><li>You have {exam.duration_minutes} minutes. The timer begins when you start.</li><li>Your answers save as you select them. Keep your connection active.</li><li>You may move between questions and return to unanswered items.</li><li>When time expires, your attempt submits automatically.</li></ul><button type="button" disabled={starting} onClick={()=>void startExam(exam)} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{starting?"Starting…":"Start exam"}</button></div>}</article>)}</div>}</section>}
    <p className="text-center text-[10px] text-slate-400">Your selected answers are saved securely. The answer key remains private during the attempt.</p>
  </StudentPortalShell>;
}