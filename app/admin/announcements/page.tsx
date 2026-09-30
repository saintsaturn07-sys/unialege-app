"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { clearAdminSession, verifyAdminSession, type AdminSession } from "../../lib/admin-auth";

type Announcement = { id: string; title: string; category: string; description: string; details: string; target_class: string | null; target_stream: string | null; is_published: boolean; published_at: string | null; created_at: string };
type Form = { title: string; category: string; description: string; details: string; target_class: string; target_stream: string; is_published: boolean };
const blank: Form = { title: "", category: "General", description: "", details: "", target_class: "", target_stream: "", is_published: false };
const categories = ["Academic", "Examination", "School Event", "General", "Fees"];
const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

async function api<T>(method = "GET", id = "", body?: unknown): Promise<T> {
  const response = await fetch(id ? `/api/admin/announcements/${id}` : "/api/admin/announcements", { method, cache: "no-store", credentials: "same-origin", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}
function audience(item: Announcement) { if (!item.target_class) return "All students"; const stream = item.target_stream ? ` · ${item.target_stream === "art" ? "Arts" : item.target_stream[0].toUpperCase() + item.target_stream.slice(1)}` : " · all streams"; return `${item.target_class}${stream}`; }

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [editing, setEditing] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await api<{ announcements: Announcement[] }>(); setItems(result.announcements); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load announcements."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    void verifyAdminSession().then((session) => { if (!active) return; if (!session) { router.replace("/admin/login"); return; } setAdmin(session); void load(); });
    return () => { active = false; };
  }, [router, load]);

  function reset() { setForm(blank); setEditing(""); }
  function edit(item: Announcement) { setEditing(item.id); setForm({ title: item.title, category: item.category, description: item.description, details: item.details, target_class: item.target_class ?? "", target_stream: item.target_stream ?? "", is_published: item.is_published }); setError(""); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!form.title.trim() || !form.description.trim() || !form.details.trim()) { setError("Enter the title, summary, and full announcement."); return; }
    setSaving(true);
    try {
      const body = { title: form.title, category: form.category, description: form.description, details: form.details, target_class: form.target_class || null, target_stream: form.target_stream || null, is_published: form.is_published };
      await api(editing ? "PATCH" : "POST", editing, body);
      setMessage(editing ? "Announcement updated." : "Announcement created."); reset(); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save announcement."); }
    finally { setSaving(false); }
  }

  async function toggle(item: Announcement) {
    setError(""); setMessage("");
    try { await api("PATCH", item.id, { title: item.title, category: item.category, description: item.description, details: item.details, target_class: item.target_class, target_stream: item.target_stream, is_published: !item.is_published }); setMessage(`Announcement ${item.is_published ? "unpublished" : "published"}.`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to change publication status."); }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`Delete “${item.title}” permanently?`)) return;
    setError(""); setMessage("");
    try { await api("DELETE", item.id); if (editing === item.id) reset(); setMessage("Announcement deleted."); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete announcement."); }
  }

  function logout() { clearAdminSession(); }
  if (!admin) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/admin" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
        <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{[["Dashboard", "/admin"], ["Students", "/admin/students"], ["CBT Exams", "/admin/exams"], ["Announcements", "/admin/announcements"]].map(([label, href]) => <Link key={href} href={href} aria-current={href === "/admin/announcements" ? "page" : undefined} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium ${href === "/admin/announcements" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{label}</Link>)}<Link href="/admin/login" onClick={logout} className="shrink-0 rounded-xl px-4 py-2.5 text-sm text-slate-600 hover:bg-red-50">Logout</Link></nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">School administration</p><h1 className="mt-1 text-xl font-semibold">Announcements</h1></div><span className="text-sm text-slate-500">{admin.name}</span></header>
        <div className="space-y-6 px-5 py-7 sm:px-8 lg:px-10">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h2 className="text-lg font-bold">{editing ? "Edit announcement" : "Create announcement"}</h2><p className="mt-1 text-sm text-slate-500">Drafts stay hidden from students until published.</p></div>
            <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Title<input maxLength={160} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={inputClass}>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium md:col-span-2">Summary<textarea maxLength={300} required rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium md:col-span-2">Full announcement<textarea maxLength={10000} required rows={5} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium">Audience class<select value={form.target_class} onChange={(event) => setForm({ ...form, target_class: event.target.value, target_stream: "" })} className={inputClass}><option value="">All students</option>{classes.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="text-sm font-medium">Senior stream<select value={form.target_stream} disabled={!form.target_class?.startsWith("SS ")} onChange={(event) => setForm({ ...form, target_stream: event.target.value })} className={inputClass}><option value="">All streams</option><option value="science">Science</option><option value="commercial">Commercial</option><option value="art">Arts</option></select></label>
              <label className="flex items-center gap-3 text-sm font-medium md:col-span-2"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} className="h-4 w-4 accent-blue-700" />Publish immediately</label>
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 md:col-span-2">{message}</p>}
              <div className="flex flex-wrap gap-2 md:col-span-2"><button disabled={saving} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Create announcement"}</button>{editing && <button type="button" onClick={reset} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50">Cancel edit</button>}</div>
            </form>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">All announcements</h2><p className="mt-1 text-sm text-slate-500">{items.length} total</p></div><button type="button" onClick={() => void load()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Refresh</button></div>
            {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading announcements…</p> : items.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No announcements yet. Create one above.</p> : <div className="space-y-3">{items.map((item) => <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.title}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.is_published ? "Published" : "Draft"}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{item.category}</span></div><p className="mt-1 text-sm text-slate-500">{audience(item)} · {item.description}</p><p className="mt-1 text-xs text-slate-400">Created {new Date(item.created_at).toLocaleDateString("en-NG")}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => edit(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white">Edit</button><button type="button" onClick={() => void toggle(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white">{item.is_published ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => void remove(item)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button></div></div></article>)}</div>}
          </section>
        </div>
      </div>
    </div>
  </main>;
}
