"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminSession, verifyAdminSession, type AdminSession } from "../lib/admin-auth";
import { getStudents } from "../lib/student-store";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: "▤" },
  { label: "Students", href: "/admin/students", icon: "◉" },
  { label: "CBT Exams", href: "/admin/exams", icon: "✓" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void verifyAdminSession().then((session) => {
      if (!active) return;
      if (!session) { router.replace("/admin/login"); return; }
      setAdmin(session);
      getStudents().then((students) => setStudentCount(students.length)).catch(() => setStudentCount(null));
    });
    return () => { active = false; };
  }, [router]);

  function logout() {
    clearAdminSession();
  }

  if (!admin) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;

  const metrics = [
    { label: "Student Accounts", value: studentCount === null ? "Unavailable" : `${studentCount} Students`, note: studentCount === null ? "Unable to load Supabase records" : "Created by this administrator", icon: "◉", tone: "bg-blue-50 text-blue-700" },
    { label: "Classes", value: "Not available", note: "Class management coming soon", icon: "▤", tone: "bg-violet-50 text-violet-700" },
    { label: "Fee Records", value: "Not available", note: "No payment system connected", icon: "₦", tone: "bg-amber-50 text-amber-700" },
    { label: "Results", value: "Not available", note: "Results management coming soon", icon: "✓", tone: "bg-emerald-50 text-emerald-700" },
    { label: "Announcements", value: "Not available", note: "Publishing coming soon", icon: "◉", tone: "bg-rose-50 text-rose-700" },
  ];

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes admin-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .admin-rise { animation: admin-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .admin-rise { animation: none; } }`}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/admin" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">U</span><span><span className="block text-lg font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
          <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">
            {navigation.map((item, index) => <Link key={item.label} href={item.href} aria-current={index === 0 ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${index === 0 ? "bg-blue-50 text-blue-700" : "text-slate-600 transition-colors hover:bg-slate-50"}`}><span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}
            <Link href="/admin/login" onClick={logout} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 md:hidden">↪ Logout</Link>
          </nav>
          <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/admin/login" onClick={logout} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">↪ Logout</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Secondary Education</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">UniAllege Admin</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:block">{admin.name}</span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">AD</span><Link href="/admin/login" onClick={logout} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Logout</Link></div></header>
          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="admin-rise relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-7 text-white shadow-[0_24px_70px_-42px_rgba(30,64,175,.6)] sm:px-8 sm:py-8"><div aria-hidden="true" className="absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><p className="text-sm font-medium text-blue-200">Secondary Education · School administration</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {admin.name}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Manage school-issued student accounts. Class, fee, and results records are not connected yet.</p><Link href="/admin/students" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Manage students <span aria-hidden="true">→</span></Link></section>

            <section aria-label="School summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{metrics.map((metric, index) => <article key={metric.label} className="admin-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: `${index * 60}ms` }}><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-slate-500">{metric.label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold ${metric.tone}`}>{metric.icon}</span></div><p className="mt-4 text-2xl font-bold">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.note}</p></article>)}</section>

            <div className="grid gap-7 xl:grid-cols-[1.2fr_1fr]">
              <section className="admin-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold">Recent Activity</h2><p className="mt-1 text-sm text-slate-500">Latest updates from the school portal</p></div><p className="mt-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Activity tracking is not available yet.</p></section>
              <section className="admin-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div><h2 className="text-lg font-bold">Quick Actions</h2><p className="mt-1 text-sm text-slate-500">Common administration tasks</p></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Link href="/admin/students" className="rounded-xl bg-blue-700 px-4 py-4 text-sm font-semibold text-white transition hover:bg-blue-800">＋ Add Student</Link><Link href="/admin/results" className="rounded-xl border border-slate-200 px-4 py-4 text-left text-sm font-semibold transition hover:bg-slate-50">✓ Enter Results</Link><Link href="/admin/exams" className="rounded-xl border border-slate-200 px-4 py-4 text-left text-sm font-semibold transition hover:bg-slate-50">✓ Manage CBT Exams</Link><button type="button" onClick={() => setActionMessage("Payment recording is coming soon.")} className="rounded-xl border border-slate-200 px-4 py-4 text-left text-sm font-semibold transition hover:bg-slate-50">₦ Record Payment</button><button type="button" onClick={() => setActionMessage("Announcement publishing is coming soon.")} className="rounded-xl border border-slate-200 px-4 py-4 text-left text-sm font-semibold transition hover:bg-slate-50">◉ Publish Announcement</button></div>{actionMessage && <p role="status" className="mt-4 text-sm font-medium text-blue-700">{actionMessage}</p>}<p className="mt-4 text-xs text-slate-400">More management tools are coming as the admin portal grows.</p></section>
            </div>
            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Admin Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
