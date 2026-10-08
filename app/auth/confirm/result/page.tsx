import Link from "next/link";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  GraduationCap,
} from "lucide-react";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function EmailConfirmationPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const success = status === "success";

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6fb] px-4 py-10 text-[#11213a] dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-28 -top-36 h-96 w-96 rounded-full bg-blue-200/55 blur-3xl dark:bg-blue-900/25" />
        <div className="absolute -bottom-44 -right-28 h-[30rem] w-[30rem] rounded-full bg-cyan-100/70 blur-3xl dark:bg-cyan-900/15" />
      </div>

      <section
        aria-labelledby="confirmation-title"
        className="relative w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_-44px_rgba(17,33,58,0.42)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:p-10"
      >
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-1 ${
            success
              ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
              : "bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
          }`}
        />

        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="UniAllege home"
            className="inline-flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 dark:focus-visible:ring-offset-slate-900"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#3e7bea] to-[#19449e] text-white shadow-[0_8px_20px_-10px_rgba(26,74,158,0.72)]">
              <GraduationCap aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-sm font-extrabold tracking-[0.12em] text-[#11213a] dark:text-white">
              UNIALEGE
            </span>
          </Link>
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:inline-flex">
            STUDENT PORTAL
          </span>
        </header>

        <div
          aria-live="polite"
          className="mt-9 text-center sm:mt-11"
          role={success ? "status" : "alert"}
        >
          <div
            className={`mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.4rem] ring-1 ${
              success
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20"
            }`}
          >
            {success ? (
              <CircleCheck
                aria-hidden="true"
                className="h-9 w-9"
                strokeWidth={1.8}
              />
            ) : (
              <CircleAlert
                aria-hidden="true"
                className="h-9 w-9"
                strokeWidth={1.8}
              />
            )}
          </div>

          <p
            className={`mt-6 text-xs font-bold uppercase tracking-[0.16em] ${
              success
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            }`}
          >
            {success ? "Confirmation complete" : "Action needed"}
          </p>
          <h1
            id="confirmation-title"
            className="mt-2 text-2xl font-bold tracking-[-0.035em] text-[#11213a] dark:text-white sm:text-[1.8rem]"
          >
            {success
              ? "Email confirmed successfully"
              : "We couldn't confirm your email"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#65758e] dark:text-slate-300 sm:text-[15px]">
            {success
              ? "Your new email address is confirmed and your account is ready to use. Sign in to continue to the Student Portal."
              : "This confirmation link may have expired or already been used. Return to the Student Portal and request the email change again if needed."}
          </p>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 dark:border-slate-800 sm:mt-9 sm:pt-7">
          <Link
            href="/login"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2f65cd] to-[#214da9] px-5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(25,65,145,0.8)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <span>Return to Student Portal</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
            Your UniAllege account security is protected.
          </p>
        </div>
      </section>
    </main>
  );
}
