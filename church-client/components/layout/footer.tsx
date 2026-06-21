import Link from "next/link";

import { NAV_ITEMS } from "@/lib/data";
import { getContactInfo } from "@/lib/api";
import { Logo } from "./logo";

const FOOTER_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/live", label: "Culte en direct" },
  ...NAV_ITEMS.filter((i) => i.href !== "/"),
];

const getSocialGlyph = (label: string) => {
  switch (label.toLowerCase()) {
    case "facebook":
      return "f";
    case "youtube":
      return "▶";
    case "instagram":
      return "@";
    default:
      return "🌐";
  }
};

export async function Footer() {
  const contact = await getContactInfo();

  return (
    <footer className="bg-ink px-6 pt-[clamp(48px,7vw,72px)] pb-[30px] text-white">
      <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-9">
        {/* Brand */}
        <div>
          <Logo tone="dark" className="mb-4" />
          <p className="mb-4 max-w-[240px] text-[13.5px] leading-relaxed text-white/55">
            Une église chrétienne évangélique de grâce, de feu et de miracles, au
            cœur d&apos;Abidjan.
          </p>
          <div className="flex gap-2.5">
            {contact.socials.map(({ label, url }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex size-[34px] items-center justify-center rounded-[9px] bg-white/10 text-[13px] font-bold transition-colors hover:bg-white/20"
              >
                {getSocialGlyph(label)}
              </a>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div>
          <div className="mb-4 text-xs font-bold tracking-[0.15em] text-gold uppercase">
            Navigation
          </div>
          <div className="flex flex-col gap-2.5">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm text-white/65 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div>
          <div className="mb-4 text-xs font-bold tracking-[0.15em] text-gold uppercase">
            Nous trouver
          </div>
          <address className="text-sm leading-[1.7] text-white/60 not-italic">
            {contact.address.map((line, idx) => (
              <span key={idx}>
                {line}
                <br />
              </span>
            ))}
            {contact.phone}
            <br />
            {contact.email}
          </address>
          <div className="mt-4 text-[13px] text-white/50">
            <strong className="font-bold text-gold">Cultes</strong> · Dim 9h · Mar
            18h30 · Ven 22h
          </div>
        </div>

        {/* Newsletter */}
        <div>
          <div className="mb-4 text-xs font-bold tracking-[0.15em] text-gold uppercase">
            Reste connecté
          </div>
          <p className="mb-3.5 text-[13.5px] leading-snug text-white/55">
            Reçois les actus et les méditations de la semaine.
          </p>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="Ton e-mail"
              className="min-w-0 flex-1 rounded-[10px] border border-white/15 bg-white/10 px-3 py-[11px] text-[13px] text-white outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              aria-label="S'abonner"
              className="rounded-[10px] bg-gradient-to-br from-gold to-gold-dark px-4 text-base font-extrabold text-indigo transition hover:brightness-105"
            >
              →
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto mt-9 flex max-w-[1200px] flex-wrap justify-between gap-2.5 border-t border-white/10 pt-6 text-[12.5px] text-white/40">
        <span>© 2026 Église MFM Ficgayo. Tous droits réservés.</span>
        <span>Bâti avec foi · « À Dieu seul la gloire »</span>
      </div>
    </footer>
  );
}
