"use client";

import Link from "next/link";


export default function Home() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden bg-white text-slate-950">
      <style>{`
        @keyframes landing-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes landing-glow { from { transform: translate3d(-1%, 0, 0) scale(.98); } to { transform: translate3d(2%, 2%, 0) scale(1.03); } }
        .landing-rise { animation: landing-rise 650ms cubic-bezier(.2,.75,.25,1) both; }
        .landing-glow { animation: landing-glow 14s ease-in-out infinite alternate; }
        @media (prefers-reduced-motion: reduce) { .landing-rise, .landing-glow { animation: none; } }
      `}</style>

      <header className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-slate-950/55 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-4 sm:px-8 lg:px-14">
          <Link href="/" className="group inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-lg font-bold shadow-sm transition group-hover:bg-white/15">U</span>
            <span><span className="block text-sm font-bold tracking-[0.19em]">UNIALEGE</span><span className="block text-[10px] tracking-wide text-slate-400">Education, connected</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-slate-300 lg:flex">
            <a className="transition hover:text-white" href="#about">About</a>
            <a className="transition hover:text-white" href="#academics">Education sections</a>
            <a className="transition hover:text-white" href="#contact">Contact</a>
          </nav>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
            Student portal <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      <section className="relative isolate flex min-h-[760px] items-center overflow-hidden bg-slate-950 pb-16 pt-28 text-white sm:min-h-[820px] sm:pt-36">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="landing-glow absolute -right-40 -top-40 h-[38rem] w-[38rem] rounded-full bg-blue-600/25 blur-[130px]" />
          <div className="landing-glow absolute -bottom-64 left-[12%] h-[34rem] w-[34rem] rounded-full bg-cyan-500/15 blur-[125px] [animation-delay:-6s]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_28%,rgba(30,64,175,.3),transparent_45%),linear-gradient(115deg,rgba(2,6,23,.1),rgba(2,6,23,.75))]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.2)_1px,transparent_1px)] [background-size:76px_76px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
        </div>
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:px-14">
          <div className="landing-rise relative z-10 max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-300/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Learning starts here</p>
            <h1 className="mt-7 text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">A better-connected <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-cyan-200 bg-clip-text text-transparent">school experience.</span></h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">One thoughtful home for students, families, and school teams to stay connected to the learning that matters.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="group inline-flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/35 transition hover:-translate-y-0.5 hover:from-blue-400 hover:to-cyan-400 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/35">Enter Secondary Education <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></Link>
              <a href="#academics" className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-6 py-3.5 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Explore UniAllege</a>
            </div>
            <p className="mt-5 text-xs text-slate-400">Secondary Education is our active product. Accounts are issued by the school.</p>
          </div>

          <div className="landing-rise relative mx-auto w-full max-w-[560px] lg:ml-auto" style={{ animationDelay: "140ms" }}>
            <div aria-hidden="true" className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-500/20 via-cyan-300/10 to-transparent blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/15 bg-white/[0.08] p-3 shadow-[0_40px_100px_-45px_rgba(0,0,0,.9)] backdrop-blur-xl sm:p-4">
              <div className="rounded-[1.45rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5">
                  <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-sm font-bold text-blue-200">U</span><div><p className="text-xs font-semibold text-white">UniAllege Portal</p><p className="mt-1 text-[11px] text-slate-400">Secondary Education</p></div></div>
                  <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">Active</span>
                </div>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">School life, in one place</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: "01", title: "Student accounts", detail: "School-issued access" },
                    { icon: "02", title: "Learning overview", detail: "Subjects and results" },
                    { icon: "03", title: "School updates", detail: "Announcements and events" },
                    { icon: "04", title: "Everyday details", detail: "Fees and timetable" },
                  ].map((item, index) => <div key={item.title} className="landing-rise rounded-xl border border-white/10 bg-white/[0.045] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200/25 hover:bg-white/[0.075]" style={{ animationDelay: `${220 + index * 65}ms` }}><span className="text-[10px] font-bold tracking-[0.15em] text-cyan-200">{item.icon}</span><h2 className="mt-3 text-sm font-semibold text-white">{item.title}</h2><p className="mt-1 text-xs text-slate-400">{item.detail}</p></div>)}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-blue-200/10 bg-gradient-to-r from-blue-500/15 to-cyan-400/10 px-4 py-3"><span className="text-xs font-medium text-slate-200">University and Tertiary Education</span><span className="text-[10px] font-semibold uppercase tracking-wide text-blue-200">Outside current portal</span></div>
              </div>
            </div>
          </div>
        </div>
        <a href="#about" aria-label="Scroll to learn more" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:inline-flex">Discover the platform <span className="ml-2" aria-hidden="true">↓</span></a>
      </section>

      <section id="about" className="scroll-mt-12 bg-white px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Built around learning</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Education moves forward when everyone is connected.</h2></div>
          <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">UniAllege brings everyday school information into one considered experience. Students can follow their learning while school teams manage access and keep families informed.</p>
        </div>
      </section>

      <section id="academics" className="scroll-mt-12 border-y border-slate-200/70 bg-slate-50 px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Secondary school portal</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Education sections</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">This UniAllege project currently supports secondary education. University and tertiary systems are outside its scope.</p></div>
          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            <Link href="/login" className="group relative isolate overflow-hidden rounded-3xl border border-blue-200 bg-slate-950 p-6 text-white shadow-[0_22px_55px_-35px_rgba(29,78,216,.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-35px_rgba(29,78,216,.72)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 sm:p-7">
              <span aria-hidden="true" className="absolute -right-20 -top-24 -z-10 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl transition group-hover:bg-cyan-400/25" />
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Current focus</span>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight">Secondary Education</h3><p className="mt-3 min-h-12 text-sm leading-6 text-slate-300">The active UniAllege portal for secondary school students and administrators.</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white">Enter the portal <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </Link>
            {(["University Education", "Tertiary Education"] as const).map((section, index) => <article key={section} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_55px_-42px_rgba(15,23,42,.4)] sm:p-7" style={{ animationDelay: `${index * 80}ms` }}><span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Not included</span><h3 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{section}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-slate-500">This application is scoped to secondary education.</p></article>)}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-12 px-5 py-20 sm:px-8 lg:py-24">
        <div className="mx-auto flex max-w-[1200px] flex-col justify-between gap-7 rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-7 text-white shadow-xl shadow-blue-950/10 sm:p-10 lg:flex-row lg:items-center lg:p-12"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Your school, your next step</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Need help getting access?</h2><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Student accounts are issued by the school. Contact your administrator for your admission credentials.</p></div><Link href="/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50">Go to student login <span aria-hidden="true">→</span></Link></div>
      </section>

      <footer className="border-t border-white/10 bg-slate-950 px-5 py-7 text-center text-xs text-slate-400 sm:px-8">© {new Date().getFullYear()} UniAllege <span className="mx-2 text-slate-600">·</span> Secondary Education is our current focus</footer>

    </main>
  );
}
