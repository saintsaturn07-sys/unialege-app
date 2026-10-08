"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { CalendarDays, Clock3, UserRound } from "lucide-react";
import { StudentPortalShell } from "../components/student-portal-shell";

type Entry = { id: string; day_of_week: string; period: number; start_time: string; end_time: string; subject: string; teacher: string | null; class_name: string; target_stream: string | null; session: string; term: string };
const nav = [{ label: "Dashboard", href: "/dashboard" }, { label: "My Subjects", href: "/courses" }, { label: "CBT / Exams", href: "/cbt" }, { label: "Results", href: "/results" }, { label: "Fees", href: "/fees" }, { label: "Timetable", href: "/timetable" }, { label: "Announcements", href: "/announcements" }, { label: "Profile", href: "/profile" }];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetablePage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const current = getStudentSession();
    if (!current) { router.replace("/login"); return; }
    setStudent(current);
    void fetch("/api/student/timetable", { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
      const body = await response.json() as { entries?: Entry[]; error?: string };
      if (response.status === 401) { clearStudentSession(); router.replace("/login"); return; }
      if (!response.ok) throw new Error(body.error ?? "Unable to load your timetable.");
      setEntries(body.entries ?? []);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load your timetable."))
      .finally(() => setLoading(false));
  }, [router]);
  const byDay = useMemo(() => Object.fromEntries(days.map((day) => [day, entries.filter((entry) => entry.day_of_week === day)])) as Record<string, Entry[]>, [entries]);
  if (!student) return <main className="min-h-screen bg-slate-50" aria-busy="true" />;
  return <StudentPortalShell title="Class Timetable" student={student} period={`${student.session} · ${student.term}`} onLogout={clearStudentSession}>
    <section><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">Weekly schedule · {student.className}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Class timetable</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your published lessons for {student.term}, {student.session}.</p></section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
    {loading ? <div role="status" className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading timetable…</div> : entries.length === 0 ? <section className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-900"><CalendarDays className="mx-auto h-9 w-9 text-slate-300"/><h2 className="mt-3 text-sm font-semibold dark:text-white">No timetable published</h2><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">The school has not published timetable entries for your class and academic period.</p></section> : <section aria-label="Weekly timetable" className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{days.filter((day) => byDay[day].length).map((day) => <article key={day} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Class schedule</p><h2 className="mt-1 text-sm font-semibold dark:text-white">{day}</h2></div><CalendarDays className="h-4 w-4 text-slate-400"/></div><ol className="space-y-2 p-3 sm:p-4">{byDay[day].map((entry) => <li key={entry.id} className="flex min-w-0 gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800"><div className="flex w-[74px] shrink-0 flex-col justify-center border-r border-slate-100 pr-3 dark:border-slate-800"><span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Period</span><span className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">{entry.period}</span><span className="mt-1 whitespace-nowrap text-[9px] text-slate-500">{entry.start_time.slice(0,5)}–{entry.end_time.slice(0,5)}</span></div><div className="min-w-0 flex-1 self-center"><h3 className="break-words text-xs font-semibold text-slate-900 dark:text-slate-100">{entry.subject}</h3>{entry.teacher && <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500"><UserRound className="h-3 w-3"/>{entry.teacher}</p>}</div><Clock3 className="mt-1 h-4 w-4 shrink-0 text-slate-300"/></li>)}</ol></article>)}</section>}
  </StudentPortalShell>;
}