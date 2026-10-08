"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Search, X } from "lucide-react";
import { StudentPortalShell } from "../components/student-portal-shell";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type Category = "Academic" | "Examination" | "School Event" | "General" | "Fees";
type Announcement = { id: string; title: string; published_at: string | null; created_at: string; category: Category; description: string; details: string; is_read: boolean; read_at: string | null; tone: string };
type AnnouncementResponse = { announcements?: Omit<Announcement, "tone">[]; unread_count?: number; error?: string };
const categories = ["All Categories", "Academic", "Examination", "School Event", "General", "Fees"];
const toneByCategory: Record<Category, string> = { Academic: "bg-blue-100 text-blue-700", Examination: "bg-violet-100 text-violet-700", "School Event": "bg-emerald-100 text-emerald-700", General: "bg-slate-100 text-slate-700", Fees: "bg-amber-100 text-amber-700" };
function dateFor(item: Announcement) { return new Date(item.published_at ?? item.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }); }
function publishReadCount(unread_count: number) {
  window.dispatchEvent(new CustomEvent("unialege:announcement-read-state", { detail: { unread_count } }));
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (session) setStudent(session); else router.replace("/login");
    void fetch("/api/student/announcements", { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json() as AnnouncementResponse;
        if (!response.ok) throw new Error(result.error ?? "Unable to load announcements.");
        setAnnouncements((result.announcements ?? []).map((item) => ({ ...item, category: item.category as Category, tone: toneByCategory[item.category as Category] })));
        const count = typeof result.unread_count === "number" ? result.unread_count : 0;
        setUnreadCount(count);
        publishReadCount(count);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load announcements."))
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return announcements.filter((item) => `${item.title} ${item.description} ${item.details} ${item.category}`.toLowerCase().includes(normalized) && (category === "All Categories" || item.category === category));
  }, [announcements, query, category]);

  async function markRead(item: Announcement) {
    setSelected(item);
    if (item.is_read) return;
    try {
      const response = await fetch("/api/student/announcements/read", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", credentials: "same-origin", body: JSON.stringify({ announcement_id: item.id }) });
      const result = await response.json() as { unread_count?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to mark announcement as read.");
      setAnnouncements((current) => current.map((announcement) => announcement.id === item.id ? { ...announcement, is_read: true, read_at: new Date().toISOString() } : announcement));
      if (typeof result.unread_count === "number") {
        setUnreadCount(result.unread_count);
        publishReadCount(result.unread_count);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to mark announcement as read."); }
  }

  async function markAllRead() {
    try {
      const response = await fetch("/api/student/announcements/read", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", credentials: "same-origin", body: JSON.stringify({ mark_all: true }) });
      const result = await response.json() as { unread_count?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to mark announcements as read.");
      setAnnouncements((current) => current.map((announcement) => ({ ...announcement, is_read: true, read_at: announcement.read_at ?? new Date().toISOString() })));
      const count = typeof result.unread_count === "number" ? result.unread_count : 0;
      setUnreadCount(count);
      publishReadCount(count);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to mark announcements as read."); }
  }

  if (!student) return <main className="min-h-screen bg-[#f5f6fa]" aria-busy="true" />;
  return <StudentPortalShell title="Announcements" student={student} period={`${student.session} · ${student.term}`} onLogout={clearStudentSession}>
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-700 dark:text-blue-300">School news & notices</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">Announcements</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Official updates published for your class.</p></div><div className="inline-flex items-center gap-3 self-start rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-900"><Bell className="h-4 w-4 text-blue-600"/><span className="font-semibold text-slate-900 dark:text-white">{unreadCount}</span><span className="text-slate-500">unread</span>{unreadCount > 0 && <button type="button" onClick={() => void markAllRead()} className="border-l border-slate-200 pl-3 font-semibold text-blue-700 hover:text-blue-800 dark:border-slate-700 dark:text-blue-300">Mark all read</button>}</div></section>
    <section className="grid gap-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[minmax(0,1fr)_220px]"><label className="relative block"><span className="sr-only">Search announcements</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search announcements..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"/></label><label><span className="sr-only">Filter announcements by category</span><select value={category} onChange={(event)=>setCategory(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-950">{categories.map((item)=><option key={item}>{item}</option>)}</select></label></section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
    <section aria-label="School announcements" className="grid gap-4 xl:grid-cols-2">{filtered.map((item)=>{const read=item.is_read;return <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.tone}`}>{item.category}</span><div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400"/><time className="text-[10px] text-slate-400">{dateFor(item)}</time>{!read && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>}</div></div><h3 className="mt-4 text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{item.title}</h3><p className="mt-2 line-clamp-3 text-xs leading-6 text-slate-500 dark:text-slate-400">{item.description}</p><button type="button" onClick={()=>void markRead(item)} className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">{read ? "View details" : "Read announcement"}</button></article>})}
      {loading && <div role="status" className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">Loading announcements…</div>}
      {!loading && !error && filtered.length===0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900 xl:col-span-2"><Bell className="mx-auto h-8 w-8 text-slate-300"/><h3 className="mt-3 text-sm font-semibold dark:text-white">{announcements.length ? "No matching announcements" : "No announcements yet"}</h3><p className="mt-1 text-xs text-slate-500">{announcements.length ? "Try another search or category." : "School notices published for your class will appear here."}</p></div>}
    </section>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="announcement-title" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${selected.tone}`}>{selected.category}</span><h2 id="announcement-title" className="mt-4 text-lg font-semibold dark:text-white">{selected.title}</h2><time className="mt-2 block text-xs text-slate-400">{dateFor(selected)}</time></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close announcement" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4"/></button></div><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{selected.details}</p><button type="button" onClick={()=>setSelected(null)} className="mt-6 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white dark:bg-blue-600">Close</button></section></div>}
  </StudentPortalShell>;
}
