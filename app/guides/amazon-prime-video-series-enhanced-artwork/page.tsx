import type { Metadata } from "next";
import Link from "next/link";

const canonicalUrl =
  "https://www.framereadystudio.com/guides/amazon-prime-video-series-enhanced-artwork";

export const metadata: Metadata = {
  title: "Prime Video Series and Enhanced Artwork Guide | FrameReady",
  description:
    "Prime Video Slate season and episode artwork sizes, plus Carousel Hero, Title Art, trailer thumbnails and variant requirements.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "What artwork does a Prime Video series need?",
    description: "Season, episode and enhanced artwork for Prime Video Slate.",
    url: canonicalUrl,
    type: "article",
  },
};

const seasonArt = [
  ["Season Cover Art", "16:9", "3840 × 2160 px", "Season title"],
  ["Season Box Art", "4:3", "2560 × 1920 px", "Season title"],
  ["Season Poster Art", "2:3", "2000 × 3000 px", "Series title"],
  ["Season Hero Art", "16:9", "3840 × 2160 px", "No added text"],
  ["Episode artwork", "16:9", "3840 × 2160 px", "No added text"],
];

const enhancedArt = [
  ["Carousel Hero Art", "8:3", "3840 × 1440 px", "JPG/PNG · 10 MB max"],
  ["Title Art", "Flexible", "2200 × 960 px reference", "Transparent PNG · 1 MB max"],
  ["Trailer / Bonus Art", "16:9", "3840 × 2160 px", "JPG/PNG · 10 MB max"],
  ["Cover / Poster / Hero variants", "Same as default", "Same as default", "JPG/PNG · 10 MB max"],
];

function ArtworkTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
        <thead className="bg-white/[0.06] text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Asset</th>
            <th scope="col" className="px-4 py-3">Ratio</th>
            <th scope="col" className="px-4 py-3">Resolution</th>
            <th scope="col" className="px-4 py-3">Text / file</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, ratio, resolution, detail]) => (
            <tr key={name} className="border-t border-white/10">
              <th scope="row" className="px-4 py-3 font-medium text-white">{name}</th>
              <td className="px-4 py-3">{ratio}</td>
              <td className="whitespace-nowrap px-4 py-3">{resolution}</td>
              <td className="px-4 py-3">{detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrimeVideoSeriesArtworkGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] px-5 py-8 text-white sm:px-8 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/guides/amazon-prime-video-artwork-sizes" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← Prime Video movie artwork sizes
        </Link>
        <header className="mt-6 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">Prime Video artwork guide</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What artwork does a Prime Video series need?</h1>
          <p className="mt-3 text-base text-slate-300">Season, episode and enhanced artwork for Prime Video Slate</p>
        </header>

        <div className="space-y-8 py-8 text-base leading-7 text-slate-300">
          <section className="space-y-4">
            <p>Series artwork needs more than a movie poster resized to fit. Amazon lists separate season images and a dedicated image for each episode. This guide uses the current <strong className="text-white">Prime Video Slate / Video Central</strong> specifications. If you work through an aggregator, check its delivery instructions for your title as well.</p>
          </section>

          <section className="space-y-4" aria-labelledby="season-artwork">
            <h2 id="season-artwork" className="text-2xl font-bold tracking-tight text-white">Season and episode artwork</h2>
            <ArtworkTable rows={seasonArt} />
            <p>Season Box Art is <strong className="text-white">4:3</strong>, unlike the <strong className="text-white">3:4</strong> Movie Box Art. Amazon lists JPG or PNG in RGB, with a 10 MB maximum for these images. Cover, Box and Poster Art carry the title. Hero and episodic images must have no added text, except text naturally present in the scene.</p>
            <p>Each episode should have its own representative, spoiler-free still. Amazon classifies episodic art as required, but says that if it is missing, the system can fall back to the season cover. That fallback does not provide a distinct image for the episode. Do not add episode titles or captions over the still.</p>
          </section>

          <section className="space-y-4" aria-labelledby="enhanced-artwork">
            <h2 id="enhanced-artwork" className="text-2xl font-bold tracking-tight text-white">Enhanced artwork</h2>
            <p>Amazon groups the following assets under enhanced experience artwork. Prepare the applicable core assets first, then decide which extras suit your delivery. Supplying an asset does not guarantee a particular promotional placement.</p>
            <ArtworkTable rows={enhancedArt} />
            <ul className="list-disc space-y-3 pl-6 marker:text-cyan-300">
              <li><strong className="text-white">Carousel Hero:</strong> keep it free of added text and place key imagery on the right, leaving the left side for Prime Video’s interface.</li>
              <li><strong className="text-white">Title Art:</strong> use the title logo on a transparent background, crop away empty space, and keep it legible against a dark background. Amazon recommends a horizontal treatment when possible.</li>
              <li><strong className="text-white">Trailer and Bonus Art:</strong> use a representative still from that specific video without added text.</li>
              <li><strong className="text-white">Variants:</strong> alternate Cover, Poster or Hero images match the default asset’s ratio, resolution and quality rules. Amazon specifies a default first and at least three variants per artwork type to activate personalization; these are not replacements for the default assets.</li>
            </ul>
          </section>

          <section className="space-y-4" aria-labelledby="delivery-check">
            <h2 id="delivery-check" className="text-2xl font-bold tracking-tight text-white">Before delivery</h2>
            <ol className="list-decimal space-y-2 pl-6 marker:text-cyan-300">
              <li>Confirm whether your title is a movie, season, episode or bundle and prepare the corresponding assets.</li>
              <li>Check each export’s exact aspect ratio, pixel size, RGB colour space and file size.</li>
              <li>Inspect title readability, textless backgrounds and Amazon’s safe-zone templates at the final size.</li>
              <li>Confirm the artwork language and delivery instructions for the markets and partner you use.</li>
            </ol>
          </section>

          <aside className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 sm:p-6">
            <strong className="text-white">Preparing several artwork formats?</strong>{" "}
            FrameReady can help adapt and check your artwork for streaming displays. <Link href="/" className="font-semibold text-cyan-300 underline underline-offset-4">Explore FrameReady’s artwork service</Link>.
          </aside>

          <p className="border-t border-white/10 pt-6 text-sm italic leading-7 text-slate-400">
            Specifications can change. Check Amazon’s <a href="https://videocentral.amazon.com/support/required-artwork-specifications" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">Required Artwork Specifications</a>, <a href="https://videocentral.amazon.com/support/enhanced-experience-artwork-specifications" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">Enhanced Experience Artwork Specifications</a>, and <a href="https://videocentral.amazon.com/support/personalized-artwork-and-variants" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">variant guidance</a> before delivery. FrameReady is independent and is not affiliated with Amazon or Prime Video.
          </p>
        </div>
      </article>
    </main>
  );
}
