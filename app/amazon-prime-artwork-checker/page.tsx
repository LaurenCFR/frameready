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
        "Check 16:9 Cover and textless Hero artwork readiness",
        "Review movie Box and Poster artwork needs",
        "Flag common resolution and ratio issues",
        "Get a free review before ordering artwork fixes",
      ]}
      guideHref="/guides/amazon-prime-video-artwork-sizes"
      guideLabel="Read the Prime Video artwork sizes guide"
    />
  );
}
