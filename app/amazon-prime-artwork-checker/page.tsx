import type { Metadata } from "next";
import CheckerLandingPage from "@/components/CheckerLandingPage";

export const metadata: Metadata = {
  title: "Artwork Checker for Amazon Prime Video | FrameReady",
  description:
    "Check key art, textless artwork, posters, and platform artwork basics before Amazon Prime Video delivery.",
};

export default function AmazonPrimeArtworkCheckerPage() {
  return (
    <CheckerLandingPage
      eyebrow="Amazon Prime Video artwork checker"
      title="Artwork Checker for Amazon Prime Video"
      platformName="Amazon Prime Video"
      description="Check artwork basics for Amazon Prime Video, including key art, textless artwork, posters, and thumbnail readability risks."
      bullets={[
        "Check 16:9 key art and textless artwork readiness",
        "Review poster, square, and 4:3 artwork needs",
        "Flag common resolution and ratio issues",
        "Get a free review before ordering artwork fixes",
      ]}
    />
  );
}
