import type { Metadata } from "next";

import { getLiveConfig } from "@/lib/api";
import { LiveStage } from "@/components/live/live-stage";

export const metadata: Metadata = {
  title: "En direct · MFM Ficgayo",
  description: "Suivez le culte de l'Église MFM Ficgayo en direct.",
};

export default async function LivePage() {
  const config = await getLiveConfig();

  return <LiveStage config={config} />;
}
