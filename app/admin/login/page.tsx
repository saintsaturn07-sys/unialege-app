"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveAdminSession, verifyAdminSession } from "../../lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/demo-login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setError(response.status === 401 ? "Incorrect administrator username or password." : "Unable to verify access. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const session = await verifyAdminSession();
      if (!session) {
        setError("Sign-in was accepted, but the secure administrator session could not be verified. Please try again.");
        setIsSubmitting(false);
        return;
      }
      saveAdminSession(session);
      setIsSuccess(true);
      window.setTimeout(() => router.replace("/admin"), 450);
    } catch {
      setError("Unable to sign in. Check your connection and browser storage, then try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-shell relative isolate flex min-h-screen overflow-hidden bg-slate-950 text-white">
      <style>{`
        @keyframes login-orbit { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(22px, -18px, 0) scale(1.06); } }
        @keyframes login-enter { from { opacity: 0; transform: translateY(18px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .login-orbit { animation: login-orbit 12s ease-in-out infinite alternate; }
        .login-enter { animation: login-enter 650ms cubic-bezier(.2,.75,.25,1) both; }
        @media (prefers-reduced-motion: reduce) { .login-orbit, .login-enter { animation: none; } }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="login-orbit absolute -left-36 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-600/25 blur-[110px]" />
        <div className="login-orbit absolute -bottom-48 right-[12%] h-[32rem] w-[32rem] rounded-full bg-cyan-500/15 blur-[120px] [animation-delay:-5s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_10%,rgba(255,255,255,0.08),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
      </div>

      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_0.84fr] lg:gap-20 lg:px-16">
        <section className="login-enter hidden max-w-2xl lg:block">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xl font-bold shadow-lg shadow-blue-950/25 backdrop-blur">U</span>
            <span><span className="block text-lg font-bold tracking-[0.18em]">UNIALEGE</span><span className="block text-xs text-slate-400">School management platform</span></span>
          </Link>
          <p className="mt-16 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Administrator workspace</p>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-6xl">A clear view of the school, <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">all in one place.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Manage student accounts and keep your school community moving with a calm, connected workspace.</p>
          <div className="mt-12 grid max-w-lg grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"><span className="text-xs font-medium text-slate-400">Current focus</span><p className="mt-2 font-semibold">Secondary Education</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"><span className="text-xs font-medium text-slate-400">Access</span><p className="mt-2 font-semibold">School administrators</p></div>
          </div>
        </section>

        <section className="login-enter mx-auto w-full max-w-[480px] rounded-[2rem] border border-white/15 bg-white/[0.09] p-6 shadow-[0_32px_100px_-35px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-9" style={{ animationDelay: "100ms" }}>
          <Link href="/" className="mb-9 inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 font-bold">U</span>
            <span><span className="block text-sm font-bold tracking-[0.16em]">UNIALEGE</span><span className="block text-[11px] text-slate-400">School management platform</span></span>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200/15 bg-blue-300/10 text-blue-200">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M12 3 4.5 6v5.2c0 4.5 3.2 8.4 7.5 9.8 4.3-1.4 7.5-5.3 7.5-9.8V6L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p className="mt-6 text-sm font-semibold text-blue-200">Administrator access</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Sign in to continue to your UniAllege workspace.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-busy={isSubmitting}>
            <div className="space-y-2">
              <label htmlFor="admin-username" className="text-sm font-medium text-slate-200">Admin email</label>
              <input id="admin-username" name="username" type="email" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="name@school.edu" disabled={isSubmitting || isSuccess} className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/25 focus:border-cyan-300/70 focus:bg-slate-950/55 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-65" />
            </div>
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium text-slate-200">Password</label>
              <div className="relative">
                <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" disabled={isSubmitting || isSuccess} className="w-full rounded-xl border border-white/15 bg-slate-950/35 px-4 py-3.5 pr-20 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-white/25 focus:border-cyan-300/70 focus:bg-slate-950/55 focus:ring-4 focus:ring-cyan-300/10 disabled:opacity-65" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} className="absolute inset-y-0 right-3 my-auto rounded-lg px-2 text-xs font-semibold text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" disabled={isSubmitting || isSuccess}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>

            {error && <p role="alert" className="login-enter rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200">{error}</p>}
            {isSuccess && <p role="status" className="login-enter rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-medium text-emerald-200">Access verified. Opening your workspace…</p>}

            <button type="submit" disabled={isSubmitting || isSuccess} className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/35 transition duration-200 hover:-translate-y-0.5 hover:from-blue-400 hover:to-cyan-400 hover:shadow-xl hover:shadow-blue-950/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/35 active:translate-y-0 disabled:cursor-wait disabled:opacity-75">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">{isSuccess ? "Signed in" : isSubmitting ? "Verifying access…" : "Sign in to Admin"}</span>
              {isSubmitting && !isSuccess ? <span aria-hidden="true" className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none" /> : <span aria-hidden="true" className="relative transition-transform group-hover:translate-x-0.5">→</span>}
            </button>
          </form>

          <div className="mt-7 flex items-center gap-3 text-xs leading-5 text-slate-400"><span className="h-px flex-1 bg-white/10" /><span>Secure administrator sign-in</span><span className="h-px flex-1 bg-white/10" /></div>
          <p className="mt-6 text-center text-sm text-slate-400"><Link href="/" className="rounded underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Return to UniAllege</Link></p>
        </section>
      </div>
    </main>
  );
}
