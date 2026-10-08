"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { fieldLabel, getSubjectCategories, getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../lib/subjects";
import { ArrowUpRight, Bell, BookOpen, CalendarDays, CheckCircle2, CircleAlert, ClipboardList, House, LogOut, Menu, Search, UserRound, Wallet, X, type LucideIcon } from "lucide-react";

type SubjectResult = { subject: string; total: number | null };

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

const iconMap: Record<string, LucideIcon> = { home: House, book: BookOpen, check: CheckCircle2, results: ClipboardList, calendar: CalendarDays, wallet: Wallet, bell: Bell, user: UserRound, search: Search, arrow: ArrowUpRight, alert: CircleAlert, logout: LogOut, menu: Menu, close: X };

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const IconComponent = iconMap[name] ?? BookOpen;
  return <IconComponent aria-hidden="true" className={className} strokeWidth={1.8} />;
}

export default function SubjectsPage() {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Subjects");
  const [resultBySubject, setResultBySubject] = useState<Record<string, number>>({});

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
      void fetch(`/api/student/results?session=${encodeURIComponent(session.session)}&term=${encodeURIComponent(session.term)}`, { cache: "no-store", credentials: "same-origin" })
        .then(async (response) => { if (!response.ok) return; const payload = await response.json() as { results?: SubjectResult[] }; setResultBySubject(Object.fromEntries((payload.results ?? []).filter((row): row is SubjectResult & { total: number } => typeof row.total === "number").map((row) => [row.subject, row.total]))); })
        .catch(() => setResultBySubject({}));
    } else {
      router.replace("/login");
    }
  }, [router]);

  const subjects = student ? getSubjectsForStudent(student.className, student.fieldOfStudy, student.tradeSubject) : [];
  const categories = getSubjectCategories(subjects);
  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesQuery =
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query) ||
        subject.category.toLowerCase().includes(query);
      const matchesCategory = category === "All Subjects" || subject.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [search, category, subjects]);

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

  function handleLogout() {
    clearStudentSession();
  }

  const navGroups = ["Overview", "Academics", "School"];
  return <main className="min-h-screen overflow-x-hidden bg-[#f5f6fa] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div className="min-h-screen md:flex">
      <div className={`${mobileNavOpen ? "fixed inset-0 z-40 bg-slate-950/55" : "hidden"} md:sticky md:top-0 md:block md:h-screen md:w-[264px] md:shrink-0`} onClick={() => setMobileNavOpen(false)}>
        <aside onClick={(event) => event.stopPropagation()} className={`absolute inset-y-0 left-0 flex w-[278px] max-w-[86vw] flex-col bg-[#111827] text-slate-300 shadow-2xl transition-transform md:relative md:h-screen md:w-full md:max-w-none md:shadow-none ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-5"><Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-lg font-bold text-white">U</span><span><span className="block text-sm font-bold tracking-[.1em] text-white">UNIALEGE</span><span className="mt-0.5 block text-[10px] tracking-wide text-slate-400">STUDENT PORTAL</span></span></Link><button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="rounded-md p-2 text-slate-400 hover:bg-white/10 md:hidden"><Icon name="close" className="h-5 w-5" /></button></div>
          <nav aria-label="Student navigation" className="flex-1 overflow-y-auto px-3 py-5">{navGroups.map((group) => <div key={group} className="mb-6"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">{group}</p><div className="space-y-1">{navigation.filter((item) => item.group === group).map((item) => { const active = item.label === "My Subjects"; return <Link key={item.label} href={item.href} onClick={() => setMobileNavOpen(false)} aria-current={active ? "page" : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/[.06] hover:text-white"}`}><Icon name={item.icon} className="h-[18px] w-[18px]" /><span>{item.label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}</Link>; })}</div></div>)}</nav>
          <div className="shrink-0 border-t border-white/10 p-3"><Link href="/profile" className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-white/[.06]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-200">{studentInitials}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{student.fullName}</span><span className="mt-1 block truncate text-[10px] text-slate-400">{student.className} · {student.admissionNumber}</span></span><Icon name="arrow" className="h-4 w-4 text-slate-500" /></Link><Link href="/login" onClick={handleLogout} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Icon name="logout" className="h-4 w-4" />Sign out</Link></div>
        </aside>
      </div>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:px-7 lg:px-9"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 md:hidden"><Icon name="menu" className="h-5 w-5" /></button><div><p className="text-[11px] text-slate-400">Academics / My subjects</p><h1 className="mt-0.5 text-sm font-semibold dark:text-white">My Subjects</h1></div></div><div className="flex items-center gap-2 sm:gap-4"><span className="hidden text-right sm:block"><span className="block text-[11px] text-slate-500">{student.session}</span><span className="text-[10px] text-slate-400">{student.term}</span></span><Link href="/announcements" aria-label="Announcements" className="rounded-lg border border-slate-200 p-2 text-slate-500 dark:border-slate-700"><Icon name="bell" className="h-[18px] w-[18px]" /></Link><Link href="/profile" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200">{studentInitials}</span><span className="hidden max-w-36 truncate text-xs font-semibold lg:block dark:text-white">{student.fullName}</span></Link></div></header>
        <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">{student.session} academic session</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">My Subjects</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Explore the academic subjects assigned to your current class. Published results are shown when available.</p></div><span className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:self-auto"><Icon name="book" className="h-4 w-4 text-blue-600" />{student.className}</span></section>
          <section className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]"><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Assigned subjects</p><p className="mt-2 text-2xl font-semibold dark:text-white">{subjects.length}</p><p className="mt-1 text-[10px] text-slate-500">For {student.className}</p></article><article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Subject areas</p><p className="mt-2 text-2xl font-semibold dark:text-white">{categories.filter((item) => item !== "All Subjects").length}</p><p className="mt-1 text-[10px] text-slate-500">Categories in your subject list</p></article><article className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-300"><Icon name="bell" className="h-4 w-4" /></span><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Subjects are assigned according to your class and academic placement.</p></article></section>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300"><Icon name="book" className="h-4 w-4" /></span><h2 className="text-sm font-semibold dark:text-white">Your subject list</h2></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{filteredSubjects.length} of {subjects.length} subjects · {student.term}, {student.session}</p></div><div className="grid gap-2.5 sm:grid-cols-[minmax(200px,1fr)_minmax(170px,.7fr)] lg:w-[440px]"><label className="relative block"><span className="sr-only">Search subjects</span><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subjects..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label><label><span className="sr-only">Filter by subject category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-white">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div></div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">{filteredSubjects.map((subject) => { const result = resultBySubject[subject.name]; return <article key={subject.code} className="group flex min-w-0 flex-col rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/50 sm:p-5"><div className="flex items-start gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white ${subject.color}`}>{subject.code}</span><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold leading-5 dark:text-white">{subject.name}</h3><p className="mt-1 text-[10px] text-slate-500">{subject.category}</p></div><Icon name="arrow" className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-500" /></div><div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{student.className}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Assigned</span></div><div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800"><div className="flex justify-between gap-3"><span className="text-[10px] text-slate-500">Current result</span><span className={`text-xs font-semibold ${result === undefined ? "text-slate-400" : "dark:text-white"}`}>{result === undefined ? "Not published" : `${result} / 100`}</span></div>{result !== undefined && <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, result))}%` }} /></div>}</div></article>; })}
          {filteredSubjects.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center dark:border-slate-700 dark:bg-slate-950/40 sm:col-span-2 xl:col-span-3"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-800"><Icon name={subjects.length === 0 ? "book" : "alert"} className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-semibold dark:text-white">{subjects.length === 0 ? "No subjects assigned" : "No matching subjects"}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{subjects.length === 0 ? ((isSeniorClass(student.className) && !student.fieldOfStudy) || (requiresTradeSubject(student.className) && !student.tradeSubject) ? "Your subject profile is incomplete. Please contact the school administrator to assign your field (if applicable) and trade subject." : "No subjects are configured for this class.") : "Try another search or category to find a subject."}</p>{subjects.length > 0 && (search || category !== "All Subjects") && <button type="button" onClick={() => { setSearch(""); setCategory("All Subjects"); }} className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-900">Clear filters</button>}</div>}
          </div>{filteredSubjects.length > 0 && <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-800">Showing {filteredSubjects.length} of {subjects.length} subjects</div>}</section>
          <footer className="pb-3 text-center text-[10px] text-slate-400">© 2026 UniAllege · Student portal</footer>
        </div>
      </div>
    </div>
  </main>;
}
