"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type Category = "Academic" | "Examination" | "School Event" | "General" | "Fees";
type Announcement = { id: string; title: string; published_at: string | null; created_at: string; category: Category; description: string; details: string; tone: string };
const categories = ["All Categories", "Academic", "Examination", "School Event", "General", "Fees"];
const toneByCategory: Record<Category, string> = { Academic: "bg-blue-100 text-blue-700", Examination: "bg-violet-100 text-violet-700", "School Event": "bg-emerald-100 text-emerald-700", General: "bg-slate-100 text-slate-700", Fees: "bg-amber-100 text-amber-700" };
const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" }, { label: "My Subjects", href: "/courses", icon: "◤" },
  { label: "Results", href: "/results", icon: "◥" }, { label: "Fees", href: "/fees", icon: "₦" },
  { label: "Timetable", href: "/timetable", icon: "◷" }, { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];
function dateFor(item: Announcement) { return new Date(item.published_at ?? item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }); }

export default function AnnouncementsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (session) setStudent(session); else router.replace("/login");
    try {
      const stored = window.localStorage.getItem("unialege-read-announcements");
      if (stored) { const value: unknown = JSON.parse(stored); if (Array.isArray(value)) setReadIds(value.filter((id): id is string => typeof id === "string")); }
    } catch { /* This page still works if browser storage is unavailable. */ }
    void fetch("/api/student/announcements", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as { announcements?: Omit<Announcement, "tone">[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load announcements.");
        setAnnouncements((result.announcements ?? []).map((item) => ({ ...item, category: item.category as Category, tone: toneByCategory[item.category as Category] })));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load announcements."))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return announcements.filter((item) => `${item.title} ${item.description} ${item.details} ${item.category}`.toLowerCase().includes(normalized) && (category === "All Categories" || item.category === category));
  }, [announcements, query, category]);

  function markRead(item: Announcement) {
    setSelected(item);
    setReadIds((current) => {
      if (current.includes(item.id)) return current;
      const next = [...current, item.id];
      try { window.localStorage.setItem("unialege-read-announcements", JSON.stringify(next)); } catch { /* Keep the read state for this page view. */ }
      return next;
    });
  }

  if (!student) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <style>{`@keyframes announcements-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .announcements-rise { animation: announcements-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .announcements-rise { animation: none; } }`}</style>
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Secondary portal</span></span></Link>
        <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{navigation.map((item) => { const active = item.label === "Announcements"; return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}<Link href="/login" onClick={clearStudentSession} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">Logout</Link></nav>
        <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/login" onClick={clearStudentSession} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">Logout</Link></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Secondary student portal</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Announcements</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{student.fullName}</span><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</div></div></header>
        <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <section className="announcements-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-blue-700">School updates</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Announcements</h2><p className="mt-2 text-sm text-slate-500">Official notices published for your class.</p></div><div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"><span className="font-bold text-blue-700">{announcements.filter((item) => !readIds.includes(item.id)).length}</span> unread announcements</div></section>
          <section className="announcements-rise rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label><span className="sr-only">Search announcements</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label><span className="sr-only">Filter announcements by category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div></section>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <section aria-label="School announcements" className="grid gap-4 xl:grid-cols-2">{filtered.map((item, index) => { const read = readIds.includes(item.id); return <article key={item.id} className="announcements-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6" style={{ animationDelay: `${index * 55}ms` }}><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.category}</span><div className="flex items-center gap-2"><time className="text-xs text-slate-400">{dateFor(item)}</time>{!read && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}</div></div><h3 className={`mt-4 text-lg ${read ? "font-semibold" : "font-bold"}`}>{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p><button type="button" onClick={() => markRead(item)} className="mt-5 rounded-lg border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">{read ? "View Details" : "Read More"}</button></article>; })}{loading && <p className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">Loading announcements…</p>}{!loading && !error && filtered.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">No announcements match your search.</p>}</section>
          <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
        </div>
      </div>
    </div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="announcement-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.tone}`}>{selected.category}</span><h2 id="announcement-title" className="mt-4 text-xl font-bold">{selected.title}</h2><time className="mt-2 block text-sm text-slate-400">{dateFor(selected)}</time></div><button type="button" onClick={() => setSelected(null)} aria-label="Close announcement" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">×</button></div><p className="mt-5 whitespace-pre-wrap leading-7 text-slate-600">{selected.details}</p><button type="button" onClick={() => setSelected(null)} className="mt-7 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Close</button></section></div>}
  </main>;
}
