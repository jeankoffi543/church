import type { Metadata } from "next";
import { getSermons } from "@/lib/api";
import { LivesArchivesView } from "@/components/mediatheque/lives-archives-view";

export const metadata: Metadata = {
  title: "Lives & Archives · MFM Ficgayo",
  description: "Rediffusions cinématographiques et archives vidéo de nos cultes passés.",
};

export default async function LivesArchivesPage() {
  const sermons = await getSermons();

  return <LivesArchivesView sermons={sermons} />;
}
