import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const canonicalUrl =
  "https://www.framereadystudio.com/guides/filmhub-artwork-qc-issues";

export const metadata: Metadata = {
  title: "Why Does Filmhub Flag My Artwork? QC Issues and Fixes | FrameReady",
  description:
    "Understand common Filmhub artwork QC warnings and how to fix title legibility, extra text, safe zones, textless images, and unsuitable crops.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "Why does Filmhub flag my artwork? Common QC issues and fixes",
    description: "A practical guide to common Filmhub artwork warnings and fixes.",
    url: canonicalUrl,
    type: "article",
  },
};

const issues = [
  {
    title: "The title is missing or hard to read",
    warning: "Name not provided or illegible",
    fix: "Use a clear title treatment with enough contrast against the background. Check it at roughly 200–300 pixels tall; if you cannot read it, enlarge the title or simplify the surrounding image.",
  },
  {
    title: "The artwork title does not match your listing",
    warning: "Name not verbatim",
    fix: "Compare the title on the artwork with the title entered in Filmhub, including subtitles and spelling. Make them match exactly before uploading the revised asset.",
  },
  {
    title: "There is extra text on the image",
    warning: "Contains additional text element",
    fix: "Remove billing blocks, laurels, cast credits, release dates, URLs, and promotional copy. Keep the title as the only intended readable text on standard title artwork.",
  },
  {
    title: "A textless image still contains text",
    warning: "Textless artwork has text",
    fix: "Export a separate version without the title or any other text. Do not simply cover the lettering with a flat patch; reconstruct the background so it looks intentional.",
  },
  {
    title: "Text or faces sit too close to the edge",
    warning: "Text outside safe area / Faces cropped or outside safe zone",
    fix: "Keep the title and important facial details, including eyebrows and chins, inside the 5% safe margin on all sides. Filmhub notes that intentional compositions can be exceptions for faces; review the actual warning and artwork before changing the crop.",
  },
];

export default function FilmhubArtworkQcIssuesGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] px-5 py-8 text-white sm:px-8 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/filmhub-artwork-checker" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← Filmhub artwork checker
        </Link>

        <header className="mt-6 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">Filmhub artwork guide</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Why does Filmhub flag my artwork? Common QC issues and fixes
          </h1>
        </header>

        <div className="space-y-9 py-8 text-base leading-7 text-slate-300">
          <section className="space-y-4">
            <p>
              Filmhub checks artwork when you upload it and may show a warning before a person reviews your submission. A warning does not automatically stop you from submitting, and it is not a final QC decision. Use the message to identify what needs attention, then inspect the image at full size and thumbnail size.
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="common-issues">
            <h2 id="common-issues" className="text-2xl font-bold tracking-tight text-white">Common warnings and what to change</h2>
            <div className="space-y-3">
              {issues.map((issue) => (
                <section key={issue.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="text-lg font-semibold text-white">{issue.title}</h3>
                  <p className="mt-1 text-sm text-indigo-200">Filmhub warning: {issue.warning}</p>
                  <p className="mt-3"><strong className="text-white">Fix:</strong> {issue.fix}</p>
                </section>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="other-problems">
            <h2 id="other-problems" className="text-2xl font-bold tracking-tight text-white">Other common artwork problems</h2>
            <p>
              Filmhub also warns against stretched or padded artwork, blurry or low-resolution images, plain production stills used as key art, and the same crop reused across every aspect ratio. Make a composition for each required shape from the best available source, rather than stretching a poster or adding borders to fill the canvas.
            </p>
            <p>
              Need the correct pixel dimensions first? See the <Link href="/guides/filmhub-artwork-sizes" className="font-semibold text-cyan-300 underline underline-offset-4">Filmhub artwork sizes guide</Link>.
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="example">
            <h2 id="example" className="text-2xl font-bold tracking-tight text-white">A visual example</h2>
            <p>These are FrameReady illustrations of a cluttered poster and a cleaner version. They are not artwork reviewed or approved by Filmhub.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { src: "/before-filmhub.jpg", label: "Illustrated issue", description: "Small, low-contrast title and extra copy make the poster harder to read at thumbnail size." },
                { src: "/after-filmhub.jpg", label: "Illustrated improvement", description: "A clearer title, less text, and more space around key details improve readability." },
              ].map((example) => (
                <figure key={example.src} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                  <Image src={example.src} alt={`${example.label}: ${example.description}`} width={1400} height={2100} sizes="(max-width: 639px) 100vw, 360px" className="mx-auto aspect-[2/3] max-h-[28rem] w-auto object-contain" />
                  <figcaption className="border-t border-white/10 p-4 text-sm leading-6"><strong className="block text-white">{example.label}</strong>{example.description}</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="space-y-4" aria-labelledby="before-upload">
            <h2 id="before-upload" className="text-2xl font-bold tracking-tight text-white">Before you upload the replacement</h2>
            <ol className="list-decimal space-y-2 pl-6 marker:text-cyan-300">
              <li>Read the exact warning and compare it with Filmhub’s current requirements.</li>
              <li>Check title spelling, extra text, safe margins, and thumbnail legibility.</li>
              <li>Export each aspect ratio separately as a clean JPEG or PNG at the required dimensions.</li>
              <li>Upload the revised file and review any new warning. Filmhub’s full QC review still determines the outcome.</li>
            </ol>
          </section>

          <aside className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 sm:p-6">
            <strong className="text-white">Need help fixing the artwork?</strong>{" "}
            FrameReady can help check and adapt film artwork for streaming formats. <Link href="/" className="font-semibold text-cyan-300 underline underline-offset-4">Explore FrameReady’s artwork service</Link>.
          </aside>

          <p className="border-t border-white/10 pt-6 text-sm italic leading-7 text-slate-400">
            Requirements can change. Check <a href="https://help.filmhub.com/en/articles/2663773-artwork-requirements" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">Filmhub’s current artwork requirements</a> and <a href="https://help.filmhub.com/en/articles/4447381-common-qc-errors" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">common QC errors</a> before submitting. FrameReady is an independent service and is not affiliated with Filmhub.
          </p>
        </div>
      </article>
    </main>
  );
}
