import Link from "next/link";

import { Eyebrow } from "@/components/ui/eyebrow";
import { BrandButton } from "@/components/ui/brand-button";

export function GiveBand() {
  return (
    <section className="pb-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-indigo-mid to-ink p-[clamp(40px,6vw,72px)] text-center text-white">
          <div className="absolute -top-[60px] -right-10 size-[200px] rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.3),transparent_70%)]" />
          <Eyebrow className="text-gold">Générosité</Eyebrow>
          <h2 className="mx-auto mt-3 mb-4 max-w-[640px] font-display text-[clamp(32px,4.6vw,56px)] leading-[1.02] font-semibold italic">
            Semer pour la moisson
          </h2>
          <p className="mx-auto mb-[30px] max-w-[520px] text-[17px] leading-relaxed text-white/80">
            Ta dîme et tes offrandes font avancer le Royaume et soutiennent la
            Maison. Donne en quelques secondes, en toute sécurité.
          </p>
          <BrandButton asChild variant="gold" size="lg">
            <Link href="/dons">Faire un don</Link>
          </BrandButton>
          <div className="mt-[18px] text-[12.5px] text-white/60">
            🔒 Paiement 100% sécurisé · Reçu envoyé par e-mail
          </div>
        </div>
      </div>
    </section>
  );
}
