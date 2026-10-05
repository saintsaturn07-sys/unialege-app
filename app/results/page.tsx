"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { MetricCard, ProgressMeter, SectionHeading } from "../components/portal-ui";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "＄" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

const sessions = ["2026/2027", "2025/2026"];
const terms = ["First Term", "Second Term", "Third Term"];

type ResultRow = { id: string; subject: string; ca_score: number | null; exam_score: number | null; total: number | null; subject_position: number | null };
type ResultSummary = { total_marks: number | null; maximum_marks: number | null; percentage: number | null; average_subjects: number; class_position: number | null; minimum_subjects_for_position: number };

function gradeFor(score: number) {
  if (score >= 75) return "A";
  if (score >= 65) return "B";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  if (score >= 40) return "E";
  return "F";
}

function remarkFor(grade: string) {
  const remarks: Record<string, string> = {
    A: "Excellent",
    B: "Very Good",
    C: "Good",
    D: "Needs Improvement",
    E: "Pass",
    F: "Needs Support",
  };
  return remarks[grade] ?? "Needs Support";
}

export default function ResultsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [session, setSession] = useState(sessions[0]);
  const [term, setTerm] = useState(terms[0]);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [resultSummary, setResultSummary] = useState<ResultSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsError, setResultsError] = useState("");

  useEffect(() => {
    const activeSession = getStudentSession();
    if (activeSession) {
      setStudent(activeSession);
      setSession(activeSession.session);
      if (terms.includes(activeSession.term)) setTerm(activeSession.term);
    } else {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!student) return;
    let active = true;

    async function loadResults() {
      setLoading(true);
      setResultsError("");
      setResultRows([]);
      let response: Response;
      try { response = await fetch(`/api/student/results?session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`, { cache: "no-store" }); }
      catch { if (active) { setResultsError("We couldn't load your results. Please try again."); setLoading(false); } return; }
      const result = await response.json().catch(() => ({})) as { results?: ResultRow[]; summary?: ResultSummary; available_sessions?: string[] };
      if (!active) return;
      if (!response.ok) {
        setResultsError("We couldn’t load your results. Please try again.");
      } else {
        setResultRows(result.results ?? []);
        setResultSummary(result.summary ?? null);
        setAvailableSessions(result.available_sessions ?? []);
      }
      setLoading(false);
    }

    void loadResults();
    return () => { active = false; };
  }, [student, session, term]);

  const results = resultRows.map((row) => {
    const ca = row.ca_score === null ? null : Number(row.ca_score);
    const exam = row.exam_score === null ? null : Number(row.exam_score);
    const total = row.total ?? (ca !== null && exam !== null ? ca + exam : null);
    const grade = total === null ? "N/A" : gradeFor(total);
    return { id: row.id, subject: row.subject, ca, exam, total, grade, remark: remarkFor(grade), subjectPosition: row.subject_position };
  });

  function handleLogout() {
    clearStudentSession();
  }

  async function downloadReport() {
    setDownloading(true); setDownloadMessage("");
    try {
      const response = await fetch(`/api/student/results/report/pdf?session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(body.error ?? "Unable to download your report."); }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `unialege-report-${student?.admissionNumber ?? "student"}-${term.toLowerCase().replaceAll(" ", "-")}.pdf`; anchor.click(); URL.revokeObjectURL(url);
      setDownloadMessage("Your PDF report card downloaded and is ready to print.");
    } catch (error) { setDownloadMessage(error instanceof Error ? error.message : "Unable to download your report."); }
    finally { setDownloading(false); }
  }

  if (!student) {
    return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  }

  const sessionChoices = Array.from(new Set([student.session, ...availableSessions, session, ...sessions]));

  const studentInitials = student.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const completeResults = results.filter((result) => result.total !== null);
  const overallAverage = completeResults.length
    ? completeResults.reduce((sum, result) => sum + result.total!, 0) / completeResults.length
    : 0;
  const totalMarks = resultSummary?.total_marks;
  const maximumMarks = resultSummary?.maximum_marks;
  const subjectsPassed = results.filter((result) => result.total !== null && result.grade !== "F").length;
  const summary = [
    { label: "Overall Average", value: `${overallAverage.toFixed(1)}%`, note: `${term} · ${session}`, icon: "✦", tone: "bg-blue-50 text-blue-700" },
    { label: "Total Subjects", value: String(results.length), note: "Reported this term", icon: "▤", tone: "bg-violet-50 text-violet-700" },
    { label: "Subjects Passed", value: `${subjectsPassed} / ${results.length}`, note: "40% and above", icon: "✓", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Class Position", value: "Not available", note: "Rankings require sufficient published results", icon: "↗", tone: "bg-amber-50 text-amber-700" },
  ];
  summary[0] = { ...summary[0], value: resultSummary?.percentage == null ? "Not available" : `${resultSummary.percentage.toFixed(1)}%` };
  summary.splice(1, 0, { label: "Total Marks", value: totalMarks == null ? "Not available" : `${totalMarks} / ${maximumMarks}`, note: `${term} / ${session}`, icon: "Σ", tone: "bg-cyan-50 text-cyan-700" });
  summary[4] = { ...summary[4], value: resultSummary?.class_position ? String(resultSummary.class_position) : "Not available", note: resultSummary?.class_position ? `Based on at least ${resultSummary.minimum_subjects_for_position} published subjects` : "Insufficient published class results" };

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @keyframes results-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .results-rise { animation: results-rise 500ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .results-rise { animation: none; } }
      `}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">U</span>
            <span>
              <span className="block text-lg font-bold tracking-tight">UNIALEGE</span>
              <span className="block text-xs text-slate-500">Secondary portal</span>
            </span>
          </Link>

          <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">
            {navigation.map((item) => {
              const active = item.label === "Results";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                >
                  <span aria-hidden="true" className="w-5 text-center text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link href="/login" onClick={handleLogout} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 md:hidden">
              <span aria-hidden="true" className="w-5 text-center">↪</span> Logout
            </Link>
          </nav>

          <div className="hidden border-t border-slate-100 p-4 md:block">
            <Link href="/login" onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700">
              <span aria-hidden="true" className="w-5 text-center">↪</span> Logout
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Secondary student portal</p>
              <h1 className="mt-1 text-lg font-semibold sm:text-xl">Academic Results</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:block">{term} · {session}</span>
              <div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" aria-label={`${student.fullName} profile`}>{studentInitials}</div>
            </div>
          </header>

          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="results-rise flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-medium text-blue-300">Student report card</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Academic Results</h2>
                <p className="mt-2 text-sm text-slate-300">Your recorded subject results for the selected period.</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-7 gap-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:min-w-[570px]">
                <div><dt className="text-xs text-slate-400">Full Name</dt><dd className="mt-1 text-sm font-semibold">{student.fullName}</dd></div>
                <div><dt className="text-xs text-slate-400">Admission Number</dt><dd className="mt-1 text-sm font-semibold">{student.admissionNumber}</dd></div>
                <div><dt className="text-xs text-slate-400">Class</dt><dd className="mt-1 text-sm font-semibold">{student.className}</dd></div>
                <div><dt className="text-xs text-slate-400">Session</dt><dd className="mt-1 text-sm font-semibold">{session}</dd></div>
                <div><dt className="text-xs text-slate-400">Term</dt><dd className="mt-1 text-sm font-semibold">{term}</dd></div>
              </dl>
            </section>

            <section className="results-rise grid gap-3 sm:grid-cols-2" aria-label="Select report period">
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Session
                <select value={session} onChange={(event) => setSession(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  {sessionChoices.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Term
                <select value={term} onChange={(event) => setTerm(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  {terms.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </section>

            <section aria-label="Results summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {summary.map((item) => <MetricCard key={item.label} label={item.label} value={item.value} detail={item.note} icon={item.icon} tone={item.label === "Class Position" ? "amber" : item.label === "Total Marks" ? "cyan" : "blue"} />)}
            </section>

            <section className="results-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "180ms" }}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <SectionHeading eyebrow={`${term} · ${session}`} title="Subject results" description="Published formal results across your subjects." />
                <button type="button" onClick={() => void downloadReport()} disabled={downloading || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <span aria-hidden="true">↓</span> {downloading ? "Preparing…" : "Download Report"}
                </button>
              </div>
              {downloadMessage && <p role="status" className="mt-3 text-sm text-blue-700">{downloadMessage}</p>}
              {resultsError && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{resultsError}</p>}

              <div className="mt-5 grid gap-3 md:hidden">
                {loading ? <p role="status" className="rounded-xl border border-slate-100 p-5 text-sm text-slate-500">Loading your results…</p> : !resultsError && results.length === 0 ? <p className="rounded-xl border border-slate-100 p-5 text-sm text-slate-500">No results have been recorded for {term} · {session} yet.</p> : results.map((result, index) => (
                  <article key={result.id} className="results-rise rounded-xl border border-slate-100 p-4" style={{ animationDelay: `${index * 35}ms` }}>
                    <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{result.subject}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${result.grade === "F" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{result.grade} · {result.remark}</span></div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-slate-400">CA Score</dt><dd className="mt-1 font-medium">{result.ca ?? "Not available"}/30</dd></div>
                      <div><dt className="text-xs text-slate-400">Exam Score</dt><dd className="mt-1 font-medium">{result.exam ?? "Not available"}/70</dd></div>
                      <div><dt className="text-xs text-slate-400">Total</dt><dd className="mt-1 font-bold">{result.total ?? "Not available"}/100</dd></div>
                      <div><dt className="text-xs text-slate-400">Subject Position</dt><dd className="mt-1 font-medium">{result.subjectPosition ?? "Not available"}</dd></div>
                    </dl>
                    {result.total !== null && <div className="mt-4"><ProgressMeter value={result.total} label={`${result.subject} total score`} tone={result.total >= 40 ? "emerald" : "amber"} /></div>}
                  </article>
                ))}
              </div>

              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th scope="col" className="px-3 py-3 font-semibold">Subject</th><th scope="col" className="px-3 py-3 font-semibold">CA Score</th><th scope="col" className="px-3 py-3 font-semibold">Exam Score</th><th scope="col" className="px-3 py-3 font-semibold">Total Score</th><th scope="col" className="px-3 py-3 font-semibold">Grade</th><th scope="col" className="px-3 py-3 font-semibold">Subject Position</th><th scope="col" className="px-3 py-3 font-semibold">Remark</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">Loading your results…</td></tr> : !resultsError && results.length === 0 ? <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">No results have been recorded for {term} · {session} yet.</td></tr> : results.map((result, index) => (
                      <tr key={result.id} className="results-rise transition-colors hover:bg-slate-50" style={{ animationDelay: `${index * 35}ms` }}>
                        <td className="px-3 py-4 text-sm font-semibold">{result.subject}</td>
                        <td className="px-3 py-4 text-sm text-slate-600">{result.ca ?? "Not available"}/30</td>
                        <td className="px-3 py-4 text-sm text-slate-600">{result.exam ?? "Not available"}/70</td>
                        <td className="px-3 py-4 text-sm font-bold">{result.total ?? "Not available"}/100</td>
                        <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${result.grade === "F" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{result.grade}</span></td>
                        <td className="px-3 py-4 text-sm text-slate-600">{result.subjectPosition ?? "Not available"}</td>
                        <td className="px-3 py-4 text-sm text-slate-600">{result.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">Total Score is calculated as CA Score + Exam Score.</p>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="results-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "230ms" }}>
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">T</span><h2 className="text-lg font-bold">Teacher&apos;s Comment</h2></div>
                <p className="mt-4 leading-7 text-slate-600">Teacher comments are not available for this report.</p>
              </article>
              <article className="results-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "280ms" }}>
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700" aria-hidden="true">P</span><h2 className="text-lg font-bold">Principal&apos;s Comment</h2></div>
                <p className="mt-4 leading-7 text-slate-600">Principal comments are not available for this report.</p>
              </article>
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
