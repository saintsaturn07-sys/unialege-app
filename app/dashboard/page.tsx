"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { fieldLabel, getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../lib/subjects";

const navigation = [
  { label: "Dashboard", href: "#dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "CBT / Exams", href: "/cbt", icon: "✓" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "＄" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

const announcements = [
  { category: "School notice", date: "Today · 9:15 AM", title: "Inter-house sports day is next Friday", detail: "Students should wear their house colours and arrive by 8:00 AM.", tone: "bg-blue-100 text-blue-700" },
  { category: "Academics", date: "Yesterday", title: "Revision timetable now available", detail: "The subject revision schedule has been shared with each class teacher.", tone: "bg-violet-100 text-violet-700" },
  { category: "Reminder", date: "Sep 18, 2026", title: "Return library books by month end", detail: "Please return borrowed books to the school library before Friday.", tone: "bg-amber-100 text-amber-700" },
];

const upcoming = [
  { day: "24", month: "SEP", type: "Test", title: "Mathematics · Algebra test", time: "Thursday · Period 2", tone: "border-blue-500" },
  { day: "29", month: "SEP", type: "Assignment", title: "Biology · Cells and tissues", time: "Tuesday · Submit in class", tone: "border-violet-500" },
  { day: "05", month: "OCT", type: "Examination", title: "First term examinations begin", time: "Monday · See exam timetable", tone: "border-amber-500" },
  { day: "09", month: "OCT", type: "School event", title: "Inter-house sports day", time: "Friday · School field", tone: "border-emerald-500" },
];

function gradeFor(score: number) {
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

export default function DashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
    } else {
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    clearStudentSession();
  }

  if (!student) {
    return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  }

  const studentInitials = student.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const subjects = getSubjectsForStudent(student.className, student.fieldOfStudy, student.tradeSubject);

  const overview = [
    { label: "Current Class", value: student.className, note: "Current class", icon: "▤", tone: "bg-blue-50 text-blue-700" },
    { label: "Overall Average", value: "Not available", note: "No grade average is calculated yet", icon: "✦", tone: "bg-violet-50 text-violet-700" },
    { label: "Attendance", value: "Not available", note: "No attendance records yet", icon: "✓", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Position in Class", value: "Not available", note: "Not available yet", icon: "↗", tone: "bg-amber-50 text-amber-700" },
  ];

  return (
    <main id="dashboard" className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @keyframes dashboard-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .dashboard-rise { animation: dashboard-rise 500ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .dashboard-rise { animation: none; } }
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
            {navigation.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                aria-current={index === 0 ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 md:px-4 ${index === 0 ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
              >
                <span aria-hidden="true" className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </a>
            ))}
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{student.session} Academic Session</p>
              <h1 className="mt-1 text-lg font-semibold sm:text-xl">Student dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:block">{student.term}</span>
              <div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" aria-label={`${student.fullName} profile`}>{studentInitials}</div>
            </div>
          </header>

          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="dashboard-rise rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-9 sm:py-9">
              <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                <div>
                  <p className="text-sm font-medium text-blue-300">Welcome back</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Hello, {student.fullName} <span aria-hidden="true">✦</span></h2>
                  <p className="mt-3 text-sm text-slate-300">Here&apos;s your school progress and what&apos;s coming up.</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-4 lg:min-w-[520px] lg:px-5">
                  <div><dt className="text-xs text-slate-400">Admission Number</dt><dd className="mt-1 text-sm font-semibold">{student.admissionNumber}</dd></div>
                  <div><dt className="text-xs text-slate-400">Class</dt><dd className="mt-1 text-sm font-semibold">{student.className}</dd></div>
                  <div><dt className="text-xs text-slate-400">Session</dt><dd className="mt-1 text-sm font-semibold">{student.session}</dd></div>
                  <div><dt className="text-xs text-slate-400">Term</dt><dd className="mt-1 text-sm font-semibold">{student.term}</dd></div>
                </dl>
              </div>
            </section>

            <section aria-label="Student overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {overview.map((item, index) => (
                <article key={item.label} className="dashboard-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: `${index * 70}ms` }}>
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-medium text-slate-500">{item.label}</p>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${item.tone}`} aria-hidden="true">{item.icon}</span>
                  </div>
                  <p className="mt-4 text-2xl font-bold tracking-tight">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                </article>
              ))}
            </section>

            <section id="subjects" className="dashboard-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">My Subjects</h2>
                  <p className="mt-1 text-sm text-slate-500">Subjects assigned for {student.className}{student.className.toUpperCase().startsWith("SS") ? ` · ${fieldLabel(student.fieldOfStudy)}` : ""}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{subjects.length} subjects</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {subjects.map((subject, index) => (
                  <article key={subject.name} className="dashboard-rise rounded-xl border border-slate-100 p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-sm" style={{ animationDelay: `${index * 45}ms` }}>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{subject.name}</h3>
                      <span className="text-xs font-medium text-slate-500">{subject.category}</span>
                    </div>
                  </article>
                ))}
                {subjects.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-4">{(isSeniorClass(student.className) && !student.fieldOfStudy) || (requiresTradeSubject(student.className) && !student.tradeSubject) ? "Your subject profile is incomplete. Please contact the school administrator to assign your field (if applicable) and trade subject." : "No subjects are configured for this class."}</p>}
              </div>
            </section>

            <div className="grid min-w-0 gap-7 xl:grid-cols-[1.25fr_1fr]">
              <section id="recent-results" className="dashboard-rise min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "120ms" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Recent Results</h2>
                    <p className="mt-1 text-sm text-slate-500">Your recorded results for this term</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-700">{student.term}</span>
                </div>
                <Link href="/results" className="mt-5 block rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-blue-700 hover:bg-blue-50">Open Academic Results to view your recorded scores.</Link>
              </section>

              <section id="upcoming" className="dashboard-rise min-w-0 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "170ms" }}>
                <div>
                  <h2 className="text-lg font-bold">Upcoming</h2>
                  <p className="mt-1 text-sm text-slate-500">Sample tests, assignments, and school events</p>
                </div>
                <div className="mt-5 space-y-4">
                  {upcoming.map((item) => (
                    <article key={item.title} className={`flex gap-4 border-l-2 pl-4 ${item.tone}`}>
                      <div className="w-10 shrink-0 text-center"><p className="text-lg font-bold leading-none">{item.day}</p><p className="mt-1 text-[10px] font-bold tracking-widest text-slate-500">{item.month}</p></div>
                      <div className="min-w-0"><span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{item.type}</span><h3 className="mt-0.5 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.time}</p></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section id="announcements" className="dashboard-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "220ms" }}>
              <div>
                <h2 className="text-lg font-bold">Announcements</h2>
                <p className="mt-1 text-sm text-slate-500">Sample notice preview · no official announcements are configured yet</p>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {announcements.map((announcement) => (
                  <article key={announcement.title} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${announcement.tone}`}>{announcement.category}</span><time className="text-xs text-slate-400">{announcement.date}</time></div>
                    <h3 className="mt-3 text-sm font-semibold">{announcement.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{announcement.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="fees" className="dashboard-rise flex flex-col justify-between gap-4 rounded-2xl bg-blue-700 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:p-6" style={{ animationDelay: "260ms" }}>
              <div><p className="text-sm font-medium text-blue-100">School Fees</p><h2 className="mt-1 text-lg font-bold">Fee information and payment updates</h2><p className="mt-1 text-sm text-blue-100">Contact the school office for your current fee balance.</p></div>
              <a href="/fees" className="inline-flex shrink-0 justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50">View fee details</a>
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
