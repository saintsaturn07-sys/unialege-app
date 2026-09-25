"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { findStudentByAdmissionNumber, saveStudentSession } from "../lib/student-store";

export default function LoginPage() {
  const router = useRouter();
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setMessageIsError(false);

    if (!admissionNumber.trim() || !password.trim()) {
      setMessage("Enter your admission number and password to continue.");
      setMessageIsError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      const account = await findStudentByAdmissionNumber(admissionNumber);
      if (!account || account.password !== password || account.status !== "Active") {
        setMessage("Invalid admission number or password. Check your credentials or contact the school administrator.");
        setMessageIsError(true);
        setIsSubmitting(false);
        return;
      }
      saveStudentSession(account);
      setIsSuccess(true);
      window.setTimeout(() => router.push("/dashboard"), 400);
    } catch (error) {
      setMessage(error instanceof Error ? `Unable to check your login right now: ${error.message}` : "Unable to check your login right now. Please try again.");
      setMessageIsError(true);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell relative isolate flex min-h-screen items-center overflow-hidden bg-slate-950 px-4 py-10 text-white sm:px-6">
      <style>{`
        @keyframes student-login-orbit { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(18px, -15px, 0) scale(1.05); } }
        @keyframes student-login-enter { from { opacity: 0; transform: translateY(16px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .student-login-orbit { animation: student-login-orbit 13s ease-in-out infinite alternate; }
        .student-login-enter { animation: student-login-enter 580ms cubic-bezier(.2,.75,.25,1) both; }
        @media (prefers-reduced-motion: reduce) { .student-login-orbit, .student-login-enter { animation: none; } }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className="student-login-orbit absolute -left-40 -top-36 h-[34rem] w-[34rem] rounded-full bg-blue-600/25 blur-[115px]" /><div className="student-login-orbit absolute -bottom-52 -right-28 h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-[120px] [animation-delay:-5s]" /><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_10%,rgba(255,255,255,0.07),transparent_38%)]" /></div>

      <section className="student-login-enter mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/15 bg-white/[0.09] p-6 shadow-[0_32px_100px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-9">
        <Link href="/" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 font-bold">U</span><span><span className="block text-sm font-bold tracking-[0.16em]">UNIALEGE</span><span className="block text-[11px] text-slate-400">Secondary student portal</span></span></Link>
        <div className="mt-9 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200/15 bg-blue-300/10 text-blue-200"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M12 3 4.5 6v5.2c0 4.5 3.2 8.4 7.5 9.8 4.3-1.4 7.5-5.3 7.5-9.8V6L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></div>
        <p className="mt-6 text-sm font-semibold text-blue-200">Student access</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Sign in to continue to your Secondary Education portal.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="space-y-2"><label htmlFor="admission-number" className="text-sm font-medium text-slate-200">Admission Number</label><input id="admission-number" name="admissionNumber" type="text" autoComplete="username" required value={admissionNumber} onChange={(event) => setAdmissionNumber(event.target.value)} placeholder="Enter your admission number" disabled={isSubmitting || isSuccess} className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/25 focus:border-cyan-300/70 focus:bg-slate-950/55 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-65" /></div>
          <div className="space-y-2"><label htmlFor="student-password" className="text-sm font-medium text-slate-200">Password</label><div className="relative"><input id="student-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" disabled={isSubmitting || isSuccess} className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 pr-20 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/25 focus:border-cyan-300/70 focus:bg-slate-950/55 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-65" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} disabled={isSubmitting || isSuccess} className="absolute inset-y-0 right-3 my-auto rounded-lg px-2 text-xs font-semibold text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">{showPassword ? "Hide" : "Show"}</button></div></div>
          <p className="text-sm leading-6 text-slate-300">Your school administrator provides your Admission Number and Password.</p>
          {message && <p role={messageIsError ? "alert" : "status"} className={`student-login-enter rounded-xl border px-4 py-3 text-sm leading-5 ${messageIsError ? "border-rose-300/20 bg-rose-400/10 text-rose-200" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"}`}>{message}</p>}
          {isSuccess && <p role="status" className="student-login-enter rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200">Signed in. Opening your student dashboard…</p>}
          <button type="submit" disabled={isSubmitting || isSuccess} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/35 transition duration-200 hover:-translate-y-0.5 hover:from-blue-400 hover:to-cyan-400 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/35 active:translate-y-0 disabled:cursor-wait disabled:opacity-75"><span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" /><span className="relative">{isSuccess ? "Signed in" : isSubmitting ? "Signing in…" : "Sign in to Student Portal"}</span>{isSubmitting && !isSuccess ? <span aria-hidden="true" className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" /> : <span className="relative transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>}</button>
        </form>

        <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-slate-300"><p className="font-semibold text-slate-100">School-issued access</p><p className="mt-1 text-xs text-slate-400">Need credentials or help signing in? Contact your school administrator. Students cannot create accounts themselves.</p></div>
        <p className="mt-6 text-center text-xs text-slate-400">Forgot your password? <Link href="/register" className="font-semibold text-blue-200 underline decoration-blue-200/30 underline-offset-4 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Contact your school</Link></p>
      </section>
    </main>
  );
}
