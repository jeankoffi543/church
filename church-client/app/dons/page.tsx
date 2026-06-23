import type { Metadata } from "next";

import { getOfferingConfig } from "@/lib/api";
import { DonationForm, DonationPitch } from "@/components/dons/donation-form";

export const metadata: Metadata = {
  title: "Donner · MFM Ficgayo",
  description: "Soutenez l'œuvre de l'Église MFM Ficgayo par vos dons.",
};

export default async function DonsPage() {
  const offering = await getOfferingConfig();

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-stretch gap-8">
        <DonationPitch pitch={offering.pitch} />
        <DonationForm
          purposes={offering.purposes}
          presets={offering.presets}
          methods={offering.methods}
        />
      </div>
    </section>
  );
}
