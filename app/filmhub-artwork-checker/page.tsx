import type { Metadata } from "next";
import CheckerLandingPage from "@/components/CheckerLandingPage";

export const metadata: Metadata = {
  title: "Artwork Checker for Filmhub | FrameReady",
  description:
    "Check poster, key art, and artwork basics before preparing files for Filmhub delivery.",
};

export default function FilmhubArtworkCheckerPage() {
  return (
    <CheckerLandingPage
      eyebrow="Filmhub artwork checker"
      title="Artwork Checker for Filmhub"
      platformName="Filmhub"
      description="Run a fast artwork readiness check before preparing poster and key art files for Filmhub delivery."
      bullets={[
        "Check common poster and key art aspect ratios",
        "Review baseline dimensions and file size",
        "Spot missing recommended artwork formats",
        "Request a free professional review from FrameReady",
      ]}
    />
  );
}
