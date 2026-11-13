import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "ClipForge AI — Turn ideas into finished videos", template: "%s · ClipForge AI" },
  description: "Describe a video and get a scripted, narrated, subtitled MP4. Faceless videos, social clips, stories and explainers — no editing skills needed.",
  openGraph: { title: "ClipForge AI", description: "AI video creation from a single prompt.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
