import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

import { getContactInfo } from "@/lib/api";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact · MFM Ficgayo",
  description:
    "Contactez l'Église MFM Ficgayo — une équipe à votre écoute pour toute question, prière ou première visite.",
};

/** Map a social network label to its compact glyph. */
function socialGlyph(label: string): string {
  const key = label.toLowerCase();
  if (key.includes("face")) return "f";
  if (key.includes("you")) return "▶";
  if (key.includes("insta")) return "@";
  return label.charAt(0).toUpperCase();
}

export default async function ContactPage() {
  const contact = await getContactInfo();

  return (
    <section className="bg-cream px-6 pt-[clamp(110px,13vw,150px)] pb-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1080px]">
        {/* Header */}
        <div className="mx-auto mb-[clamp(36px,5vw,56px)] max-w-[640px] text-center">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="mt-3 font-display text-[clamp(40px,6vw,68px)] leading-[1.02] font-semibold tracking-[-0.5px] text-indigo italic">
            Entrons en contact
          </h1>
          <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-relaxed text-body">
            Une question, un sujet de prière, ou simplement l&apos;envie de nous
            rendre visite ? Notre équipe est à ton écoute.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-8">
          {/* Info panel */}
          <div className="relative flex flex-[1_1_340px] flex-col overflow-hidden rounded-[26px] bg-gradient-to-br from-indigo-mid to-ink p-[clamp(28px,4vw,44px)] text-white">
            <div className="absolute -top-12 -right-12 size-[200px] rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.25),transparent_70%)]" />
            <Eyebrow className="text-gold">Nous trouver</Eyebrow>
            <h2 className="mt-3 mb-7 font-display text-[clamp(26px,3vw,36px)] leading-tight font-semibold italic">
              La Maison t&apos;attend
            </h2>

            <div className="flex flex-col gap-5">
              <ContactLine icon={<MapPin className="size-[18px]" />} label="Adresse">
                {contact.address.join(" · ")}
              </ContactLine>
              <ContactLine icon={<Phone className="size-[18px]" />} label="Téléphone">
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-gold">
                  {contact.phone}
                </a>
              </ContactLine>
              <ContactLine icon={<Mail className="size-[18px]" />} label="E-mail">
                <a href={`mailto:${contact.email}`} className="hover:text-gold">
                  {contact.email}
                </a>
              </ContactLine>
              <ContactLine icon={<Clock className="size-[18px]" />} label="Cultes">
                {contact.hours}
              </ContactLine>
            </div>

            <div className="mt-auto pt-8">
              <div className="mb-3 text-[11px] font-bold tracking-[0.15em] text-white/45 uppercase">
                Suivez-nous
              </div>
              <div className="flex gap-2.5">
                {contact.socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex size-[38px] cursor-pointer items-center justify-center rounded-[10px] bg-white/10 text-[14px] font-bold transition-colors hover:bg-white/20"
                  >
                    {socialGlyph(s.label)}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <ContactForm subjects={contact.subjects} />
        </div>

        {/* Map strip */}
        <div className="relative mt-8 h-[260px] overflow-hidden rounded-[26px] border border-[rgba(40,25,80,0.1)] bg-gradient-to-b from-lilac-200 to-lilac-300">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(58,42,110,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(58,42,110,.06) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
            <div className="size-[30px] rotate-[-45deg] rounded-[50%_50%_50%_0] border-2 border-white bg-gradient-to-br from-gold to-gold-dark shadow-[0_8px_20px_rgba(200,144,46,0.45)]" />
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-[10px] bg-white/90 px-4 py-2.5 text-[13px] font-bold text-indigo shadow-[0_4px_14px_rgba(22,15,51,0.12)]">
            <MapPin className="size-4 text-gold-dark" /> {contact.mapHint}
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactLine({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold ring-1 ring-gold/25">
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-bold tracking-[0.12em] text-white/45 uppercase">
          {label}
        </div>
        <div className="mt-0.5 text-[15px] font-medium text-white/90">
          {children}
        </div>
      </div>
    </div>
  );
}
