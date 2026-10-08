"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Bell, BookOpen, CalendarDays, ChartNoAxesCombined, CircleCheck, Clock3, House, LogOut, Menu, UserRound, Wallet, X, type LucideIcon } from "lucide-react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { fieldLabel, getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../lib/subjects";

const navigation = [
  { label: "Dashboard", href: "#dashboard", icon: "home", group: "Overview" },
  { label: "My Subjects", href: "/courses", icon: "book", group: "Academics" },
  { label: "CBT / Exams", href: "/cbt", icon: "check", group: "Academics" },
  { label: "Results", href: "/results", icon: "chart", group: "Academics" },
  { label: "Timetable", href: "/timetable", icon: "calendar", group: "Academics" },
  { label: "Fees & Payments", href: "/fees", icon: "wallet", group: "School" },
  { label: "Announcements", href: "/announcements", icon: "notice", group: "School" },
  { label: "My Profile", href: "/profile", icon: "user", group: "School" },
];

type AnnouncementPreview = { id: string; category: string; published_at: string | null; created_at: string; title: string; description: string };
type Performance = { percentage: number | null; class_position: number | null; total_marks: number | null; maximum_marks: number | null };
type ExamPreview = { id: string; title: string; subject: string; duration_minutes: number; student_status: "available" | "in_progress" | "completed" };
type TimetablePreview = { id: string; day_of_week: string; period: number; start_time: string; subject: string; teacher: string | null };
type FeePreview = { total_due: number; total_paid: number; fee_items: { id: string; name: string; balance: number }[]; payments: { id: string; status: string }[] };

const iconMap: Record<string, LucideIcon> = { home: House, book: BookOpen, check: CircleCheck, chart: ChartNoAxesCombined, wallet: Wallet, calendar: CalendarDays, notice: Bell, user: UserRound, arrow: ArrowUpRight, clock: Clock3, logout: LogOut, menu: Menu, close: X, bell: Bell };

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const IconComponent = iconMap[name] ?? BookOpen;
  return <IconComponent aria-hidden="true" className={className} strokeWidth={1.8} />;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

function PanelTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6"><div><h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>}</div>{action}</div>;
}

