"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { fieldLabel, getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../lib/subjects";
import { MetricCard, ProgressMeter, SectionHeading } from "../components/portal-ui";

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

type AnnouncementPreview = { id: string; category: string; published_at: string | null; created_at: string; title: string; description: string };
type Performance = { percentage: number | null; class_position: number | null; total_marks: number | null; maximum_marks: number | null };
type ExamPreview = { id: string; title: string; subject: string; duration_minutes: number; student_status: "available" | "in_progress" | "completed" };
type TimetablePreview = { id: string; day_of_week: string; period: number; start_time: string; subject: string; teacher: string | null };
type FeePreview = { total_due: number; total_paid: number; fee_items: { id: string; name: string; balance: number }[]; payments: { id: string; status: string }[] };

export default function DashboardPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [announcementItems, setAnnouncementItems] = useState<AnnouncementPreview[]>([]);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [examItems, setExamItems] = useState<ExamPreview[]>([]);
  const [timetableItems, setTimetableItems] = useState<TimetablePreview[]>([]);
  const [feeSummary, setFeeSummary] = useState<FeePreview | null>(null);

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
      void fetch("/api/student/announcements", { cache: "no-store", credentials: "same-origin" })
        .then(async (response) => { const result = await response.json() as { announcements?: AnnouncementPreview[] }; if (response.ok) setAnnouncementItems(result.announcements ?? []); })
        .catch(() => setAnnouncementItems([]));
      void fetch(`/api/student/results?session=${encodeURIComponent(session.session)}&term=${encodeURIComponent(session.term)}`, { cache: "no-store" }).then(async (response) => { if (response.ok) { const result = await response.json() as { summary?: Performance }; setPerformance(result.summary ?? null); } }).catch(() => {});
      void fetch("/api/cbt/exams", { cache: "no-store" }).then(async (response) => { if (response.ok) { const result = await response.json() as { exams?: ExamPreview[] }; setExamItems(result.exams ?? []); } }).catch(() => {});
      void fetch("/api/student/timetable", { cache: "no-store" }).then(async (response) => { if (response.ok) { const result = await response.json() as { entries?: TimetablePreview[] }; setTimetableItems(result.entries ?? []); } }).catch(() => {});
      void fetch("/api/student/fees", { cache: "no-store", credentials: "same-origin" }).then(async (response) => { if (response.ok) setFeeSummary(await response.json() as FeePreview); }).catch(() => {});
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
    { label: "Current Class", value: student.className, note: student.fieldOfStudy ? fieldLabel(student.fieldOfStudy) : "Enrolled class", icon: "▤", tone: "bg-blue-50 text-blue-700", href: "/courses" },
    { label: "Overall Average", value: performance?.percentage == null ? "Not available" : `${performance.percentage.toFixed(1)}%`, note: performance ? "Published formal results" : "No published formal results", icon: "✦", tone: "bg-violet-50 text-violet-700", href: "/results" },
    { label: "Attendance", value: "Not available", note: "Attendance records are not configured", icon: "✓", tone: "bg-emerald-50 text-emerald-700", href: "/dashboard" },
    { label: "Position in Class", value: performance?.class_position ? String(performance.class_position) : "Not available", note: performance?.class_position ? "Based on at least three published subjects" : "Insufficient published class results", icon: "↗", tone: "bg-amber-50 text-amber-700", href: "/results" },
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
                  <p className="mt-3 text-sm text-slate-300">Your learning, school updates, and next steps for this term.</p>
                  <div className="mt-5 flex flex-wrap gap-2"><Link href="/cbt" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">Open exams</Link><Link href="/profile" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:bg-white/10">Account settings</Link></div>
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
              {overview.map((item) => <MetricCard key={item.label} label={item.label} value={item.value} detail={item.note} icon={item.icon} tone={item.label === "Overall Average" ? "violet" : item.label === "Attendance" ? "emerald" : item.label === "Position in Class" ? "amber" : "blue"} href={item.href} />)}
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
                  <p className="mt-1 text-sm text-slate-500">Published exams and your current timetable</p>
                </div>
                <div className="mt-5 space-y-3">{examItems.filter((exam) => exam.student_status !== "completed").slice(0, 3).map((exam) => <Link key={exam.id} href="/cbt" className="block rounded-xl border-l-2 border-blue-500 bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{exam.student_status === "in_progress" ? "In progress" : "CBT exam"}</span><h3 className="mt-1 text-sm font-semibold">{exam.subject} · {exam.title}</h3><p className="mt-1 text-xs text-slate-500">{exam.duration_minutes} minutes</p></Link>)}{timetableItems.slice(0, 3).map((entry) => <Link key={entry.id} href="/timetable" className="block rounded-xl border-l-2 border-violet-500 bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">{entry.day_of_week} · Period {entry.period}</span><h3 className="mt-1 text-sm font-semibold">{entry.subject}</h3><p className="mt-1 text-xs text-slate-500">{entry.start_time.slice(0, 5)}{entry.teacher ? ` · ${entry.teacher}` : ""}</p></Link>)}{!examItems.some((exam) => exam.student_status !== "completed") && timetableItems.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No published exams or timetable entries are available for this period.</p>}</div>
              </section>
            </div>

            <section id="announcements" className="dashboard-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "220ms" }}>
              <SectionHeading eyebrow="School updates" title="Announcements" description="Latest notices published for your class." action={<Link href="/announcements" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-50">All announcements</Link>} />
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {announcementItems.slice(0, 3).map((announcement) => (
                  <article key={announcement.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">{announcement.category}</span><time className="text-xs text-slate-400">{new Date(announcement.published_at ?? announcement.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</time></div>
                    <h3 className="mt-3 text-sm font-semibold">{announcement.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{announcement.description}</p>
                  </article>
                ))}
                {announcementItems.length === 0 && <p className="rounded-xl border border-slate-100 p-6 text-center text-sm text-slate-500 lg:col-span-3">There are no published announcements for your class.</p>}
              </div>
            </section>

            <section id="fees" className="dashboard-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "260ms" }}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-blue-700">Fee account</p><h2 className="mt-1 text-xl font-bold">Fees and payments</h2><p className="mt-1 text-sm text-slate-500">Live balance from your recorded fee items and payments.</p></div><Link href="/fees" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-900/10 hover:bg-blue-800">Open fee account</Link></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2"><MetricCard label="Total due" value={feeSummary ? `₦${Number(feeSummary.total_due).toLocaleString("en-NG")}` : "Loading"} detail={`${feeSummary?.fee_items.length ?? 0} active fee items`} tone="blue" icon="₦" /><MetricCard label="Total paid" value={feeSummary ? `₦${Number(feeSummary.total_paid).toLocaleString("en-NG")}` : "Loading"} detail={`${feeSummary?.payments.filter((payment) => payment.status === "completed").length ?? 0} completed payments`} tone="emerald" icon="✓" /></div>
              {feeSummary && feeSummary.total_due > 0 && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-medium text-slate-500"><span>Paid toward current fees</span><span>{Math.min(100, Math.round(feeSummary.total_paid / feeSummary.total_due * 100))}%</span></div><ProgressMeter value={feeSummary.total_paid / feeSummary.total_due * 100} label="Paid toward current fees" tone="emerald" /></div>}
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
