"use client";

import Link from "next/link";
import { useState } from "react";

type FutureSection = "University Education" | "Tertiary Education";

export default function Home() {
  const [comingSoonSection, setComingSoonSection] = useState<FutureSection | null>(null);
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <style>{`
        @keyframes home-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .home-rise { animation: home-rise 450ms ease-out both; }
        @media (prefers-reduced-motion: reduce) { .home-rise { animation: none; } }
      `}</style>
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">UNIALEGE</h1>
            <p className="text-xs text-gray-500">
              Excellence • Character • Knowledge
            </p>
          </div>

          <nav className="hidden gap-6 md:flex">
            <a href="#about">About</a>
            <a href="#academics">Academics</a>
            <a href="#admissions">Admissions</a>
            <a href="#contact">Contact</a>
          </nav>

          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white"
          >
            Portal Login
          </Link>
        </div>
      </header>

      <section className="bg-slate-950 px-6 py-28 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="font-semibold uppercase tracking-widest text-blue-400">
            Welcome to Unialege
          </p>

          <h2 className="mt-4 max-w-3xl text-5xl font-bold leading-tight">
            Building tomorrow&apos;s leaders through quality education.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            We provide quality education, strong character, practical
            knowledge, and the foundation students need to succeed.
          </p>

          <div className="mt-8 flex gap-4">
            <a
              href="#admissions"
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold"
            >
              Apply for Admission
            </a>

            <Link
              href="/login"
              className="rounded-lg border border-slate-600 px-6 py-3 font-semibold"
            >
              Student / Staff Login
            </Link>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 py-20">
        <p className="font-semibold uppercase tracking-widest text-blue-600">
          About Us
        </p>

        <h2 className="mt-3 text-3xl font-bold">
          Education with purpose
        </h2>

        <p className="mt-5 max-w-3xl leading-8 text-gray-600">
          Unialege is committed to creating an environment where students
          learn, develop their talents, build confidence, and prepare for
          the future.
        </p>
      </section>

      <section id="academics" className="bg-gray-50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold">Academic Sections</h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Link
              href="/login"
              className="home-rise group rounded-2xl border-2 border-blue-600 bg-blue-50 p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Current focus</span>
              <h3 className="mt-4 text-xl font-bold">Secondary Education</h3>
              <p className="mt-3 leading-6 text-gray-600">
                The active UniAllege section for secondary students, families, and staff.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-700 transition group-hover:gap-3">
                Enter Secondary Education <span aria-hidden="true">→</span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setComingSoonSection("University Education")}
              className="home-rise rounded-2xl border border-gray-200 bg-white p-7 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ animationDelay: "80ms" }}
            >
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">Coming soon</span>
              <h3 className="mt-4 text-xl font-bold">University Education</h3>
              <p className="mt-3 leading-6 text-gray-600">
                A dedicated university experience is in development.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-slate-700">Explore section <span aria-hidden="true">→</span></span>
            </button>

            <button
              type="button"
              onClick={() => setComingSoonSection("Tertiary Education")}
              className="home-rise rounded-2xl border border-gray-200 bg-white p-7 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              style={{ animationDelay: "160ms" }}
            >
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">Coming soon</span>
              <h3 className="mt-4 text-xl font-bold">Tertiary Education</h3>
              <p className="mt-3 leading-6 text-gray-600">
                Advanced learning and professional education tools are coming soon.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-slate-700">Explore section <span aria-hidden="true">→</span></span>
            </button>
          </div>
        </div>
      </section>

      <section id="admissions" className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-3xl bg-blue-600 p-10 text-white">
          <h2 className="text-3xl font-bold">Admissions</h2>

          <p className="mt-4 max-w-2xl text-blue-100">
            Interested in joining Unialege? Learn more about our
            admission process.
          </p>

          <button className="mt-6 rounded-lg bg-white px-6 py-3 font-semibold text-blue-700">
            Learn About Admission
          </button>
        </div>
      </section>

      <section id="contact" className="border-t px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-bold">Contact Unialege</h2>
          <p className="mt-3 text-gray-600">
            Contact the school administration for more information.
          </p>
        </div>
      </section>

      <footer className="bg-slate-950 px-6 py-8 text-center text-slate-400">
        © {new Date().getFullYear()} Unialege. All rights reserved.
      </footer>
      {comingSoonSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-soon-title"
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-700" aria-hidden="true">✦</div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">UniAllege Education</p>
            <h2 id="coming-soon-title" className="mt-2 text-2xl font-bold">{comingSoonSection} is coming soon</h2>
            <p className="mt-3 leading-7 text-slate-600">
              This section is currently under development. Our focus right now is building the Secondary Education experience.
            </p>
            <button
              type="button"
              onClick={() => setComingSoonSection(null)}
              className="mt-7 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to UniAllege
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
