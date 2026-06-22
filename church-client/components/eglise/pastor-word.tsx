import React from "react";
import { getPastorWordShowcase } from "@/lib/api";
import { IMG } from "@/lib/data";
import { PastorPortrait } from "./pastor-portrait";

function Facebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function Instagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Youtube(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="9.7 15 9.7 9 15 12 9.7 15" />
    </svg>
  );
}

const DEFAULT_PASTOR_WORD = {
  custom_title: "Surintendant Régional MFM Ficgayo",
  word: "Soyez les bienvenus sur cette page Prophétique dans le nom puissant de JÉSUS.\nEn parcourant ce site, le salut de votre âme, la délivrance de toute forme d'oppression et une grande grâce vous sont garanties.\nLe Ministère de la Montagne de Feu et des Miracles est une église de prière où vos mains sont exercées à la guerre et vos doigts au combat. Votre temps de prière est votre temps de puissance et de connexion spirituelle.",
  photo_path: null,
  social_links: {
    facebook: "https://facebook.com",
    instagram: "https://instagram.com",
    youtube: "https://youtube.com"
  },
  user_name: "Pasteur David Odion Victor"
};

export async function PastorWord() {
  const showcase = await getPastorWordShowcase();
  const data = showcase || DEFAULT_PASTOR_WORD;

  const name = data.user_name || DEFAULT_PASTOR_WORD.user_name;
  const title = data.custom_title || DEFAULT_PASTOR_WORD.custom_title;
  const word = data.word || DEFAULT_PASTOR_WORD.word;
  const photoUrl = data.photo_path || IMG.pastorFallback;
  const socialLinks = data.social_links || {};

  // Split word into paragraphs
  const paragraphs = word
    .split("\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const firstParagraph = paragraphs[0] || "";
  const otherParagraphs = paragraphs.slice(1);

  return (
    <section
      id="mot-du-pasteur"
      className="w-full bg-cream py-24 px-6 border-b border-[rgba(40,25,80,0.06)] scroll-mt-20"
    >
      <div className="mx-auto max-w-[1100px] grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Visual Column */}
        <PastorPortrait photoUrl={photoUrl} name={name} />

        {/* Editorial Column */}
        <div className="flex flex-col justify-center text-left">
          <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mb-1">
            Exhortation & Accueil
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-indigo italic mb-6 leading-tight">
            Le Mot du Pasteur
          </h2>

          {/* Text block with reading constraints */}
          <div className="max-h-[380px] overflow-y-auto pr-4 scrollbar-thin space-y-4">
            {firstParagraph && (
              <p className="first-letter:text-6xl first-letter:font-bold first-letter:text-gold first-letter:mr-3 first-letter:float-left text-body-strong leading-relaxed text-justify">
                {firstParagraph}
              </p>
            )}

            {otherParagraphs.map((p, idx) => (
              <p key={idx} className="text-body leading-relaxed text-justify">
                {p}
              </p>
            ))}
          </div>

          {/* Signature & Socials */}
          <div className="mt-8 pt-6 border-t border-[rgba(40,25,80,0.1)] flex items-center justify-between">
            <div>
              <h4 className="font-display text-lg font-bold text-indigo italic leading-none">
                {name}
              </h4>
              <span className="text-[10px] font-bold tracking-wider text-gold-dark uppercase mt-1.5 block">
                {title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full border border-[rgba(40,25,80,0.1)] hover:border-gold hover:text-gold-dark text-indigo transition"
                  aria-label="Facebook"
                >
                  <Facebook className="size-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full border border-[rgba(40,25,80,0.1)] hover:border-gold hover:text-gold-dark text-indigo transition"
                  aria-label="Instagram"
                >
                  <Instagram className="size-4" />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full border border-[rgba(40,25,80,0.1)] hover:border-gold hover:text-gold-dark text-indigo transition"
                  aria-label="YouTube"
                >
                  <Youtube className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
