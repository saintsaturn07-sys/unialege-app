"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { fieldLabel, getSubjectCategories, getSubjectsForStudent, isSeniorClass, requiresTradeSubject } from "../lib/subjects";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "＄" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

export default function SubjectsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Subjects");

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
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

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @keyframes subjects-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .subjects-rise { animation: subjects-rise 500ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .subjects-rise { animation: none; } }
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
              const active = item.label === "My Subjects";
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
              <h1 className="mt-1 text-lg font-semibold sm:text-xl">My Subjects</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:block">{student.term}</span>
              <div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" aria-label={`${student.fullName} profile`}>{studentInitials}</div>
            </div>
          </header>

          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="subjects-rise flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-medium text-blue-300">Class learning · {fieldLabel(student.fieldOfStudy)}</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hello, {student.fullName}</h2>
                <p className="mt-2 text-sm text-slate-300">Subjects shown are based on your class and field of study.</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-7 gap-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-4 lg:min-w-[520px]">
                <div><dt className="text-xs text-slate-400">Admission Number</dt><dd className="mt-1 text-sm font-semibold">{student.admissionNumber}</dd></div>
                <div><dt className="text-xs text-slate-400">Class</dt><dd className="mt-1 text-sm font-semibold">{student.className}</dd></div>
                {student.className.toUpperCase().startsWith("SS") && <div><dt className="text-xs text-slate-400">Field</dt><dd className="mt-1 text-sm font-semibold">{fieldLabel(student.fieldOfStudy)}</dd></div>}
                <div><dt className="text-xs text-slate-400">Session</dt><dd className="mt-1 text-sm font-semibold">{student.session}</dd></div>
                <div><dt className="text-xs text-slate-400">Term</dt><dd className="mt-1 text-sm font-semibold">{student.term}</dd></div>
              </dl>
            </section>

            <section aria-label="Subject summary" className="grid gap-4 sm:grid-cols-2">
              <article className="subjects-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: "70ms" }}>
                <p className="text-sm font-medium text-slate-500">Total Subjects</p>
                <p className="mt-3 text-3xl font-bold tracking-tight">{subjects.length}</p>
                <p className="mt-1 text-xs text-slate-500">Assigned to your class this term</p>
              </article>
              <article className="subjects-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: "140ms" }}>
                <p className="text-sm font-medium text-slate-500">Class and Term</p>
                <p className="mt-3 text-2xl font-bold tracking-tight">{student.className} · {student.term}</p>
                <p className="mt-1 text-xs text-slate-500">{student.session} Academic Session</p>
              </article>
            </section>

            <section className="subjects-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "210ms" }}>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-bold">Subject list</h2>
                  <p className="mt-1 text-sm text-slate-500">Browse subjects offered for your class and field.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
                  <label className="relative block">
                    <span className="sr-only">Search subjects</span>
                    <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search subjects..."
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="sr-only">Filter by subject category</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredSubjects.map((subject, index) => (
                  <article key={subject.code} className="subjects-rise rounded-2xl border border-slate-100 p-5 transition duration-200 hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: `${index * 45}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${subject.color}`}>{subject.code}</span>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-snug">{subject.name}</h3>
                          <p className="mt-1 text-xs text-slate-500">{subject.category}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Offered</span>
                    </div>
                    <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Class</dt><dd className="text-right font-medium">{student.className}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Subject group</dt><dd className="text-right font-medium">{subject.category}</dd></div>
                    </dl>
                  </article>
                ))}
                {filteredSubjects.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">{(isSeniorClass(student.className) && !student.fieldOfStudy) || (requiresTradeSubject(student.className) && !student.tradeSubject) ? "Your subject profile is incomplete. Please contact the school administrator to assign your field (if applicable) and trade subject." : "No subjects match your search and filter."}</p>}
              </div>
              <p className="mt-5 text-xs text-slate-400">Showing {filteredSubjects.length} of {subjects.length} subjects</p>
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
