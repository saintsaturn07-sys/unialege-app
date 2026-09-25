"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: "⌂" },
  { label: "My Subjects", href: "/courses", icon: "▤" },
  { label: "Results", href: "/results", icon: "▥" },
  { label: "Fees", href: "/fees", icon: "＄" },
  { label: "Timetable", href: "/timetable", icon: "◷" },
  { label: "Announcements", href: "/announcements", icon: "◉" },
  { label: "Profile", href: "/profile", icon: "◎" },
];

const feeItems = [
  { name: "Tuition", amount: 320000, paid: 0 },
  { name: "Development Levy", amount: 70000, paid: 0 },
  { name: "ICT Fee", amount: 25000, paid: 0 },
  { name: "Examination Fee", amount: 30000, paid: 0 },
  { name: "PTA Levy", amount: 15000, paid: 0 },
  { name: "Uniform", amount: 65000, paid: 0 },
  { name: "Textbooks", amount: 75000, paid: 0 },
  { name: "Other Approved School Charges", amount: 45000, paid: 0 },
];

const transactions: { date: string; description: string; amount: number; reference: string; status: string }[] = [];

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number) {
  return currency.format(amount);
}

export default function FeesPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (session) {
      setStudent(session);
    } else {
      router.replace("/login");
    }
  }, [router]);

  const totalFees = feeItems.reduce((sum, item) => sum + item.amount, 0);
  const amountPaid = feeItems.reduce((sum, item) => sum + item.paid, 0);
  const balance = totalFees - amountPaid;
  const paymentStatus = "Preview only";

  function handleLogout() {
    clearStudentSession();
  }

  if (!student) {
    return <main className="min-h-screen bg-slate-50" aria-busy="true" />;
  }

  const studentInitials = student.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        @keyframes fees-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .fees-rise { animation: fees-rise 500ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .fees-rise { animation: none; } }
      `}</style>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col md:flex-row">
        <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <Link href="/" className="flex items-center gap-3 px-5 py-5 md:px-7 md:py-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white">U</span>
            <span>
              <span className="block text-lg font-bold tracking-tight">UNIALEGE</span>
              <span className="block text-xs text-slate-500">Secondary portal</span>
            </span>
          </Link>

          <nav aria-label="Student navigation" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-4 md:py-4">
            {navigation.map((item) => {
              const active = item.label === "Fees";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 md:px-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                >
                  <span aria-hidden="true" className="w-5 text-center text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link href="/login" onClick={handleLogout} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 md:hidden">
              <span aria-hidden="true" className="w-5 text-center">↪</span> Logout
            </Link>
          </nav>

          <div className="hidden border-t border-slate-100 p-4 md:block">
            <Link href="/login" onClick={handleLogout} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700">
              <span aria-hidden="true" className="w-5 text-center">↪</span> Logout
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8 lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Secondary student portal</p>
              <h1 className="mt-1 text-lg font-semibold sm:text-xl">School Fees</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-slate-500 sm:block">{student.term} · {student.session}</span>
              <div id="profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800" aria-label={`${student.fullName} profile`}>{studentInitials}</div>
            </div>
          </header>

          <div className="space-y-7 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <section className="fees-rise flex flex-col justify-between gap-5 rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-sm sm:px-8 sm:py-8 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-medium text-blue-300">Fee account</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Hello, {student.fullName}</h2>
                <p className="mt-2 text-sm text-slate-300">View your school charges and payment history.</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-7 gap-y-3 rounded-2xl border border-white/15 bg-white/5 p-4 sm:grid-cols-3 lg:min-w-[570px]">
                <div><dt className="text-xs text-slate-400">Full Name</dt><dd className="mt-1 text-sm font-semibold">{student.fullName}</dd></div>
                <div><dt className="text-xs text-slate-400">Admission Number</dt><dd className="mt-1 text-sm font-semibold">{student.admissionNumber}</dd></div>
                <div><dt className="text-xs text-slate-400">Class</dt><dd className="mt-1 text-sm font-semibold">{student.className}</dd></div>
                <div><dt className="text-xs text-slate-400">Session</dt><dd className="mt-1 text-sm font-semibold">{student.session}</dd></div>
                <div><dt className="text-xs text-slate-400">Term</dt><dd className="mt-1 text-sm font-semibold">{student.term}</dd></div>
              </dl>
            </section>

            <section aria-label="Fee summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Total Fees", value: formatCurrency(totalFees), note: "First term charges", tone: "bg-blue-50 text-blue-700", icon: "₦" },
                { label: "Amount Paid", value: formatCurrency(amountPaid), note: "No demo payment history", tone: "bg-emerald-50 text-emerald-700", icon: "✓" },
                { label: "Balance", value: formatCurrency(balance), note: "Remaining amount", tone: "bg-amber-50 text-amber-700", icon: "↗" },
                { label: "Payment Status", value: paymentStatus, note: "Preview only", tone: "bg-violet-50 text-violet-700", icon: "◷" },
              ].map((item, index) => (
                <article key={item.label} className="fees-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: `${index * 65}ms` }}>
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-slate-500">{item.label}</p><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${item.tone}`} aria-hidden="true">{item.icon}</span></div>
                  <p className={`mt-4 font-bold tracking-tight ${item.label === "Payment Status" ? "text-lg" : "text-xl sm:text-2xl"}`}>{item.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                </article>
              ))}
            </section>

            <section className="fees-rise flex flex-col justify-between gap-4 rounded-2xl bg-blue-700 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:p-6" style={{ animationDelay: "100ms" }}>
              <div><p className="text-sm font-medium text-blue-100">Outstanding balance</p><p className="mt-1 text-2xl font-bold">{formatCurrency(balance)}</p><p className="mt-1 text-sm text-blue-100">Use the school office for approved payment options.</p></div>
              <button type="button" onClick={() => setActionMessage("Payment integration coming soon.")} className="inline-flex shrink-0 justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-700">Make Payment</button>
            </section>
            {actionMessage && <p role="status" className="-mt-4 text-sm font-medium text-blue-700">{actionMessage}</p>}

            <section className="fees-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "150ms" }}>
              <div><h2 className="text-lg font-bold">Fee Breakdown</h2><p className="mt-1 text-sm text-slate-500">Sample fee schedule · demo values only, not an account statement</p></div>

              <div className="mt-5 space-y-3 md:hidden">
                {feeItems.map((item) => (
                  <article key={item.name} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex justify-between gap-3"><h3 className="font-semibold">{item.name}</h3><span className="text-sm font-semibold">{formatCurrency(item.amount)}</span></div>
                    <div className="mt-3 flex justify-between text-sm"><span className="text-slate-500">Paid</span><span>{formatCurrency(item.paid)}</span></div>
                    <div className="mt-1 flex justify-between text-sm"><span className="text-slate-500">Balance</span><span className="font-medium">{formatCurrency(item.amount - item.paid)}</span></div>
                  </article>
                ))}
              </div>

              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[560px] border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th scope="col" className="px-3 py-3 font-semibold">Fee Item</th><th scope="col" className="px-3 py-3 font-semibold">Amount</th><th scope="col" className="px-3 py-3 font-semibold">Paid</th><th scope="col" className="px-3 py-3 font-semibold">Balance</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeItems.map((item) => <tr key={item.name} className="text-sm transition-colors hover:bg-slate-50"><td className="px-3 py-4 font-medium">{item.name}</td><td className="px-3 py-4">{formatCurrency(item.amount)}</td><td className="px-3 py-4 text-emerald-700">{formatCurrency(item.paid)}</td><td className="px-3 py-4 font-semibold">{formatCurrency(item.amount - item.paid)}</td></tr>)}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-slate-200 text-sm font-bold"><th scope="row" className="px-3 py-4">Total</th><td className="px-3 py-4">{formatCurrency(totalFees)}</td><td className="px-3 py-4">{formatCurrency(amountPaid)}</td><td className="px-3 py-4">{formatCurrency(balance)}</td></tr></tfoot>
                </table>
              </div>
            </section>

            <section className="fees-rise rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" style={{ animationDelay: "210ms" }}>
              <div><h2 className="text-lg font-bold">Payment History</h2><p className="mt-1 text-sm text-slate-500">No real payments are recorded in this demo.</p></div>

              <div className="mt-5 space-y-3 md:hidden">
                {transactions.map((transaction) => (
                  <article key={transaction.reference} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{transaction.description}</h3><p className="mt-1 text-xs text-slate-500">{transaction.date} · {transaction.reference}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transaction.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{transaction.status}</span></div>
                    <div className="mt-3 flex items-center justify-between"><span className="font-bold">{formatCurrency(transaction.amount)}</span>{transaction.status === "Completed" && <button type="button" onClick={() => setActionMessage(`Receipt for ${transaction.reference} is coming soon.`)} className="text-sm font-semibold text-blue-700 hover:underline">Download Receipt</button>}</div>
                  </article>
                ))}
              </div>

              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th scope="col" className="px-3 py-3 font-semibold">Date</th><th scope="col" className="px-3 py-3 font-semibold">Description</th><th scope="col" className="px-3 py-3 font-semibold">Amount</th><th scope="col" className="px-3 py-3 font-semibold">Reference</th><th scope="col" className="px-3 py-3 font-semibold">Status</th><th scope="col" className="px-3 py-3 font-semibold">Receipt</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((transaction) => (
                      <tr key={transaction.reference} className="text-sm transition-colors hover:bg-slate-50">
                        <td className="px-3 py-4 text-slate-600">{transaction.date}</td><td className="px-3 py-4 font-medium">{transaction.description}</td><td className="px-3 py-4 font-semibold">{formatCurrency(transaction.amount)}</td><td className="px-3 py-4 text-slate-500">{transaction.reference}</td>
                        <td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transaction.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{transaction.status}</span></td>
                        <td className="px-3 py-4">{transaction.status === "Completed" ? <button type="button" onClick={() => setActionMessage(`Receipt for ${transaction.reference} is coming soon.`)} className="whitespace-nowrap text-xs font-semibold text-blue-700 hover:underline">Download Receipt</button> : <span className="text-xs text-slate-400">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="pb-2 text-center text-xs text-slate-400">© 2026 Unialege · Secondary Student Portal</footer>
          </div>
        </div>
      </div>
    </main>
  );
}
