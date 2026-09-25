"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type DayName = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
type ClassEntry = { subject: string; teacher: string; time: string; period: number; tone: string };

const days: DayName[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "＄" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

const timetable: Record<DayName, ClassEntry[]> = {
  Monday: [
    { subject: "Mathematics", teacher: "Mrs. Grace Bello", time: "8:00–8:40 AM", period: 1, tone: "bg-blue-50 text-blue-800 border-blue-200" },
    { subject: "English Language", teacher: "Mr. Daniel James", time: "8:40–9:20 AM", period: 2, tone: "bg-violet-50 text-violet-800 border-violet-200" },
    { subject: "Biology", teacher: "Mrs. Ada Okafor", time: "9:40–10:20 AM", period: 3, tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { subject: "Physical Education", teacher: "Coach David", time: "10:20–11:00 AM", period: 4, tone: "bg-orange-50 text-orange-800 border-orange-200" },
    { subject: "Chemistry", teacher: "Mr. Peter Eze", time: "11:20–12:00 PM", period: 5, tone: "bg-amber-50 text-amber-800 border-amber-200" },
    { subject: "Government", teacher: "Mr. Samuel Adeyemi", time: "12:00–12:40 PM", period: 6, tone: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  ],
  Tuesday: [
    { subject: "English Language", teacher: "Mr. Daniel James", time: "8:00–8:40 AM", period: 1, tone: "bg-violet-50 text-violet-800 border-violet-200" },
    { subject: "Physics", teacher: "Mr. Peter Eze", time: "8:40–9:20 AM", period: 2, tone: "bg-sky-50 text-sky-800 border-sky-200" },
    { subject: "Mathematics", teacher: "Mrs. Grace Bello", time: "9:40–10:20 AM", period: 3, tone: "bg-blue-50 text-blue-800 border-blue-200" },
    { subject: "Computer Studies", teacher: "Mrs. Bisi Okafor", time: "10:20–11:00 AM", period: 4, tone: "bg-teal-50 text-teal-800 border-teal-200" },
    { subject: "Economics", teacher: "Mrs. Mary Williams", time: "11:20–12:00 PM", period: 5, tone: "bg-rose-50 text-rose-800 border-rose-200" },
    { subject: "Civic Education", teacher: "Mr. Samuel Adeyemi", time: "12:00–12:40 PM", period: 6, tone: "bg-orange-50 text-orange-800 border-orange-200" },
  ],
  Wednesday: [
    { subject: "Biology", teacher: "Mrs. Ada Okafor", time: "8:00–8:40 AM", period: 1, tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { subject: "Chemistry", teacher: "Mr. Peter Eze", time: "8:40–9:20 AM", period: 2, tone: "bg-amber-50 text-amber-800 border-amber-200" },
    { subject: "English Language", teacher: "Mr. Daniel James", time: "9:40–10:20 AM", period: 3, tone: "bg-violet-50 text-violet-800 border-violet-200" },
    { subject: "Physical Education", teacher: "Coach David", time: "10:20–11:00 AM", period: 4, tone: "bg-orange-50 text-orange-800 border-orange-200" },
    { subject: "Mathematics", teacher: "Mrs. Grace Bello", time: "11:20–12:00 PM", period: 5, tone: "bg-blue-50 text-blue-800 border-blue-200" },
    { subject: "Computer Studies", teacher: "Mrs. Bisi Okafor", time: "12:00–12:40 PM", period: 6, tone: "bg-teal-50 text-teal-800 border-teal-200" },
  ],
  Thursday: [
    { subject: "Physics", teacher: "Mr. Peter Eze", time: "8:00–8:40 AM", period: 1, tone: "bg-sky-50 text-sky-800 border-sky-200" },
    { subject: "Government", teacher: "Mr. Samuel Adeyemi", time: "8:40–9:20 AM", period: 2, tone: "bg-indigo-50 text-indigo-800 border-indigo-200" },
    { subject: "Economics", teacher: "Mrs. Mary Williams", time: "9:40–10:20 AM", period: 3, tone: "bg-rose-50 text-rose-800 border-rose-200" },
    { subject: "Mathematics", teacher: "Mrs. Grace Bello", time: "10:20–11:00 AM", period: 4, tone: "bg-blue-50 text-blue-800 border-blue-200" },
    { subject: "English Language", teacher: "Mr. Daniel James", time: "11:20–12:00 PM", period: 5, tone: "bg-violet-50 text-violet-800 border-violet-200" },
    { subject: "Biology", teacher: "Mrs. Ada Okafor", time: "12:00–12:40 PM", period: 6, tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  ],
  Friday: [
    { subject: "Computer Studies", teacher: "Mrs. Bisi Okafor", time: "8:00–8:40 AM", period: 1, tone: "bg-teal-50 text-teal-800 border-teal-200" },
    { subject: "Civic Education", teacher: "Mr. Samuel Adeyemi", time: "8:40–9:20 AM", period: 2, tone: "bg-orange-50 text-orange-800 border-orange-200" },
    { subject: "Chemistry", teacher: "Mr. Peter Eze", time: "9:40–10:20 AM", period: 3, tone: "bg-amber-50 text-amber-800 border-amber-200" },
    { subject: "Economics", teacher: "Mrs. Mary Williams", time: "10:20–11:00 AM", period: 4, tone: "bg-rose-50 text-rose-800 border-rose-200" },
    { subject: "Physics", teacher: "Mr. Peter Eze", time: "11:20–12:00 PM", period: 5, tone: "bg-sky-50 text-sky-800 border-sky-200" },
    { subject: "Physical Education", teacher: "Coach David", time: "12:00–12:40 PM", period: 6, tone: "bg-orange-50 text-orange-800 border-orange-200" },
  ],
};

const schoolEvents = [
  { date: "24 SEP", type: "Test", title: "Mathematics algebra test", detail: "Thursday · Period 2", tone: "bg-blue-100 text-blue-700" },
  { date: "05 OCT", type: "Examination", title: "First term examinations begin", detail: "Monday · See exam timetable", tone: "bg-violet-100 text-violet-700" },
  { date: "10 OCT", type: "PTA Meeting", title: "Parents and Teachers Association", detail: "Saturday · 10:00 AM · School hall", tone: "bg-amber-100 text-amber-700" },
  { date: "16 OCT", type: "School Event", title: "Inter-house sports day", detail: "Friday · School field", tone: "bg-emerald-100 text-emerald-700" },
];

function getToday(): DayName {
  const weekday = new Date().getDay();
  return weekday >= 1 && weekday <= 5 ? days[weekday - 1] : "Monday";
}

export default function TimetablePage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
      setSelectedDay(getToday());
    } else {
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    clearStudentSession();
  }

  if (!student) {
    return <main className="min-h-screen bg-slate-50" aria-busy="true" />;
  }

  const studentInitials = student.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @keyframes timetable-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .timetable-rise { animation: timetable-rise 500ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .timetable-rise { animation: none; } }
      `}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">U</span>
            <span><span className="block text-lg font-bold tracking-tight">UNIALEGE</span><span className="block text-xs text-slate-500">Secondary portal</span></span>
          </Link>

          <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">
            {navigation.map((item) => {
              const active = item.label === "Timetable";
              return (
                <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                  <span aria-hidden="true" className="w-5 text-center text-base">{item.icon}</span>{item.label}
                </Link>
              );
            })}
            <Link href="/login" onClick={handleLogout} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 md:hidden"><span aria-hidden="true" className="w-5 text-center">↪</span> Logout</Link>
          </nav>

          <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/login" onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700"><span aria-hidden="true" className="w-5 text-center">↪</span> Logout</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Secondary student portal</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Class Timetable</h1></div>
            <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{student.className} · {student.term}</span><div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" aria-label={`${student.fullName} profile`}>{studentInitials}</div></div>
          </header>

          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="timetable-rise flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8 lg:flex-row lg:items-end">
              <div><p className="text-sm font-medium text-blue-300">Your school week</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hello, {student.fullName}</h2><p className="mt-2 text-sm text-slate-300">Check your classes and plan the week ahead.</p></div>
              <dl className="grid grid-cols-2 gap-x-7 gap-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:min-w-[570px]">
                <div><dt className="text-xs text-slate-400">Full Name</dt><dd className="mt-1 text-sm font-semibold">{student.fullName}</dd></div>
                <div><dt className="text-xs text-slate-400">Admission Number</dt><dd className="mt-1 text-sm font-semibold">{student.admissionNumber}</dd></div>
                <div><dt className="text-xs text-slate-400">Class</dt><dd className="mt-1 text-sm font-semibold">{student.className}</dd></div>
                <div><dt className="text-xs text-slate-400">Session</dt><dd className="mt-1 text-sm font-semibold">{student.session}</dd></div>
                <div><dt className="text-xs text-slate-400">Term</dt><dd className="mt-1 text-sm font-semibold">{student.term}</dd></div>
              </dl>
            </section>

            <section className="timetable-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "80ms" }}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div><h2 className="text-lg font-bold">Today&apos;s Classes</h2><p className="mt-1 text-sm text-slate-500">Showing {selectedDay}&apos;s classes and periods</p></div>
                <label className="flex items-center gap-3 sm:hidden"><span className="text-sm font-medium text-slate-500">Choose day</span><select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value as DayName)} className="min-w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{days.map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {timetable[selectedDay].map((entry, index) => (
                  <article key={`${entry.subject}-${entry.period}`} className={`timetable-rise rounded-xl border p-4 ${entry.tone}`} style={{ animationDelay: `${index * 45}ms` }}>
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide opacity-75">Period {entry.period}</p><h3 className="mt-1 font-semibold">{entry.subject}</h3></div><span className="rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold">{entry.time}</span></div>
                    <p className="mt-3 text-sm">{entry.teacher}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="timetable-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "140ms" }}>
              <div><h2 className="text-lg font-bold">Weekly Timetable</h2><p className="mt-1 text-sm text-slate-500">Sample timetable · Monday to Friday · Class {student.className}</p></div>
              <div className="mt-5 overflow-x-auto">
                <div className="grid min-w-[1000px] grid-cols-5 gap-3">
                  {days.map((day) => (
                    <section key={day} aria-label={`${day} classes`} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3"><h3 className="font-bold">{day}</h3><button type="button" onClick={() => setSelectedDay(day)} className="text-xs font-semibold text-blue-700 hover:underline">View day</button></div>
                      <div className="mt-3 space-y-2">
                        {timetable[day].map((entry) => (
                          <article key={`${day}-${entry.period}`} className={`rounded-lg border p-2.5 ${entry.tone}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wide">Period {entry.period} · {entry.time}</p>
                            <h4 className="mt-1 text-xs font-bold leading-snug">{entry.subject}</h4>
                            <p className="mt-1 text-[11px] leading-snug">{entry.teacher}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </section>

            <section id="school-calendar" className="timetable-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "200ms" }}>
              <div><h2 className="text-lg font-bold">Upcoming School Events</h2><p className="mt-1 text-sm text-slate-500">Upcoming dates to keep in mind</p></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {schoolEvents.map((event, index) => (
                  <article key={event.title} className="timetable-rise rounded-xl border border-slate-100 p-4" style={{ animationDelay: `${index * 55}ms` }}>
                    <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${event.tone}`}>{event.type}</span><time className="text-xs font-bold tracking-wide text-slate-500">{event.date}</time></div>
                    <h3 className="mt-3 text-sm font-semibold">{event.title}</h3><p className="mt-1 text-xs text-slate-500">{event.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
