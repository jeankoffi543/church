import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/sections/page-header";
import { getPastorLongMessage } from "@/lib/api";

export const metadata: Metadata = {
  title: "Présentation & Message Doctrinal · MFM Ficgayo",
  description: "Découvrez le message prophétique de bienvenue de notre surintendant régional.",
};

const DEFAULT_LONG_MESSAGE = {
  preacher_id: 1,
  custom_eyebrow: "Message de Bienvenue",
  custom_title: "Mot du Surintendant Régional",
  guarantees_title: "En parcourant ce site, 3 choses vous sont prophétiquement garanties :",
  guarantees_list: [
    "Le salut de votre âme.",
    "La délivrance de toute forme d’oppression et de possession.",
    "Une grande grâce saisira votre vie au nom de JÉSUS. (Actes 4:33)"
  ],
  html_content: `<p class="mt-8 text-justify font-medium">S’il vous plaît, lisez attentivement ceci :</p>
<p class="text-justify"><strong class="text-indigo">Actes 3:1</strong> — Une chose miraculeuse se produisit dans la vie d’un homme né boiteux depuis le sein de sa mère.</p>
<blockquote class="border-l-4 border-gold-dark bg-indigo-mid/[0.04] p-4 rounded-r-xl italic text-indigo font-display text-left">« Verset 1 — Pierre et Jean montèrent ensemble au temple à l’heure de la prière... »</blockquote>
<p class="text-justify font-bold text-indigo mt-4">Notons ces deux expressions :</p>
<div class="space-y-4 pl-4 border-l-2 border-white/60">
  <p class="text-justify">• <strong class="text-indigo">Ils montèrent... :</strong> Frères et sœurs, lorsque vous cultivez un style de vie à savoir « la vie de prière », vous êtes connecté au DIEU qui est dans les cieux. Autrement dit, un chrétien qui prie s’élève à un niveau au-dessus de ses ennemis.</p>
  <p class="text-justify">• <strong class="text-indigo">Ils montèrent... volant comme des aigles :</strong> Toujours au verset 1, « ...au temple à l’heure de la prière ». Bien-aimés, une église qui ne prie pas est une église morte ; JÉSUS a dit : <em>« ma maison sera appelée une maison de prière »</em>.</p>
</div>
<p class="text-justify">Le Ministère de la Montagne de Feu et des Miracles (MFM) est une église de prière où vos mains sont exercées à la guerre et vos doigts au combat. Votre temps de prière est votre temps de puissance, votre temps de prière est votre temps de connexion, votre temps de prière est votre temps d’intimité. Une intimité avec le Saint-Esprit sous-entend que rien ne pourra s’introduire dans votre temps de prière.</p>`,
  preacher_name: "Pasteur David Odion Victor",
  preacher_role: "Surintendant Régional MFM Ficgayo",
  preacher_initials: "DV",
  preacher_photo_path: null
};

export default async function PresentationPage() {
  const messageSetting = await getPastorLongMessage();
  const pastor = messageSetting || DEFAULT_LONG_MESSAGE;

  return (
    <section className="min-h-screen bg-cream px-6 pt-[clamp(96px,11vw,120px)] pb-[90px]">
      <div className="mx-auto max-w-[800px]">
        {/* Back Link */}
        <Link
          href="/eglise"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-indigo-mid transition hover:text-gold-dark"
        >
          <ArrowLeft className="size-4" /> Retour à la vie de l’église
        </Link>

        <PageHeader
          eyebrow={pastor.custom_eyebrow || DEFAULT_LONG_MESSAGE.custom_eyebrow}
          title={pastor.custom_title || DEFAULT_LONG_MESSAGE.custom_title}
        />

        {/* Content Body */}
        <div className="prose prose-indigo mt-8 space-y-6 text-sm md:text-base leading-relaxed text-body-strong">
          
          {/* Welcome Guarantee Banner */}
          <div className="rounded-2xl border border-[#e2b85f]/30 bg-ink p-6 md:p-8 text-cream shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.15),transparent_70%)]" />
            <p className="font-display text-lg md:text-xl font-bold italic text-gold mb-4 text-left">
              Soyez les bienvenus sur cette page Prophétique dans le nom puissant de JÉSUS.
            </p>
            {pastor.guarantees_title && (
              <p className="text-xs font-bold uppercase tracking-wider text-[#9a8fb5] mb-3 text-left">
                {pastor.guarantees_title}
              </p>
            )}
            
            {pastor.guarantees_list && pastor.guarantees_list.length > 0 && (
              <ol className="space-y-2 text-left text-sm md:text-base font-semibold">
                {pastor.guarantees_list.map((guarantee, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f] text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{guarantee}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Render HTML content safely */}
          <div 
            className="mt-8 space-y-6 text-justify"
            dangerouslySetInnerHTML={{ __html: pastor.html_content }}
          />

          {/* Signature with absolute photo/initials handling */}
          <div className="pt-8 border-t border-indigo-mid/10 mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-left">
              <p className="text-sm font-semibold text-gold-dark uppercase tracking-wider">
                Nous vous souhaitons encore la bienvenue.
              </p>
              <p className="text-xs text-body mt-1">Que Dieu vous bénisse abondamment.</p>
            </div>
            
            <div className="flex items-center gap-4 text-left">
              {/* Photo / Initials badge fallback */}
              {pastor.preacher_photo_path ? (
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-[rgba(40,25,80,0.1)] shadow-md">
                  <img
                    src={pastor.preacher_photo_path}
                    alt={pastor.preacher_name || "Prédicateur"}
                    className="size-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-mid to-ink text-gold shadow-md font-display text-lg font-bold">
                  {pastor.preacher_initials || "DV"}
                </div>
              )}

              <div>
                <p className="font-display text-lg font-bold text-indigo italic leading-tight">
                  {pastor.preacher_name || "Pasteur David Odion Victor"}
                </p>
                <p className="text-xs text-body font-semibold mt-0.5">
                  {pastor.preacher_role || "Surintendant Régional MFM Ficgayo"}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
