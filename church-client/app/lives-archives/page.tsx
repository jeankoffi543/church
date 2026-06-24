import type { Metadata } from "next";

import { getLatestPastLive, getPastLives } from "@/lib/api";
import { LivesArchive } from "@/components/lives/lives-archive";

export const metadata: Metadata = {
  title: "Lives & Archives · MFM Ficgayo",
  description: "Rediffusions cinématographiques et archives vidéo de nos cultes et enseignements passés.",
};

// Always reflect the latest archive (the live engine adds entries outside Next's cache).
export const dynamic = "force-dynamic";

export default async function LivesArchivesPage() {
  const [latest, lives] = await Promise.all([getLatestPastLive(), getPastLives()]);

  return <LivesArchive latest={latest} lives={lives} />;
}
