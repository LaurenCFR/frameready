import Link from "next/link";

type CheckerLandingPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  platformName: string;
  bullets: string[];
};

const platformExamples = [
  "2:3 and 3:4 posters",
  "16:9 key art and textless artwork",
  "4:3, 1:1, banner, and wide artwork",
  "Thumbnail readability and safe-zone review prompts",
];

export default function CheckerLandingPage({
  eyebrow,
  title,
  description,
  platformName,
  bullets,
}: CheckerLandingPageProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] text-white">
      <section className="mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-6 pb-10 pt-16 sm:px-8 lg:px-10">
        <img
          src="/frameready-logo.png"
          alt="FrameReady logo"
          className="mb-8 w-20"
        />

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
          {eyebrow}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
          {description}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/checker"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:shadow-[0_22px_55px_rgba(99,102,241,0.28)]"
          >
            Try Free Artwork Checker
          </Link>
          <Link
            href="/checker"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-amber-300 via-yellow-400 to-orange-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.26)] transition hover:shadow-[0_22px_55px_rgba(245,158,11,0.28)]"
          >
            Get a Free Review
          </Link>
        </div>
      </section>

      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:px-10">
        <div className="rounded-3xl border border-indigo-400/20 bg-[linear-gradient(180deg,rgba(99,102,241,0.12),rgba(255,255,255,0.04))] p-6 shadow-[0_28px_80px_rgba(79,70,229,0.18)] backdrop-blur-xl">
          <h2 className="text-2xl font-semibold text-white">
            Check artwork before submitting to {platformName}.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            FrameReady&apos;s free checker gives filmmakers and distributors a
            quick baseline screen for artwork dimensions, file type, aspect
            ratio, and common delivery risks before platform QC.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {bullets.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-sm font-semibold text-white">What the checker reviews</p>
          <div className="mt-4 space-y-3">
            {platformExamples.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-100">
            Automated checker results are guidance only. Platform delivery can
            still require visual QC, safe-zone review, and manual artwork fixes.
          </p>
        </div>
      </section>
    </main>
  );
}
