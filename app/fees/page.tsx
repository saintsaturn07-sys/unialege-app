"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearStudentSession, getStudentSession, type StudentSession } from "../lib/student-store";

type FeeItem = { id: string; name: string; amount_due: number | string; amount_paid: number; balance: number; session: string; term: string };
type Payment = { id: string; fee_item_id: string; fee_name: string; amount: number | string; reference: string; status: "completed" | "pending" | "failed"; paid_at: string | null; created_at: string; notes: string | null };
type FeeData = { fee_items: FeeItem[]; payments: Payment[]; total_due: number; total_paid: number };
const nav = [{ label: "Dashboard", href: "/dashboard" }, { label: "My Subjects", href: "/courses" }, { label: "CBT / Exams", href: "/cbt" }, { label: "Results", href: "/results" }, { label: "Fees", href: "/fees" }, { label: "Timetable", href: "/timetable" }, { label: "Announcements", href: "/announcements" }, { label: "Profile", href: "/profile" }];
const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "—";

function downloadReceipt(payment: Payment, student: StudentSession, feeName: string) {
  if (payment.status !== "completed") return;
  const lines = ["UNIALEGE SCHOOL", "PAYMENT RECEIPT", "", `Student: ${student.fullName}`, `Admission number: ${student.admissionNumber}`, `Class: ${student.className}`, `Fee item: ${feeName}`, `Amount: ${money.format(Number(payment.amount))}`, `Reference: ${payment.reference}`, `Paid on: ${date(payment.paid_at)}`];
  const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `unialege-receipt-${payment.reference.replace(/[^a-z0-9-_]/gi, "_")}.txt`; anchor.click(); URL.revokeObjectURL(url);
}

export default function FeesPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [data, setData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const current = getStudentSession();
    if (!current) { router.replace("/login"); return; }
    setStudent(current);
    void fetch("/api/student/fees", { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
      const body = await response.json() as FeeData & { error?: string };
      if (response.status === 401) { clearStudentSession(); router.replace("/login"); return; }
      if (!response.ok) throw new Error(body.error ?? "Unable to load your fee account.");
      setData(body);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load your fee account."))
      .finally(() => setLoading(false));
  }, [router]);
  if (!student) return <main className="min-h-screen bg-slate-50" aria-busy="true" />;
  const due = data?.total_due ?? 0; const paid = data?.total_paid ?? 0; const balance = Math.max(0, due - paid);
  const paymentStatus = !data?.fee_items.length ? "No fee schedule" : balance <= 0 ? "Paid" : paid > 0 ? "Partially paid" : "Outstanding";
  return <main className="min-h-screen bg-slate-50 text-slate-900"><div className="mx-auto flex min-h-screen max-w-[1500px] flex-col md:flex-row"><aside className="border-b bg-white p-4 md:w-60 md:border-b-0 md:border-r"><Link href="/dashboard" className="block px-3 py-3 text-lg font-bold">UNIALEGE</Link><nav className="flex gap-1 overflow-x-auto md:flex-col">{nav.map((item) => <Link key={item.href} href={item.href} aria-current={item.href === "/fees" ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${item.href === "/fees" ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}<Link href="/login" onClick={clearStudentSession} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50">Logout</Link></nav></aside><section className="min-w-0 flex-1 p-5 sm:p-8"><header className="mb-6"><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">{student.className} · {student.session} · {student.term}</p><h1 className="mt-1 text-2xl font-bold">School Fees</h1><p className="mt-2 text-sm text-slate-500">Fee information recorded for your student account.</p></header>{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{loading ? <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">Loading fee account…</p> : <><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fee summary">{[["Amount Due", money.format(due)], ["Amount Paid", money.format(paid)], ["Balance", money.format(balance)], ["Payment Status", paymentStatus]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-xl font-bold">{value}</p></article>)}</section><section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Fee items</h2><p className="mt-1 text-sm text-slate-500">For {student.session}, {student.term}</p></div><button type="button" disabled title="Payment gateway setup is required before online payments can be accepted." className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">Make Payment · unavailable</button></div>{data?.fee_items.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Fee item</th><th className="p-3">Amount due</th><th className="p-3">Amount paid</th><th className="p-3">Balance</th></tr></thead><tbody className="divide-y">{data.fee_items.map((item) => <tr key={item.id}><td className="p-3 font-medium">{item.name}</td><td className="p-3">{money.format(Number(item.amount_due))}</td><td className="p-3">{money.format(item.amount_paid)}</td><td className="p-3 font-semibold">{money.format(item.balance)}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No fee items have been entered for this class and academic period.</p>}</section><section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5"><h2 className="text-lg font-bold">Payment history</h2>{data?.payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Date</th><th className="p-3">Fee item</th><th className="p-3">Reference</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Receipt</th></tr></thead><tbody className="divide-y">{data.payments.map((payment) => <tr key={payment.id}><td className="p-3">{date(payment.paid_at ?? payment.created_at)}</td><td className="p-3">{payment.fee_name}</td><td className="p-3 font-mono text-xs">{payment.reference}</td><td className="p-3">{money.format(Number(payment.amount))}</td><td className="p-3 capitalize">{payment.status}</td><td className="p-3">{payment.status === "completed" ? <button type="button" onClick={() => downloadReceipt(payment, student, payment.fee_name)} className="font-semibold text-blue-700 hover:underline">Download</button> : <span className="text-slate-400">—</span>}</td></tr>)}</tbody></table></div> : <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No payment transactions are recorded for this account.</p>}</section></>}<footer className="mt-8 text-center text-xs text-slate-400">UniAllege · Secondary Student Portal</footer></section></div></main>;
}