function Metric({ label, value, detail, icon, tone, href }: { label: string; value: ReactNode; detail: string; icon: string; tone: string; href: string }) {
  return <Link href={href} className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 sm:p-5">
    <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}><Icon name={icon} className="h-[18px] w-[18px]" /></span></div>
    <p className="mt-4 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p><p className="mt-1.5 min-h-5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
  </Link>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  if (!student) return <main className="min-h-screen bg-[#f4f6fa] dark:bg-slate-950" aria-busy="true" />;

  const studentInitials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const subjects = getSubjectsForStudent(student.className, student.fieldOfStudy, student.tradeSubject);
  const overview = [
    { label: "Current Class", value: student.className, note: student.fieldOfStudy ? fieldLabel(student.fieldOfStudy) : "Enrolled class", icon: "book", tone: "bg-blue-50 text-blue-700", href: "/courses" },
    { label: "Overall Average", value: performance?.percentage == null ? "Not available" : `${performance.percentage.toFixed(1)}%`, note: performance ? "Published formal results" : "No published formal results", icon: "chart", tone: "bg-violet-50 text-violet-700", href: "/results" },
    { label: "Attendance", value: "Not available", note: "Attendance records are not configured", icon: "check", tone: "bg-emerald-50 text-emerald-700", href: "/dashboard" },
    { label: "Position in Class", value: performance?.class_position ? String(performance.class_position) : "Not available", note: performance?.class_position ? "Based on at least three published subjects" : "Insufficient published class results", icon: "chart", tone: "bg-amber-50 text-amber-700", href: "/results" },
  ];
  const upcomingExams = examItems.filter((exam) => exam.student_status !== "completed").slice(0, 3);

  const navGroups = ["Overview", "Academics", "School"];
  return <main id="dashboard" className="min-h-screen overflow-x-hidden bg-[#f5f6fa] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="min-h-screen md:flex">
      <div className={`${mobileNavOpen ? "fixed inset-0 z-40 bg-slate-950/55" : "hidden"} md:sticky md:top-0 md:block md:h-screen md:w-[264px] md:shrink-0`} onClick={() => setMobileNavOpen(false)}>
        <aside onClick={(event) => event.stopPropagation()} className={`absolute inset-y-0 left-0 flex w-[278px] max-w-[86vw] flex-col bg-[#111827] text-slate-300 shadow-2xl transition-transform md:relative md:h-screen md:w-full md:max-w-none md:shadow-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white shadow-lg shadow-blue-950/30">U</span>
              <span><span className="block text-sm font-bold tracking-[.1em] text-white">UNIALEGE</span><span className="mt-0.5 block text-[10px] font-medium tracking-wide text-slate-400">STUDENT PORTAL</span></span>
            </Link>
            <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="rounded-md p-2 text-slate-400 hover:bg-white/10 md:hidden"><Icon name="close" className="h-5 w-5" /></button>
          </div>
          <nav aria-label="Student navigation" className="flex-1 overflow-y-auto px-3 py-5">
            {navGroups.map((group) => <div key={group} className="mb-6">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{group}</p>
              <div className="space-y-1">{navigation.filter((item) => item.group === group).map((item) => {
                const active = item.label === "Dashboard";
                return <a key={item.label} href={item.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${active ? "bg-blue-600 text-white shadow-md shadow-blue-950/30" : "text-slate-400 hover:bg-white/[.06] hover:text-white"}`}>
                  <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                </a>;
              })}</div>
            </div>)}
          </nav>
          <div className="shrink-0 border-t border-white/10 p-3">
            <Link href="/profile" onClick={() => setMobileNavOpen(false)} className="flex min-w-0 items-center gap-3 rounded-lg p-2.5 hover:bg-white/[.06]">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200 ring-1 ring-blue-300/20">{studentInitials}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{student.fullName}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{student.className} · {student.admissionNumber}</span></span>
              <Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-500" />
            </Link>
            <Link href="/login" onClick={handleLogout} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Icon name="logout" className="h-4 w-4" /> Sign out</Link>
          </div>
        </aside>
      </div>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-7 lg:px-9">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"><Icon name="menu" className="h-5 w-5" /></button>
            <div className="min-w-0"><p className="truncate text-[11px] font-medium text-slate-400">Student portal <span className="px-1 text-slate-300">/</span> Dashboard</p><h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-white">Academic overview</h1></div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <span className="hidden text-right sm:block"><span className="block text-[11px] font-medium text-slate-500">{student.session}</span><span className="mt-0.5 block text-[10px] text-slate-400">{student.term}</span></span>
            <Link href="/announcements" aria-label="Notifications and announcements" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="bell" className="h-[18px] w-[18px]" /></Link>
            <Link href="/profile" className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-400/15 dark:text-indigo-200 dark:ring-indigo-300/20">{studentInitials}</span><span className="hidden text-left lg:block"><span className="block max-w-36 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{student.fullName}</span><span className="mt-0.5 block text-[10px] text-slate-500">Student account</span></span></Link>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <section className="relative isolate overflow-hidden rounded-2xl bg-[#18253c] text-white shadow-lg shadow-slate-900/10">
            <div aria-hidden="true" className="absolute -right-16 -top-36 -z-10 h-[370px] w-[370px] rounded-full border-[52px] border-blue-400/10" />
            <div aria-hidden="true" className="absolute -bottom-40 right-44 -z-10 h-[280px] w-[280px] rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-9">
              <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-blue-300">{student.session} academic session</p><h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Good to see you, {student.fullName}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-300">Your school life at a glance. Keep up with your subjects, upcoming exams, and latest school updates.</p><div className="mt-5 flex flex-wrap gap-2.5"><Link href="/cbt" className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-400">Continue to exams <Icon name="arrow" className="h-3.5 w-3.5" /></Link><Link href="/results" className="rounded-lg border border-white/15 bg-white/[.06] px-4 py-2.5 text-xs font-semibold text-slate-100 hover:bg-white/10">View results</Link></div></div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[310px]"><div className="rounded-xl border border-white/10 bg-white/[.06] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Student ID</p><p className="mt-1.5 truncate text-xs font-semibold text-white">{student.admissionNumber}</p></div><div className="rounded-xl border border-white/10 bg-white/[.06] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Class</p><p className="mt-1.5 truncate text-xs font-semibold text-white">{student.className}</p></div><div className="rounded-xl border border-white/10 bg-white/[.06] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Academic term</p><p className="mt-1.5 truncate text-xs font-semibold text-white">{student.term}</p></div><div className="rounded-xl border border-white/10 bg-white/[.06] p-3.5"><p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Field of study</p><p className="mt-1.5 truncate text-xs font-semibold text-white">{student.fieldOfStudy ? fieldLabel(student.fieldOfStudy) : "General"}</p></div></div>
            </div>
          </section>

          <section aria-label="Student overview metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overview.map((item) => <Metric key={item.label} label={item.label} value={item.value} detail={item.note} icon={item.icon} tone={item.tone} href={item.href} />)}
          </section>

          <section aria-label="Quick actions" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-5">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Quick actions</span>
            {[ ["Take an exam", "/cbt", "check"], ["Check results", "/results", "chart"], ["View timetable", "/timetable", "calendar"], ["Pay fees", "/fees", "wallet"] ].map(([label, href, icon]) => <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"><Icon name={icon} className="h-3.5 w-3.5" />{label}</Link>)}
          </section>

          <div className="grid gap-5 2xl:grid-cols-[1.25fr_.85fr]">
            <Panel className="dark:border-slate-800 dark:bg-slate-900">
              <PanelTitle title="Academic performance" description={`Subjects and current standing · ${student.className}`} action={<Link href="/courses" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300">All subjects <Icon name="arrow" className="h-3 w-3" /></Link>} />
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[.8fr_1.2fr]">
                <div className="flex min-h-36 flex-col justify-center rounded-xl bg-[#f5f7fb] p-5 dark:bg-slate-800/70"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Published average</p><p className="mt-2 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">{performance?.percentage == null ? "—" : `${performance.percentage.toFixed(1)}%`}</p><p className="mt-2 text-[11px] text-slate-500">{performance ? "Based on your published formal results" : "No formal results have been published yet"}</p></div>
                <div><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-slate-800 dark:text-slate-100">My subjects</p><span className="text-[10px] text-slate-400">{subjects.length} assigned</span></div><div className="grid gap-2 sm:grid-cols-2">{subjects.map((subject, index) => <div key={subject.name} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-2 dark:border-slate-800"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${["bg-blue-50 text-blue-700", "bg-violet-50 text-violet-700", "bg-emerald-50 text-emerald-700"][index % 3]}`}><Icon name="book" className="h-3.5 w-3.5" /></span><span className="truncate text-[10px] font-medium text-slate-700 dark:text-slate-200">{subject.name}</span></div>)}{subjects.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-[11px] leading-5 text-slate-500 sm:col-span-2 dark:border-slate-700">{(isSeniorClass(student.className) && !student.fieldOfStudy) || (requiresTradeSubject(student.className) && !student.tradeSubject) ? "Your subject profile is incomplete. Please contact the school administrator to assign your field (if applicable) and trade subject." : "No subjects are configured for this class."}</p>}</div></div>
              </div>
            </Panel>

            <Panel className="dark:border-slate-800 dark:bg-slate-900">
              <PanelTitle title="Upcoming exams" description="Available and in-progress assessments" action={<Link href="/cbt" aria-label="All exams" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="arrow" className="h-4 w-4" /></Link>} />
              <div className="p-4 sm:p-5">{upcomingExams.length ? <div className="space-y-1">{upcomingExams.map((exam, index) => <Link key={exam.id} href="/cbt" className="flex gap-3 rounded-lg p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"><span className="relative flex w-8 shrink-0 justify-center"><span className={`z-10 mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${index === 0 ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`} />{index < upcomingExams.length - 1 && <span className="absolute top-4 h-full w-px bg-slate-200 dark:bg-slate-700" />}</span><span className="min-w-0 flex-1 pb-2"><span className="flex flex-wrap items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{exam.subject} · {exam.title}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${exam.student_status === "in_progress" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{exam.student_status === "in_progress" ? "In progress" : "Available"}</span></span><span className="mt-1 block text-[10px] text-slate-500">{exam.duration_minutes} minutes</span></span></Link>)}</div> : <p className="rounded-lg bg-slate-50 p-6 text-center text-xs text-slate-500 dark:bg-slate-800">No available exams right now.</p>}</div>
              {timetableItems.slice(0, 3).map((entry) => <Link key={entry.id} href="/timetable" className="mx-4 mb-2 flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 sm:mx-5"><Icon name="calendar" className="h-4 w-4 shrink-0 text-violet-500" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold text-slate-700 dark:text-slate-200">{entry.subject}</span><span className="mt-0.5 block truncate text-[9px] text-slate-400">{entry.day_of_week} · Period {entry.period} · {entry.start_time.slice(0, 5)}{entry.teacher ? ` · ${entry.teacher}` : ""}</span></span><Icon name="arrow" className="h-3 w-3 shrink-0 text-slate-400" /></Link>)}
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
            <Panel className="dark:border-slate-800 dark:bg-slate-900">
              <PanelTitle title="Recent results" description="Your results for the current term" action={<Link href="/results" className="text-[10px] font-semibold text-blue-700 hover:underline dark:text-blue-300">View all</Link>} />
              <div className="p-5"><div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon name="chart" className="h-5 w-5" /></span><div><p className="text-[10px] font-medium text-slate-500">Overall average</p><p className="mt-0.5 text-xl font-semibold text-slate-900 dark:text-white">{performance?.percentage == null ? "Not available" : `${performance.percentage.toFixed(1)}%`}</p></div><span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-semibold text-slate-500 dark:bg-slate-800">{student.term}</span></div><p className="mt-4 border-t border-slate-100 pt-3 text-[10px] leading-5 text-slate-500 dark:border-slate-800">{performance ? "Your published score summary is ready to review." : "Published score summaries will appear here when available."}</p></div>
            </Panel>

            <Panel className="dark:border-slate-800 dark:bg-slate-900">
              <PanelTitle title="Announcements" description="The latest news and notices from your school" action={<Link href="/announcements" className="text-[10px] font-semibold text-blue-700 hover:underline dark:text-blue-300">All announcements</Link>} />
              <div className="divide-y divide-slate-100 dark:divide-slate-800">{announcementItems.slice(0, 3).map((announcement) => <article key={announcement.id} className="flex gap-3 px-5 py-3.5"><span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon name="notice" className="h-3.5 w-3.5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{announcement.title}</h3><time className="text-[9px] text-slate-400">{new Date(announcement.published_at ?? announcement.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</time></div><p className="mt-1 line-clamp-2 text-[10px] leading-5 text-slate-500">{announcement.description}</p><span className="mt-1.5 inline-block text-[9px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">{announcement.category}</span></div></article>)}{announcementItems.length === 0 && <p className="p-6 text-center text-xs text-slate-500">There are no published announcements for your class.</p>}</div>
            </Panel>
          </div>

          <Panel className="dark:border-slate-800 dark:bg-slate-900">
            <PanelTitle title="Fees and payments" description="A live view of your school fee account" action={<Link href="/fees" className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-semibold text-white hover:bg-slate-700 dark:bg-blue-600 dark:hover:bg-blue-500">Open fee account</Link>} />
            <div className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_1.15fr] sm:p-5">
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-slate-500">Total due</p><Icon name="wallet" className="h-4 w-4 text-blue-600" /></div><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{feeSummary ? `₦${Number(feeSummary.total_due).toLocaleString("en-NG")}` : "Loading"}</p><p className="mt-1 text-[9px] text-slate-400">{feeSummary?.fee_items.length ?? 0} active fee items</p></div>
              <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800"><div className="flex items-center justify-between"><p className="text-[10px] font-medium text-slate-500">Total paid</p><Icon name="check" className="h-4 w-4 text-emerald-600" /></div><p className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{feeSummary ? `₦${Number(feeSummary.total_paid).toLocaleString("en-NG")}` : "Loading"}</p><p className="mt-1 text-[9px] text-slate-400">{feeSummary?.payments.filter((payment) => payment.status === "completed").length ?? 0} completed payments</p></div>
              <div className="flex flex-col justify-center rounded-xl bg-[#f5f7fb] p-4 dark:bg-slate-800/70">{feeSummary && feeSummary.total_due > 0 ? <><div className="mb-2 flex justify-between text-[10px] font-medium text-slate-500"><span>Paid toward current fees</span><span>{Math.min(100, Math.round(feeSummary.total_paid / feeSummary.total_due * 100))}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, feeSummary.total_paid / feeSummary.total_due * 100)}%` }} /></div><p className="mt-2 text-[9px] text-slate-500">{feeSummary.fee_items.length} fee items in your account</p></> : <p className="text-[10px] leading-5 text-slate-500">Your payment progress will appear here when fee details are available.</p>}</div>
            </div>
          </Panel>

          <footer className="pb-3 text-center text-[10px] text-slate-400">© 2026 UniAllege · Student portal</footer>
        </div>
      </div>
    </div>
  </main>;
}
