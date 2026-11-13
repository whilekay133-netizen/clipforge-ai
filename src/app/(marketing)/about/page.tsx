import type { Metadata } from "next";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ProsePage title="About ClipForge AI">
      <p>Making a good video usually takes a writer, a voice artist, footage, an editor and a lot of time. ClipForge AI brings those steps into one guided workflow so creators, educators, marketers and businesses can go from an idea to a finished video without editing skills.</p>
      <h2>How we build</h2>
      <ul>
        <li><strong>Real output, not mock-ups.</strong> Every video is scripted, generated, narrated and rendered by real AI services.</li>
        <li><strong>Transparent pricing.</strong> You see the credit estimate before you commit, and failed jobs are refunded.</li>
        <li><strong>Private by default.</strong> Your prompts, projects and media belong to you and are visible only to you.</li>
        <li><strong>Best tool for each job.</strong> Claude by Anthropic writes scripts and plans scenes; specialist models generate visuals and voices.</li>
      </ul>
      <h2>Where we&apos;re going</h2>
      <p>Next up: image-to-video, product ads, brand kits, team workspaces, multilingual dubbing and direct publishing to YouTube, TikTok and Instagram.</p>
    </ProsePage>
  );
}
