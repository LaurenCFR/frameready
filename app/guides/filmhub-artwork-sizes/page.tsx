import type { Metadata } from "next";
import Link from "next/link";

const canonicalUrl =
  "https://www.framereadystudio.com/guides/filmhub-artwork-sizes";

export const metadata: Metadata = {
  title: "Filmhub Artwork Sizes for Movies and Shows | FrameReady",
  description:
    "Filmhub artwork dimensions for movie and show submissions, including required poster and landscape sizes, recommended formats, and preparation checks.",
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    title: "What artwork sizes do I need for Filmhub?",
    description:
      "Required and recommended Filmhub artwork dimensions for movies and shows.",
    url: canonicalUrl,
    type: "article",
  },
};

const tableClassName =
  "w-full min-w-[34rem] border-collapse text-left text-sm text-slate-300";
const headingCellClassName =
  "border-b border-white/15 bg-white/[0.06] px-4 py-3 font-semibold text-white";
const cellClassName = "border-b border-white/10 px-4 py-3";

export default function FilmhubArtworkSizesGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] px-5 py-10 text-white sm:px-8 sm:py-14">
      <article className="mx-auto max-w-4xl">
        <Link
          href="/filmhub-artwork-checker"
          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          ← Filmhub artwork checker
        </Link>

        <header className="mt-8 border-b border-white/10 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
            Filmhub artwork guide
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            What artwork sizes do I need for Filmhub?
          </h1>
        </header>

        <div className="space-y-10 py-10 text-base leading-8 text-slate-300 sm:text-lg">
          <section className="space-y-6">
            <p>
              <strong className="font-semibold text-white">
                For a movie, Filmhub requires artwork in three sizes:
              </strong>{" "}
              a 2:3 portrait poster at a minimum of{" "}
              <strong className="font-semibold text-white">
                1400 × 2100 pixels
              </strong>
              , a 3:4 portrait poster at{" "}
              <strong className="font-semibold text-white">
                1575 × 2100 pixels
              </strong>
              , and a 16:9 landscape image at{" "}
              <strong className="font-semibold text-white">
                1920 × 1080 pixels
              </strong>
              . All three should display your title clearly.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
              <table className={tableClassName}>
                <thead>
                  <tr>
                    <th className={headingCellClassName}>Artwork</th>
                    <th className={`${headingCellClassName} text-right`}>
                      Minimum dimensions
                    </th>
                    <th className={headingCellClassName}>Required for movies?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={cellClassName}>Portrait 2:3</td>
                    <td className={`${cellClassName} text-right`}>1400 × 2100 px</td>
                    <td className={cellClassName}>Yes</td>
                  </tr>
                  <tr>
                    <td className={cellClassName}>Portrait 3:4</td>
                    <td className={`${cellClassName} text-right`}>1575 × 2100 px</td>
                    <td className={cellClassName}>Yes</td>
                  </tr>
                  <tr>
                    <td className={cellClassName}>Landscape 16:9</td>
                    <td className={`${cellClassName} text-right`}>1920 × 1080 px</td>
                    <td className={cellClassName}>Yes</td>
                  </tr>
                  <tr>
                    <td className={cellClassName}>Landscape 4:3</td>
                    <td className={`${cellClassName} text-right`}>1920 × 1440 px</td>
                    <td className={cellClassName}>Recommended</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <strong className="font-semibold text-white">
                Submitting a show?
              </strong>{" "}
              Filmhub also requires the{" "}
              <strong className="font-semibold text-white">
                4:3 landscape image
              </strong>{" "}
              for shows.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Should I make the recommended sizes too?
            </h2>
            <p>
              If you can, yes. Filmhub says additional artwork can help make a
              title available to more distribution channels. A recommended size
              is optional for submission, but a particular channel may ask for it
              before delivery.
            </p>
            <p>For movies, Filmhub currently recommends these additional assets:</p>

            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03]">
              <table className={tableClassName}>
                <thead>
                  <tr>
                    <th className={headingCellClassName}>Artwork</th>
                    <th className={`${headingCellClassName} text-right`}>
                      Minimum dimensions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["16:9 title treatment", "4320 × 1300 px"],
                    ["Square 1:1", "600 × 600 px"],
                    ["Portrait 7:10", "900 × 1286 px"],
                    ["Landscape 4:3", "1920 × 1440 px"],
                    ["Landscape 16:6", "1920 × 720 px"],
                    ["Landscape 2:1", "1920 × 960 px"],
                    ["Landscape 16:9 textless", "1920 × 1080 px"],
                  ].map(([artwork, dimensions]) => (
                    <tr key={artwork}>
                      <td className={cellClassName}>{artwork}</td>
                      <td className={`${cellClassName} text-right`}>
                        {dimensions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              The <strong className="font-semibold text-white">16:9 textless</strong>{" "}
              image must contain no text, including the film title. The title
              treatment is different: it contains the title logo or title text on
              a transparent background, without background imagery.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              What else does Filmhub check?
            </h2>
            <p>
              Correct dimensions are only part of artwork preparation. Before
              uploading, check that:
            </p>
            <ul className="list-disc space-y-3 pl-6 marker:text-cyan-300">
              <li>
                The title is easy to read even when the image is displayed as a
                small thumbnail.
              </li>
              <li>
                Important text, faces, and visual details sit within a{" "}
                <strong className="font-semibold text-white">5% safe margin</strong>{" "}
                on every side.
              </li>
              <li>
                Each size has been composed for its own shape. Stretching an image
                or adding borders to force a ratio can cause QC problems.
              </li>
              <li>
                The designs feel consistent across sizes, even where the crop and
                layout change.
              </li>
              <li>
                Your artwork does not include festival laurels, billing blocks,
                release dates, or other promotional text that Filmhub may flag.
              </li>
            </ul>
            <p>
              Filmhub accepts{" "}
              <strong className="font-semibold text-white">JPEG and PNG</strong>{" "}
              for artwork uploaded to its dashboard. Keep your editable source
              files for your own production work, but export the finished images
              in an accepted format.
            </p>
          </section>

          <section className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              A practical starting point
            </h2>
            <p>
              Prepare the three required movie sizes first:{" "}
              <strong className="font-semibold text-white">2:3, 3:4, and 16:9</strong>
              . Review them together at thumbnail size, then add the recommended
              formats that suit your release plans. This gives you a complete
              starting set without assuming that one crop will work everywhere.
            </p>
          </section>

          <aside className="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-6 sm:p-8">
            <p>
              <strong className="font-semibold text-white">
                Need help preparing your artwork?
              </strong>{" "}
              FrameReady can help you adapt and check film artwork for different
              streaming display formats.{" "}
              <Link href="/" className="font-semibold text-cyan-300 underline underline-offset-4">
                Explore FrameReady’s artwork service
              </Link>
              .
            </p>
          </aside>

          <p className="border-t border-white/10 pt-8 text-sm italic leading-7 text-slate-400">
            Requirements can change. Check{" "}
            <a
              href="https://help.filmhub.com/en/articles/2663773-artwork-requirements"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 underline underline-offset-4"
            >
              Filmhub’s current artwork requirements
            </a>{" "}
            before final submission. FrameReady is an independent service and is
            not affiliated with Filmhub.
          </p>
        </div>
      </article>
    </main>
  );
}
