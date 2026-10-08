"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";
import { BadgeCheck, KeyRound, Mail, Phone, UserRound } from "lucide-react";
import { StudentPortalShell } from "../components/student-portal-shell";

type Profile = { full_name: string; admission_number: string; class_name: string; field_of_study: string | null; trade_subject: string | null; session: string; term: string; email: string; phone: string; parent_guardian_name: string; parent_guardian_phone: string };
const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" }, { label: "My Subjects", href: "/courses", icon: "◤" },
  { label: "Results", href: "/results", icon: "◥" }, { label: "Fees", href: "/fees", icon: "₦" },
  { label: "Timetable", href: "/timetable", icon: "◷" }, { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];
const inputClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

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

  if (!student) return <main className="min-h-screen bg-[#f5f6fa]" aria-busy="true"/>;
  const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const stream = profile?.field_of_study === "art" ? "Arts" : profile?.field_of_study ? profile.field_of_study[0].toUpperCase() + profile.field_of_study.slice(1) : "Not assigned";
  const readonly = [["Full name", profile?.full_name ?? student.fullName], ["Admission number", profile?.admission_number ?? student.admissionNumber], ["Class", profile?.class_name ?? student.className], ["Stream/category", stream], ["Trade subject", profile?.trade_subject || "Not assigned"], ["Academic session", profile?.session ?? student.session], ["Term", profile?.term ?? student.term]];
  return <StudentPortalShell title="Profile & Account Settings" student={student} period={`${student.session} · ${student.term}`} onLogout={clearStudentSession}>
    <section className="flex flex-col gap-5 rounded-2xl bg-[#18253c] p-5 text-white shadow-lg shadow-slate-900/10 sm:flex-row sm:items-center sm:p-7"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-xl font-bold">{initials}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-blue-300">Student profile</p><h2 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{profile?.full_name ?? student.fullName}</h2><p className="mt-1 text-xs text-slate-300">Admission number {profile?.admission_number ?? student.admissionNumber}</p></div><span className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/[.06] px-3 py-2 text-xs text-slate-200 sm:self-center"><BadgeCheck className="h-4 w-4 text-emerald-300"/>{student.className}</span></section>
    {loading && <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading profile details…</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"><BadgeCheck className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold dark:text-white">School & identity information</h2><p className="mt-1 text-xs text-slate-500">These records are managed by your school administrator.</p></div></div><dl className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{readonly.map(([label,value])=><div key={label} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950"><dt className="text-[10px] font-medium text-slate-400">{label}</dt><dd className="mt-1.5 break-words text-xs font-semibold text-slate-800 dark:text-slate-100">{value || "Not provided"}</dd></div>)}</dl></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Phone className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold dark:text-white">Contact details</h2><p className="mt-1 text-xs text-slate-500">Update the contact details used by your school.</p></div></div><form onSubmit={saveContacts} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium">Your phone number<input type="tel" autoComplete="tel" maxLength={24} value={phone} onChange={(event)=>setPhone(event.target.value)} placeholder="e.g. 08012345678 or +2348012345678" className={inputClass}/></label><label className="text-xs font-medium">Parent/guardian name<input autoComplete="name" maxLength={100} value={guardianName} onChange={(event)=>setGuardianName(event.target.value)} className={inputClass}/></label><label className="text-xs font-medium sm:col-span-2">Parent/guardian phone<input type="tel" autoComplete="tel" maxLength={24} value={guardianPhone} onChange={(event)=>setGuardianPhone(event.target.value)} className={inputClass}/></label>{contactError&&<p role="alert" className="text-xs text-red-700 sm:col-span-2">{contactError}</p>}{contactMessage&&<p role="status" className="text-xs text-emerald-700 sm:col-span-2">{contactMessage}</p>}<div className="sm:col-span-2"><button disabled={savingContact||loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{savingContact?"Saving…":"Save contact details"}</button></div></form></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-lg bg-violet-50 p-2 text-violet-700"><Mail className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold dark:text-white">Account email</h2><p className="mt-1 text-xs text-slate-500">A confirmation email is required before a new address becomes active.</p></div></div><form onSubmit={saveEmail} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium sm:col-span-2">Email address<input type="email" autoComplete="email" required maxLength={254} value={newEmail} onChange={(event)=>setNewEmail(event.target.value)} className={inputClass}/></label><label className="text-xs font-medium sm:col-span-2">Current password<input type="password" autoComplete="current-password" required value={emailCurrentPassword} onChange={(event)=>setEmailCurrentPassword(event.target.value)} className={inputClass}/></label>{emailError&&<p role="alert" className="text-xs text-red-700 sm:col-span-2">{emailError}</p>}{emailMessage&&<p role="status" className="text-xs text-emerald-700 sm:col-span-2">{emailMessage}</p>}<div className="sm:col-span-2"><button disabled={savingEmail||loading} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800">{savingEmail?"Updating…":"Update email"}</button></div></form></section>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="flex items-start gap-3"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><KeyRound className="h-4 w-4"/></span><div><h2 className="text-sm font-semibold dark:text-white">Password & security</h2><p className="mt-1 text-xs text-slate-500">Password changes are handled securely by your account provider.</p></div></div><form onSubmit={savePassword} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-medium sm:col-span-2">Current password<input type="password" autoComplete="current-password" required value={passwordCurrent} onChange={(event)=>setPasswordCurrent(event.target.value)} className={inputClass}/></label><label className="text-xs font-medium">New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={newPassword} onChange={(event)=>setNewPassword(event.target.value)} className={inputClass}/><span className="mt-1 block text-[10px] font-normal text-slate-500">Use at least 8 characters.</span></label><label className="text-xs font-medium">Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} className={inputClass}/></label>{passwordError&&<p role="alert" className="text-xs text-red-700 sm:col-span-2">{passwordError}</p>}{passwordMessage&&<p role="status" className="text-xs text-emerald-700 sm:col-span-2">{passwordMessage}</p>}<div className="sm:col-span-2"><button disabled={savingPassword||loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{savingPassword?"Updating…":"Change password"}</button></div></form></section>
  </StudentPortalShell>;
}