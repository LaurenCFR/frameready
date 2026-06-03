import type { Metadata } from "next";
import ArtworkChecker from "@/components/ArtworkChecker";

export const metadata: Metadata = {
  title: "Artwork Checker | FrameReady",
  description:
    "Run a quick standalone artwork file check for type, size, resolution, and format readiness before platform delivery.",
};

export default function CheckerPage() {
  return <ArtworkChecker />;
}
