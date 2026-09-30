import type { ReactNode } from "react";
import Link from "next/link";

export function SectionHeading({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <div className="portal-section-heading flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[.15em] text-blue-700">{eyebrow}</p>}<h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>{description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function MetricCard({ label, value, detail, icon, tone = "blue", href }: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  tone?: "blue" | "cyan" | "violet" | "emerald" | "amber";
  href?: string;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    cyan: "bg-cyan-50 text-cyan-800 ring-cyan-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
  };
  const content = <><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-slate-500">{label}</p>{icon && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold ring-1 ${tones[tone]}`} aria-hidden="true">{icon}</span>}</div><p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{value}</p>{detail && <p className="mt-1.5 text-xs leading-5 text-slate-500">{detail}</p>}</>;
  const className = `portal-metric-card block rounded-2xl border border-slate-100 bg-white p-5 ${href ? "portal-interactive-card" : ""}`;
  return href ? <Link href={href} className={className}>{content}</Link> : <article className={className}>{content}</article>;
}

export function ProgressMeter({ value, label, tone = "blue" }: { value: number; label: string; tone?: "blue" | "emerald" | "amber" }) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const fills = { blue: "bg-gradient-to-r from-blue-600 to-cyan-500", emerald: "bg-gradient-to-r from-emerald-500 to-teal-400", amber: "bg-gradient-to-r from-amber-500 to-orange-400" };
  return <div className="portal-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safeValue)}>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${fills[tone]} transition-[width] duration-500`} style={{ width: `${safeValue}%` }} /></div>
  </div>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="portal-empty-state rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center">
    <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg text-blue-700 shadow-sm ring-1 ring-slate-100" aria-hidden="true">—</span>
    <h3 className="mt-3 text-sm font-semibold text-slate-800">{title}</h3>{description && <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>}{action && <div className="mt-4">{action}</div>}
  </div>;
}
