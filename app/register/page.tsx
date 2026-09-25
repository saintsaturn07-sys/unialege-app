import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8 sm:px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow sm:p-8">
        <h1 className="text-3xl font-bold">Unialege</h1>
        <p className="mt-2 text-gray-600">Student portal access</p>

        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h2 className="font-semibold text-slate-900">Accounts are issued by the school</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Students cannot create accounts here. Your admission number and password are provided by the school administrator. Please contact the school office if you need your login credentials.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 block w-full rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Back to Login
        </Link>
      </section>
    </main>
  );
}
