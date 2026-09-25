"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type Category = "Academic" | "Examination" | "School Event" | "General" | "Fees";
type Announcement = { id: number; title: string; date: string; category: Category; description: string; details: string; tone: string };

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "₦" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

const categories = ["All Categories", "Academic", "Examination", "School Event", "General", "Fees"];
const announcements: Announcement[] = [
  { id: 1, title: "First term examinations timetable released", date: "September 24, 2026", category: "Examination", description: "The first term examination schedule is now available for all classes.", details: "Students can collect a printed copy of the timetable from their class teacher. Please review each subject date carefully and report any timetable clash to the Academic Office by September 29. Examinations begin on October 5, 2026. Arrive at school at least 20 minutes before the first paper.", tone: "bg-violet-100 text-violet-700" },
  { id: 2, title: "Inter-house sports day", date: "September 22, 2026", category: "School Event", description: "Join us on the school field for this term's inter-house sports competition.", details: "The annual inter-house sports day takes place on Friday, October 16. Students should wear their house colours, bring water, and arrive by 8:00 AM. Parents and guardians are welcome to attend from 9:00 AM.", tone: "bg-emerald-100 text-emerald-700" },
  { id: 3, title: "Mathematics revision sessions", date: "September 20, 2026", category: "Academic", description: "Optional after-school revision sessions begin next week for SS 1 and SS 2.", details: "Mathematics revision sessions will be held on Tuesdays and Thursdays from 3:15 PM to 4:00 PM in the relevant class rooms. Bring your exercise book and questions. Please speak to your Mathematics teacher if you need transport arrangements.", tone: "bg-blue-100 text-blue-700" },
  { id: 4, title: "First term fee payment reminder", date: "September 18, 2026", category: "Fees", description: "Families are reminded to complete outstanding first term fee payments.", details: "Please contact the Accounts Office to confirm your balance and receive approved payment instructions. Keep your payment receipt for school records. Do not make payments to personal accounts.", tone: "bg-amber-100 text-amber-700" },
  { id: 5, title: "Welcome to the 2026/2027 school session", date: "September 12, 2026", category: "General", description: "We welcome students and families to a new year of learning and growth.", details: "The new session is underway. Students should check their class timetable, bring the required learning materials, and review the student handbook with their families. We look forward to a productive year together.", tone: "bg-slate-100 text-slate-700" },
];

export default function AnnouncementsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [readIds, setReadIds] = useState<number[]>([5]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    const session = getStudentSession();
    if (session) setStudent(session);
    else router.replace("/login");
  }, [router]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return announcements.filter((item) => {
      const matchesText = `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(normalized);
      return matchesText && (category === "All Categories" || item.category === category);
    });
  }, [query, category]);

  function logout() { clearStudentSession(); }

  function openAnnouncement(item: Announcement) {
    setSelected(item);
    setReadIds((current) => current.includes(item.id) ? current : [...current, item.id]);
  }

  if (!student) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;

  const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes announcements-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .announcements-rise { animation: announcements-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .announcements-rise { animation: none; } }`}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Secondary portal</span></span></Link>
          <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{navigation.map((item) => { const active = item.label === "Announcements"; return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 transition-colors hover:bg-slate-50"}`}><span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}<Link href="/login" onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">↪ Logout</Link></nav>
          <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/login" onClick={logout} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">↪ Logout</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Secondary student portal</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Announcements</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{student.fullName}</span><div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</div></div></header>
          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="announcements-rise flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-blue-700">School updates</p><h2 className="mt-1 text-2xl font-bold sm:text-3xl">Announcements</h2><p className="mt-2 text-sm text-slate-500">Sample notices for preview · no official school announcements are configured yet.</p></div><div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"><span className="font-bold text-blue-700">{announcements.length - readIds.length}</span> unread announcements</div></section>

            <section className="announcements-rise rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5" style={{ animationDelay: "60ms" }}><div className="grid gap-3 sm:grid-cols-[1fr_220px]"><label><span className="sr-only">Search announcements</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements..." className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><label><span className="sr-only">Filter announcements by category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div></section>

            <section aria-label="School announcements" className="grid gap-4 xl:grid-cols-2">{filtered.map((item, index) => { const read = readIds.includes(item.id); return <article key={item.id} className="announcements-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6" style={{ animationDelay: `${index * 55}ms` }}><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.category}</span><div className="flex items-center gap-2"><time className="text-xs text-slate-400">{item.date}</time>{!read && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}</div></div><h3 className={`mt-4 text-lg ${read ? "font-semibold" : "font-bold"}`}>{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p><button type="button" onClick={() => openAnnouncement(item)} className="mt-5 rounded-lg border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50">{read ? "View Details" : "Read More"}</button></article>; })}{filtered.length === 0 && <p className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 xl:col-span-2">No announcements match your search.</p>}</section>
            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="announcement-title" className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.tone}`}>{selected.category}</span><h2 id="announcement-title" className="mt-4 text-xl font-bold">{selected.title}</h2><time className="mt-2 block text-sm text-slate-400">{selected.date}</time></div><button type="button" onClick={() => setSelected(null)} aria-label="Close announcement" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">✕</button></div><p className="mt-5 leading-7 text-slate-600">{selected.details}</p><button type="button" onClick={() => setSelected(null)} className="mt-7 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Close</button></section></div>}
    </main>
  );
}
