import type { Metadata } from "next";
import Link from "next/link";

const canonicalUrl =
  "https://www.framereadystudio.com/guides/amazon-prime-video-artwork-sizes";

export const metadata: Metadata = {
  title: "Amazon Prime Video Artwork Sizes for Movies | FrameReady",
  description:
    "Current Prime Video Slate movie artwork sizes for Cover, Box, Poster and Hero Art, plus text, format and delivery checks.",
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title: "What artwork sizes do I need for Amazon Prime Video?",
    description: "A practical guide to Prime Video Slate movie artwork requirements.",
    url: canonicalUrl,
    type: "article",
  },
};

const artwork = [
  {
    name: "Cover Art",
    ratio: "16:9",
    dimensions: "3840 × 2160 px",
    text: "Title required",
    use: "Browse carousels",
  },
  {
    name: "Movie Box Art",
    ratio: "3:4",
    dimensions: "1920 × 2560 px",
    text: "Title required",
    use: "Search results",
  },
  {
    name: "Poster Art",
    ratio: "2:3",
    dimensions: "2000 × 3000 px",
    text: "Title required",
    use: "Browse carousels",
  },
  {
    name: "Hero Art",
    ratio: "16:9",
    dimensions: "3840 × 2160 px",
    text: "No added text",
    use: "Title detail background",
  },
];

export default function AmazonPrimeVideoArtworkSizesGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] px-5 py-8 text-white sm:px-8 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <Link href="/amazon-prime-artwork-checker" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← Amazon Prime Video artwork checker
        </Link>

        <header className="mt-6 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">Prime Video artwork guide</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            What artwork sizes do I need for Amazon Prime Video?
          </h1>
        </header>

        <div className="space-y-8 py-8 text-base leading-7 text-slate-300">
          <section className="space-y-4">
            <p>
              For a <strong className="text-white">movie delivered through Prime Video Slate</strong>, Amazon lists four basic artwork types: Cover Art, Movie Box Art, Poster Art, and Hero Art. The two 16:9 images serve different purposes: Cover Art shows the title, while Hero Art is a background without added text.
            </p>
            <p className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-6">
              <strong className="text-white">Which requirements are these?</strong> This guide uses Amazon’s current Video Central / Prime Video Slate specifications for movies. If you deliver through an aggregator, follow that partner’s delivery instructions too. Older Prime Video Direct pages may show different image sizes; check the specification for your actual delivery route before exporting.
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="movie-sizes">
            <h2 id="movie-sizes" className="text-2xl font-bold tracking-tight text-white">Prime Video Slate movie artwork sizes</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead className="bg-white/[0.06] text-white">
                  <tr>
                    <th scope="col" className="px-4 py-3">Artwork</th>
                    <th scope="col" className="px-4 py-3">Ratio</th>
                    <th scope="col" className="px-4 py-3">Resolution</th>
                    <th scope="col" className="px-4 py-3">Text</th>
                  </tr>
                </thead>
                <tbody>
                  {artwork.map((item) => (
                    <tr key={item.name} className="border-t border-white/10">
                      <th scope="row" className="px-4 py-3 font-medium text-white">{item.name}<span className="block text-xs font-normal text-slate-400">{item.use}</span></th>
                      <td className="px-4 py-3">{item.ratio}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item.dimensions}</td>
                      <td className="px-4 py-3">{item.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Amazon specifies <strong className="text-white">JPG or PNG, RGB colour, and a 10 MB maximum</strong> for each of these artwork types. Keep the exact aspect ratio. Its documentation also says images over 10,000 pixels on either side can fail ingestion.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">Why do I need two 16:9 versions?</h2>
            <p>
              <strong className="text-white">Cover Art</strong> appears in browsing rows and needs the movie title. <strong className="text-white">Hero Art</strong> sits behind information on the title detail page. Amazon requires Hero Art to be free of added text; incidental text that belongs to the photographed scene is an exception. Export them as separate designs, even though both are 3840 × 2160 pixels.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">Common checks before delivery</h2>
            <ul className="list-disc space-y-3 pl-6 marker:text-cyan-300">
              <li><strong className="text-white">Match the title.</strong> The title on Cover, Box, and Poster Art must match the title entered for the movie.</li>
              <li><strong className="text-white">Check thumbnail legibility.</strong> Amazon’s current quality guide specifies at least 150 px for text on its 3840 × 2160 Cover and 2000 × 3000 Poster art and a 4.5:1 text-to-background contrast ratio. Review at the final exported size as well as at thumbnail size.</li>
              <li><strong className="text-white">Keep important areas clear.</strong> Prime Video overlays interface elements on artwork. Use Amazon’s artwork templates and safe-zone guidance for the particular asset instead of applying one margin to every format.</li>
              <li><strong className="text-white">Remove unwanted overlays.</strong> Avoid watermarks, unrelated logos, URLs, format badges, and extra padding or letterboxing. Compose or crop each shape from suitable source art rather than stretching it.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">What about a series or enhanced artwork?</h2>
            <p>
              Seasons use <strong className="text-white">4:3 Box Art at 2560 × 1920 pixels</strong>, rather than the movie’s 3:4 Box Art. Amazon also lists separate textless episodic images for episodes. Optional enhanced assets, such as Carousel Hero Art, Title Art, and variants, have their own specifications. Check the relevant Amazon documentation and your delivery partner’s requirements for these cases.
            </p>
            <p>
              See our <Link href="/guides/amazon-prime-video-series-enhanced-artwork" className="font-semibold text-cyan-300 underline underline-offset-4">Prime Video series and enhanced artwork guide</Link> for the season, episode and additional artwork sizes.
            </p>
          </section>

          <aside className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 sm:p-6">
            <strong className="text-white">Need help preparing multiple sizes?</strong>{" "}
            FrameReady can help adapt and check your movie artwork for streaming display formats. <Link href="/" className="font-semibold text-cyan-300 underline underline-offset-4">Explore FrameReady’s artwork service</Link>.
          </aside>

          <p className="border-t border-white/10 pt-6 text-sm italic leading-7 text-slate-400">
            Specifications can change. Check Amazon’s <a href="https://videocentral.amazon.com/support/required-artwork-specifications" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">Required Artwork Specifications</a> and <a href="https://videocentral.amazon.com/support/artwork-quality-and-compliance" target="_blank" rel="noreferrer" className="text-cyan-300 underline underline-offset-4">Artwork Quality and Compliance</a> before final delivery. FrameReady is an independent service and is not affiliated with Amazon or Prime Video.
          </p>
        </div>
      </article>
    </main>
  );
}
