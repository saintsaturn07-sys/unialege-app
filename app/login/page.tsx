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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!admissionNumber.trim() || !password.trim()) {
      setMessage("Enter your admission number and password to continue.");
      setMessageIsError(true);
      return;
    }

    const account = findStudentByAdmissionNumber(admissionNumber);
    if (!account || account.password !== password || account.status !== "Active") {
      setMessage("Invalid admission number or password. Check your credentials or contact the school administrator.");
      setMessageIsError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      saveStudentSession(account);
      router.push("/dashboard");
    } catch {
      setMessage("Unable to start a session in this browser. Please check your browser storage settings.");
      setMessageIsError(true);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">Unialege</h1>

        <p className="mt-2 text-gray-600">
          Student, Teacher &amp; Admin Portal
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="admission-number" className="mb-2 block text-sm font-medium">
              Admission Number
            </label>

            <input
              id="admission-number"
              name="admissionNumber"
              type="text"
              autoComplete="username"
              value={admissionNumber}
              onChange={(event) => setAdmissionNumber(event.target.value)}
              placeholder="Enter your admission number"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Password
            </label>

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-pressed={showPassword}
              className="mt-2 text-sm font-medium text-blue-700 hover:underline"
            >
              {showPassword ? "Hide password" : "Show password"}
            </button>
          </div>

          <p className="-mt-2 text-sm text-slate-500">
            Your school administrator provides your Admission Number and Password.
          </p>

          <div className="-mt-2 text-right">
            <Link
              href="/register"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Forgot password? Contact your school administrator.
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          {message && (
            <p
              role={messageIsError ? "alert" : "status"}
              className={`text-sm ${messageIsError ? "text-red-700" : "text-gray-600"}`}
            >
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Login credentials are issued by your school administrator.
        </p>
        <p className="mt-3 text-center text-sm text-gray-600">
          Need login credentials?{" "}
          <Link href="/register" className="font-medium text-blue-700 hover:underline">
            Learn more
          </Link>
        </p>
      </div>
    </main>
  );
}
