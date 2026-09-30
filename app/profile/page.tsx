"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type Profile = { full_name: string; admission_number: string; class_name: string; field_of_study: string | null; trade_subject: string | null; session: string; term: string; email: string; phone: string; parent_guardian_name: string; parent_guardian_phone: string };
const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" }, { label: "My Subjects", href: "/courses", icon: "◤" },
  { label: "Results", href: "/results", icon: "◥" }, { label: "Fees", href: "/fees", icon: "₦" },
  { label: "Timetable", href: "/timetable", icon: "◷" }, { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];
const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

async function request<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, { method, cache: "no-store", credentials: "same-origin", headers: body === undefined ? undefined : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Unable to complete the request.");
  return result;
}

export default function ProfilePage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingContact, setSavingContact] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [contactError, setContactError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function loadProfile(localFallback?: StudentSession) {
    const result = await request<{ profile: Profile }>("/api/student/profile");
    setProfile(result.profile);
    setPhone(result.profile.phone);
    setGuardianName(result.profile.parent_guardian_name || localFallback?.parentGuardianName || "");
    setGuardianPhone(result.profile.parent_guardian_phone || localFallback?.parentGuardianPhone || "");
    setNewEmail(result.profile.email);
  }

  useEffect(() => {
    const session = getStudentSession();
    if (!session) { router.replace("/login"); return; }
    setStudent(session);
    void loadProfile(session).catch((reason: unknown) => setContactError(reason instanceof Error ? reason.message : "Unable to load profile."))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveContacts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingContact(true); setContactError(""); setContactMessage("");
    try {
      await request("/api/student/profile", "PATCH", { phone, parent_guardian_name: guardianName, parent_guardian_phone: guardianPhone });
      setContactMessage("Your contact details have been saved."); await loadProfile();
    } catch (reason) { setContactError(reason instanceof Error ? reason.message : "Unable to save contact details."); }
    finally { setSavingContact(false); }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingEmail(true); setEmailError(""); setEmailMessage("");
    try {
      const result = await request<{ message: string }>("/api/student/account", "PATCH", { email: newEmail, currentPassword: emailCurrentPassword });
      setEmailMessage(result.message); setEmailCurrentPassword("");
    } catch (reason) { setEmailError(reason instanceof Error ? reason.message : "Unable to update your email."); }
    finally { setSavingEmail(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingPassword(true); setPasswordError(""); setPasswordMessage("");
    if (newPassword !== confirmPassword) { setPasswordError("The new password entries do not match."); setSavingPassword(false); return; }
    try {
      const result = await request<{ message: string }>("/api/student/account", "PATCH", { currentPassword: passwordCurrent, newPassword });
      setPasswordMessage(result.message); setPasswordCurrent(""); setNewPassword(""); setConfirmPassword("");
    } catch (reason) { setPasswordError(reason instanceof Error ? reason.message : "Unable to update your password."); }
    finally { setSavingPassword(false); }
  }

  if (!student) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;
  const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const stream = profile?.field_of_study === "art" ? "Arts" : profile?.field_of_study ? profile.field_of_study[0].toUpperCase() + profile.field_of_study.slice(1) : "Not assigned";
  const readonly = [
    ["Full name", profile?.full_name ?? student.fullName], ["Admission number", profile?.admission_number ?? student.admissionNumber],
    ["Class", profile?.class_name ?? student.className], ["Stream/category", stream], ["Trade subject", profile?.trade_subject || "Not assigned"],
    ["Academic session", profile?.session ?? student.session], ["Term", profile?.term ?? student.term],
  ];

  return <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
    <style>{`@keyframes profile-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .profile-rise { animation: profile-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .profile-rise { animation: none; } }`}</style>
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
        <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Secondary portal</span></span></Link>
        <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{navigation.map((item) => { const active = item.label === "Profile"; return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}<Link href="/login" onClick={clearStudentSession} className="shrink-0 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 md:hidden">Logout</Link></nav>
        <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/login" onClick={clearStudentSession} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">Logout</Link></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Secondary student portal</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">Profile & Account Settings</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{student.fullName}</span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</span></div></header>
        <div className="mx-auto max-w-5xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
          <section className="profile-rise flex flex-col gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8"><div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-blue-700 text-2xl font-bold">{initials}</div><div className="flex-1"><p className="text-sm text-blue-300">Student profile</p><h2 className="mt-1 text-2xl font-bold">{profile?.full_name ?? student.fullName}</h2><p className="mt-1 text-sm text-slate-300">Admission Number: {profile?.admission_number ?? student.admissionNumber}</p></div></section>

          <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-bold">School and identity information</h2><p className="mt-1 text-sm text-slate-500">These records are managed by your school administrator.</p></div><dl className="mt-5 grid gap-3 sm:grid-cols-2">{readonly.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value || "Not provided"}</dd></div>)}</dl></section>

          <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-bold">Contact details</h2><p className="mt-1 text-sm text-slate-500">Update the phone numbers and guardian details used to contact you.</p></div><form onSubmit={saveContacts} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Your phone number<input type="tel" autoComplete="tel" maxLength={24} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 08012345678 or +2348012345678" className={inputClass} /></label><label className="text-sm font-medium">Parent/guardian name<input autoComplete="name" maxLength={100} value={guardianName} onChange={(event) => setGuardianName(event.target.value)} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Parent/guardian phone<input type="tel" autoComplete="tel" maxLength={24} value={guardianPhone} onChange={(event) => setGuardianPhone(event.target.value)} className={inputClass} /></label>{contactError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{contactError}</p>}{contactMessage && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{contactMessage}</p>}<div className="sm:col-span-2"><button disabled={savingContact || loading} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{savingContact ? "Saving…" : "Save contact details"}</button></div></form></section>

          <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-bold">Account email</h2><p className="mt-1 text-sm text-slate-500">A confirmation email is required before a new email address becomes active.</p></div><form onSubmit={saveEmail} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Email address<input type="email" autoComplete="email" required maxLength={254} value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className={inputClass} /></label><label className="text-sm font-medium sm:col-span-2">Current password<input type="password" autoComplete="current-password" required value={emailCurrentPassword} onChange={(event) => setEmailCurrentPassword(event.target.value)} className={inputClass} /></label>{emailError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{emailError}</p>}{emailMessage && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{emailMessage}</p>}<div className="sm:col-span-2"><button disabled={savingEmail || loading} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60">{savingEmail ? "Updating…" : "Update email"}</button></div></form></section>

          <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="text-lg font-bold">Password and security</h2><p className="mt-1 text-sm text-slate-500">Your new password is managed by Supabase Auth and is never stored in your student record.</p></div><form onSubmit={savePassword} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Current password<input type="password" autoComplete="current-password" required value={passwordCurrent} onChange={(event) => setPasswordCurrent(event.target.value)} className={inputClass} /></label><label className="text-sm font-medium">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span></label><label className="text-sm font-medium">Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} /></label>{passwordError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{passwordError}</p>}{passwordMessage && <p role="status" className="text-sm text-emerald-700 sm:col-span-2">{passwordMessage}</p>}<div className="sm:col-span-2"><button disabled={savingPassword || loading} className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{savingPassword ? "Updating…" : "Change password"}</button></div></form></section>
          <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
        </div>
      </div>
    </div>
  </main>;
}
