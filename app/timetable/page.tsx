"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

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
  return <main className="min-h-screen bg-slate-50 text-slate-900"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col md:flex-row"><aside className="border-b bg-white p-4 md:w-60 md:border-b-0 md:border-r"><Link href="/dashboard" className="block px-3 py-3 text-lg font-bold">UNIALEGE</Link><nav className="flex gap-1 overflow-x-auto md:flex-col">{nav.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === "/timetable" ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${item.href === "/timetable" ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}<Link href="/login" onClick={clearStudentSession} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50">Logout</Link></nav></aside><section className="min-w-0 flex-1 p-5 sm:p-8"><header className="mb-6"><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{student.className} · {student.session} · {student.term}</p><h1 className="mt-1 text-2xl font-bold">Class Timetable</h1><p className="mt-2 text-sm text-slate-500">Entries assigned to your class and academic period.</p></header>{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{loading ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading timetable…</p> : entries.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">No timetable published for this period</h2><p className="mt-2 text-sm text-slate-500">The school administrator has not entered timetable data for your class, session, and term.</p></div> : <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{days.filter((day) => byDay[day].length).map((day) => <section key={day} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><h2 className="border-b pb-3 text-lg font-bold">{day}</h2><ol className="mt-3 space-y-3">{byDay[day].map((entry) => <li key={entry.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-blue-700">Period {entry.period}</p><h3 className="mt-1 font-semibold">{entry.subject}</h3>{entry.teacher && <p className="mt-1 text-sm text-slate-500">{entry.teacher}</p>}</div><time className="whitespace-nowrap text-sm font-medium text-slate-600">{entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}</time></div></li>)}</ol></section>)}</div>}<footer className="mt-8 text-center text-xs text-slate-400">UniAllege · Secondary Student Portal</footer></section></div></main>;
}
