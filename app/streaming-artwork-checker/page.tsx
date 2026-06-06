import type { Metadata } from "next";
import CheckerLandingPage from "@/components/CheckerLandingPage";

export const metadata: Metadata = {
  title: "Artwork Checker for Streaming Platforms | FrameReady",
  description:
    "Check artwork files for streaming platforms including Filmhub, Amazon, Apple TV, Roku, Tubi, YouTube, and FAST channels.",
};

export default function StreamingArtworkCheckerPage() {
  return (
    <CheckerLandingPage
      eyebrow="Streaming artwork checker"
      title="Artwork Checker for Streaming Platforms"
      platformName="streaming platforms"
      description="Run a free automated screen for artwork files before delivery to Filmhub, Amazon, Apple TV, Roku, Tubi, YouTube, FAST channels, and more."
      bullets={[
        "Compare uploaded files against common platform artwork needs",
        "Check posters, key art, textless, square, and banner formats",
        "Review automated safe-zone and thumbnail readability warnings",
        "Save your checker report or request a free FrameReady review",
      ]}
    />
  );
}
