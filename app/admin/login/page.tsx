"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ADMIN_DEMO_CREDENTIALS, signInAdmin } from "../../lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (!signInAdmin(username, password)) {
        setError("Incorrect administrator username or password.");
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Unable to start an admin demo session in this browser.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-sm sm:p-9">
        <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 font-bold text-white">U</span><span><span className="block font-bold">UNIALEGE</span><span className="block text-xs text-slate-500">Admin Portal</span></span></Link>
        <p className="mt-8 text-sm font-semibold text-blue-700">Administrator access</p>
        <h1 className="mt-2 text-2xl font-bold">Sign in to Admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">This portal is separate from student access.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div><label htmlFor="admin-username" className="mb-2 block text-sm font-medium">Admin username or email</label><input id="admin-username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter admin username" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <div><label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Admin password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
          <button type="submit" className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-800">Login</button>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><p className="font-semibold text-slate-700">Demo admin credentials</p><p className="mt-1">Username: <span className="font-mono">{ADMIN_DEMO_CREDENTIALS.username}</span></p><p>Password: <span className="font-mono">{ADMIN_DEMO_CREDENTIALS.password}</span></p></div>
        <p className="mt-5 text-center text-xs text-slate-400">Temporary demo access · not production authentication</p>
      </section>
    </main>
  );
}
