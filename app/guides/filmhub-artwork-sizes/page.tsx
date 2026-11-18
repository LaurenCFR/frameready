import type { Metadata } from "next";
import Image from "next/image";
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
  "border-b border-white/15 bg-white/[0.06] px-4 py-2.5 font-semibold text-white";
const cellClassName = "border-b border-white/10 px-4 py-2.5";

export default function FilmhubArtworkSizesGuide() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(180deg,_#050608_0%,_#0b0d14_42%,_#050608_100%)] px-5 py-8 text-white sm:px-8 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/filmhub-artwork-checker"
          className="text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          ← Filmhub artwork checker
        </Link>

        <header className="mt-6 border-b border-white/10 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300">
            Filmhub artwork guide
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            What artwork sizes do I need for Filmhub?
          </h1>
        </header>

        <div className="space-y-8 py-8 text-base leading-7 text-slate-300">
          <section className="space-y-4">
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

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
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
                    ["16:9 title treatment", "4320 × 2430 px"],
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

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              What else does Filmhub check?
            </h2>
            <p>
              Correct dimensions are only part of artwork preparation. Before
              uploading, check that:
            </p>

            <aside
              id="artwork-qc-examples"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5"
            >
              <div className="max-w-2xl">
                <h3 className="text-lg font-semibold text-white">
                  Common artwork QC issues, illustrated
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  These are FrameReady illustrations of common QC issues and
                  improvements. They are not examples of artwork reviewed or
                  approved by Filmhub.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <figure className="grid grid-cols-[5.5rem_1fr] items-center gap-3 rounded-2xl border border-rose-400/15 bg-rose-500/[0.06] p-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <Image
                    src="/before-filmhub.jpg"
                    alt="FrameReady illustration showing a low-contrast title, extra promotional copy, and title text close to the artwork edges"
                    width={1400}
                    height={2100}
                    sizes="(max-width: 639px) 100vw, 144px"
                    className="aspect-[2/3] w-[5.5rem] rounded-xl object-cover sm:w-36"
                  />
                  <figcaption>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-200">
                      Illustrated issue
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      The title has low contrast at thumbnail size, promotional
                      copy adds unwanted text, and the wide title treatment sits
                      close to the artwork edges.
                    </p>
                  </figcaption>
                </figure>

                <figure className="grid grid-cols-[5.5rem_1fr] items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/[0.06] p-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <Image
                    src="/after-filmhub.jpg"
                    alt="FrameReady illustration showing a larger high-contrast title with more breathing room and no extra promotional copy"
                    width={1400}
                    height={2100}
                    sizes="(max-width: 639px) 100vw, 144px"
                    className="aspect-[2/3] w-[5.5rem] rounded-xl object-cover sm:w-36"
                  />
                  <figcaption>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Illustrated improvement
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      A larger, higher-contrast title is easier to read, the extra
                      promotional copy is removed, and the composition gives key
                      text more breathing room.
                    </p>
                  </figcaption>
                </figure>
              </div>
            </aside>

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

          <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
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

          <aside className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-5 sm:p-6">
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

          <p className="border-t border-white/10 pt-6 text-sm italic leading-7 text-slate-400">
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
