import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.framereadystudio.com"),
  title: "FrameReady | Streaming Platform Artwork QC & Formatting",
  description:
    "Professional artwork QC and formatting tailored to the specifications for your selected streaming delivery destinations.",
  keywords: [
    "Filmhub artwork requirements",
    "Artwork failed QC",
    "Streaming artwork formatting",
    "Amazon Prime Video artwork",
    "Filmhub poster rejected",
    "OTT artwork design",
    "Platform-ready artwork",
  ],
  openGraph: {
    title: "FrameReady",
    description:
      "Professional artwork QC & formatting for streaming platforms.",
    url: "https://www.framereadystudio.com",
    siteName: "FrameReady",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
