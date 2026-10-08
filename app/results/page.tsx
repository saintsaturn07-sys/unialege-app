"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { ArrowDownToLine, ArrowUpRight, Bell, BookOpen, CalendarDays, ChartNoAxesCombined, CheckCircle2, CircleAlert, House, LogOut, Menu, Trophy, UserRound, Wallet, X, type LucideIcon } from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "home", group: "Overview" },
  { label: "My Subjects", href: "/courses", icon: "book", group: "Academics" },
  { label: "CBT / Exams", href: "/cbt", icon: "check", group: "Academics" },
  { label: "Results", href: "/results", icon: "results", group: "Academics" },
  { label: "Timetable", href: "/timetable", icon: "calendar", group: "Academics" },
  { label: "Fees & Payments", href: "/fees", icon: "wallet", group: "School" },
  { label: "Announcements", href: "/announcements", icon: "bell", group: "School" },
  { label: "My Profile", href: "/profile", icon: "user", group: "School" },
];

const sessions = ["2026/2027", "2025/2026"];
const terms = ["First Term", "Second Term", "Third Term"];
const iconMap: Record<string, LucideIcon> = { home: House, book: BookOpen, check: CheckCircle2, results: ChartNoAxesCombined, calendar: CalendarDays, wallet: Wallet, bell: Bell, user: UserRound, arrow: ArrowUpRight, download: ArrowDownToLine, position: Trophy, alert: CircleAlert, logout: LogOut, menu: Menu, close: X };
function Icon({ name, className = "" }: { name: string; className?: string }) { const IconComponent = iconMap[name] ?? BookOpen; return <IconComponent aria-hidden="true" className={className} strokeWidth={1.8} />; }
function Panel({ children, className = "" }: { children: ReactNode; className?: string }) { return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>{children}</section>; }

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const navGroups = ["Overview", "Academics", "School"];
  const summaryIcons: Record<string, string> = { "Overall Average": "results", "Total Marks": "check", "Total Subjects": "book", "Subjects Passed": "check", "Class Position": "position" };
  const shown = (value: number | null, maximum?: number) => value === null ? "None" : maximum === undefined ? String(value) : `${value} / ${maximum}`;

  return <main className="min-h-screen overflow-x-hidden bg-[#f5f6fa] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="min-h-screen md:flex">
      <div className={`${mobileNavOpen ? "fixed inset-0 z-40 bg-slate-950/55" : "hidden"} md:sticky md:top-0 md:block md:h-screen md:w-[264px] md:shrink-0`} onClick={() => setMobileNavOpen(false)}>
        <aside onClick={(event) => event.stopPropagation()} className={`absolute inset-y-0 left-0 flex w-[278px] max-w-[86vw] flex-col bg-[#111827] text-slate-300 shadow-2xl transition-transform md:relative md:h-screen md:w-full md:max-w-none md:shadow-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white shadow-lg shadow-blue-950/30">U</span><span><span className="block text-sm font-bold tracking-[.1em] text-white">UNIALEGE</span><span className="mt-0.5 block text-[10px] font-medium tracking-wide text-slate-400">STUDENT PORTAL</span></span></Link>
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="rounded-md p-2 text-slate-400 hover:bg-white/10 md:hidden"><Icon name="close" className="h-5 w-5" /></button>
          </div>
          <nav aria-label="Student navigation" className="flex-1 overflow-y-auto px-3 py-5">
            {navGroups.map((group) => <div key={group} className="mb-6"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{group}</p><div className="space-y-1">{navigation.filter((item) => item.group === group).map((item) => { const active = item.label === "Results"; return <Link key={item.label} href={item.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? "bg-blue-600 text-white shadow-md shadow-blue-950/30" : "text-slate-400 hover:bg-white/[.06] hover:text-white"}`}><Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}</Link>; })}</div></div>)}
          </nav>
          <div className="shrink-0 border-t border-white/10 p-3"><Link href="/profile" onClick={() => setMobileNavOpen(false)} className="flex min-w-0 items-center gap-3 rounded-lg p-2.5 hover:bg-white/[.06]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200 ring-1 ring-blue-300/20">{studentInitials}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{student.fullName}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{student.className} · {student.admissionNumber}</span></span><Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-500" /></Link><Link href="/login" onClick={handleLogout} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Icon name="logout" className="h-4 w-4" /> Sign out</Link></div>
        </aside>
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"><Icon name="menu" className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Academics <span className="px-1 text-slate-300">/</span> Results</p><h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Academic Results</h1></div></div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4"><span className="hidden text-right sm:block"><span className="block text-[11px] font-medium text-slate-500">{session}</span><span className="mt-0.5 block text-[10px] text-slate-400">{term}</span></span><Link href="/announcements" aria-label="Notifications and announcements" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="bell" className="h-[18px] w-[18px]" /></Link><Link href="/profile" className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-300/20">{studentInitials}</span><span className="hidden text-left lg:block"><span className="block max-w-36 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{student.fullName}</span><span className="mt-0.5 block text-[10px] text-slate-500">Student account</span></span></Link></div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">Student report</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Academic Results</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Review your published subject scores, grades, and class standing for the selected academic period.</p></div><div className="flex flex-wrap gap-2.5"><label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Session<select value={session} onChange={(event) => setSession(event.target.value)} className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{sessionChoices.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="flex flex-col gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Term<select value={term} onChange={(event) => setTerm(event.target.value)} className="min-w-32 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">{terms.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div></section>

          <section aria-label="Academic summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{summary.map((item) => <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="flex items-start justify-between gap-3"><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"><Icon name={summaryIcons[item.label]} className="h-4 w-4" /></span></div><p className="mt-4 break-words text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">{item.value}</p><p className="mt-1.5 min-h-5 text-[10px] leading-4 text-slate-400">{item.note}</p></article>)}</section>

          <Panel className="overflow-hidden"><div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:px-6"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"><Icon name="book" className="h-4 w-4" /></span><h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Subject results</h2></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Published formal results for {term} · {session}.</p></div><button type="button" onClick={() => void downloadReport()} disabled={downloading || loading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><Icon name="download" className="h-4 w-4" />{downloading ? "Preparing report…" : "Download report"}</button></div>
            {downloadMessage && <p role="status" className="mx-5 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 sm:mx-6">{downloadMessage}</p>}
            {resultsError && <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:mx-6">{resultsError}</p>}
            <div className="space-y-3 p-4 sm:p-5 sm:pt-4">{loading ? <div role="status" className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center text-xs text-slate-500 dark:border-slate-700">Loading your results…</div> : resultsError ? null : results.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-800/30"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm dark:bg-slate-800"><Icon name="alert" className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">No published results yet</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">No results have been recorded for {term} · {session}. When formal results are published, they will appear here.</p></div> : results.map((result) => <article key={result.id} className="rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><Icon name="book" className="h-4 w-4" /></span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{result.subject}</h3><p className="mt-0.5 text-[10px] text-slate-400">{term} · {session}</p></div></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${result.total === null ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" : result.grade === "F" ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>Grade {result.total === null ? "None" : result.grade}</span><span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">{result.total === null ? "No total" : result.remark}</span></div></div><dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0"><div className="px-4 py-3.5 sm:px-5"><dt className="text-[10px] font-medium text-slate-400">CA score</dt><dd className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{shown(result.ca, 30)}</dd></div><div className="px-4 py-3.5 sm:px-5"><dt className="text-[10px] font-medium text-slate-400">Exam score</dt><dd className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{shown(result.exam, 70)}</dd></div><div className="px-4 py-3.5 sm:px-5"><dt className="text-[10px] font-medium text-slate-400">Total</dt><dd className="mt-1.5 text-sm font-bold text-slate-950 dark:text-white">{shown(result.total, 100)}</dd></div><div className="border-t border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:border-t-0 sm:px-5"><dt className="text-[10px] font-medium text-slate-400">Position</dt><dd className="mt-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{result.subjectPosition ?? "None"}</dd></div></dl>{result.total !== null && <div className="px-4 pb-3 sm:px-5"><span className="text-[10px] text-slate-400">{result.remark}</span></div>}</article>)}</div>
            {!loading && results.length > 0 && <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800 sm:px-6">Total score is calculated as CA score + exam score.</p>}
          </Panel>

          <section aria-label="Report comments" className="grid gap-4 lg:grid-cols-2"><Panel className="p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"><UserRound className="h-4 w-4" /></span><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Teacher&apos;s Comment</h2></div><p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">Teacher comments are not available for this report.</p></Panel><Panel className="p-5 sm:p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300"><House className="h-4 w-4" /></span><h2 className="text-sm font-semibold text-slate-900 dark:text-white">Principal&apos;s Comment</h2></div><p className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">Principal comments are not available for this report.</p></Panel></section>

          <footer className="pb-3 text-center text-[10px] text-slate-400">© 2026 UniAllege · Student portal</footer>
        </div>
      </div>
    </div>
  </main>;
}
