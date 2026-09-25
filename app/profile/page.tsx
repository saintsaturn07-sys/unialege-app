"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "₦" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (session) setStudent(session);
    else router.replace("/login");
  }, [router]);

  function logout() { clearStudentSession(); }

  if (!student) return <main className="app-shell min-h-screen bg-slate-50" aria-busy="true" />;

  const initials = student.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const information = [
    { label: "Full Name", value: student.fullName },
    { label: "Admission Number", value: student.admissionNumber },
    { label: "Class", value: student.className },
    { label: "Session", value: student.session },
    { label: "Term", value: student.term },
    { label: "Date of Birth", value: "Not provided" },
    { label: "Gender", value: "Not provided" },
    { label: "Parent/Guardian", value: student.parentGuardianName || "Not available yet" },
    { label: "Parent/Guardian Phone", value: student.parentGuardianPhone || "Not available yet" },
    { label: "Student Email", value: "Not provided" },
  ];

  return (
    <main className="app-shell min-h-screen bg-slate-50 text-slate-900">
      <style>{`@keyframes profile-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .profile-rise { animation: profile-rise 450ms ease-out both; } @media (prefers-reduced-motion: reduce) { .profile-rise { animation: none; } }`}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Secondary portal</span></span></Link>
          <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">{navigation.map((item) => { const active = item.label === "Profile"; return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 transition-colors hover:bg-slate-50"}`}><span className="w-5 text-center" aria-hidden="true">{item.icon}</span>{item.label}</Link>; })}<Link href="/login" onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 md:hidden">↪ Logout</Link></nav>
          <div className="hidden border-t border-slate-100 p-4 md:block"><Link href="/login" onClick={logout} className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700">↪ Logout</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Secondary student portal</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">My Profile</h1></div><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{student.fullName}</span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{initials}</span></div></header>
          <div className="mx-auto max-w-5xl space-y-6 px-5 py-7 sm:px-8 sm:py-9">
            <section className="profile-rise flex flex-col gap-5 rounded-3xl bg-slate-950 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8"><div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-blue-700 text-2xl font-bold">{initials}</div><div className="flex-1"><p className="text-sm text-blue-300">Student profile</p><h2 className="mt-1 text-2xl font-bold">{student.fullName}</h2><p className="mt-1 text-sm text-slate-300">Admission Number: {student.admissionNumber}</p></div><button type="button" onClick={() => setMessage("Profile editing coming soon.")} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50">Edit Profile</button></section>

            <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7" style={{ animationDelay: "80ms" }}><div><h2 className="text-lg font-bold">Student Information</h2><p className="mt-1 text-sm text-slate-500">Your school and contact details</p></div><dl className="mt-5 grid gap-3 sm:grid-cols-2">{information.map((item) => <div key={item.label} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-medium text-slate-500">{item.label}</dt><dd className="mt-1 font-semibold">{item.value}</dd></div>)}</dl></section>

            <section className="profile-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7" style={{ animationDelay: "140ms" }}><div><h2 className="text-lg font-bold">Security</h2><p className="mt-1 text-sm text-slate-500">Manage your account access</p></div><div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Password</h3><p className="mt-1 text-sm text-slate-500">Update your account password.</p></div><button type="button" onClick={() => setMessage("Password changes are coming soon.")} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Change Password</button></div>{message && <p role="status" className="mt-4 text-sm font-medium text-blue-700">{message}</p>}</section>
            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
