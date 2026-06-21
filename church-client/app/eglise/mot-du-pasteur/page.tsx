import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flame, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/sections/page-header";

export const metadata: Metadata = {
  title: "Mot du Pasteur · MFM Ficgayo",
  description: "Message prophétique de bienvenue du Pasteur David Odion Victor, Surintendant régional.",
};

export default function MotDuPasteurPage() {
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
          eyebrow="Message de Bienvenue"
          title="Mot du Surintendant Régional"
        />

        {/* Content Body */}
        <div className="prose prose-indigo mt-8 space-y-6 text-sm md:text-base leading-relaxed text-body-strong">
          
          {/* Welcome Guarantee Banner */}
          <div className="rounded-2xl border border-[#e2b85f]/30 bg-ink p-6 md:p-8 text-cream shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(226,184,95,0.15),transparent_70%)]" />
            <p className="font-display text-lg md:text-xl font-bold italic text-gold mb-4 text-left">
              Soyez les bienvenus sur cette page Prophétique dans le nom puissant de JÉSUS.
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9a8fb5] mb-3 text-left">
              En parcourant ce site, 3 choses vous sont prophétiquement garanties :
            </p>
            <ol className="space-y-2 text-left text-sm md:text-base font-semibold">
              <li className="flex items-start gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f] text-xs font-bold">1</span>
                <span>Le salut de votre âme.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f] text-xs font-bold">2</span>
                <span>La délivrance de toute forme d’oppression et de possession.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f] text-xs font-bold">3</span>
                <span>Une grande grâce saisira votre vie au nom de JÉSUS. <span className="text-gold font-mono text-xs italic">(Actes 4:33)</span></span>
              </li>
            </ol>
          </div>

          <p className="mt-8 text-justify font-medium">
            S’il vous plaît, lisez attentivement ceci :
          </p>

          <p className="text-justify">
            <strong className="text-indigo">Actes 3:1</strong> — Une chose miraculeuse se produisit dans la vie d’un homme né boiteux depuis le sein de sa mère.
          </p>

          <blockquote className="border-l-4 border-gold-dark bg-indigo-mid/[0.04] p-4 rounded-r-xl italic text-indigo font-display text-left">
            « Verset 1 — Pierre et Jean montèrent ensemble au temple à l’heure de la prière... »
          </blockquote>

          <p className="text-justify font-bold text-indigo mt-4">
            Notons ces deux expressions :
          </p>

          <div className="space-y-4 pl-4 border-l-2 border-white/60">
            <p className="text-justify">
              • <strong className="text-indigo">Ils montèrent... :</strong> Frères et sœurs, lorsque vous cultivez un style de vie à savoir « la vie de prière », vous êtes connecté au DIEU qui est dans les cieux. Autrement dit, un chrétien qui prie s’élève à un niveau au-dessus de ses ennemis.
            </p>
            <p className="text-justify">
              • <strong className="text-indigo">Ils montèrent... volant comme des aigles :</strong> Toujours au verset 1, « ...au temple à l’heure de la prière ». Bien-aimés, une église qui ne prie pas est une église morte ; JÉSUS a dit : <span className="italic">« ma maison sera appelée une maison de prière »</span>.
            </p>
          </div>

          <p className="text-justify">
            Le Ministère de la Montagne de Feu et des Miracles (MFM) est une église de prière où vos mains sont exercées à la guerre et vos doigts au combat. Votre temps de prière est votre temps de puissance, votre temps de prière est votre temps de connexion, votre temps de prière est votre temps d’intimité. Une intimité avec le Saint-Esprit sous-entend que rien ne pourra s’introduire dans votre temps de prière.
          </p>

          <p className="text-justify">
            <strong className="text-indigo">Verset 2</strong> — Et un certain « homme qui était boiteux de naissance », depuis l’utérus de sa mère. C’est étrange que la vie et la destinée de cet homme aient été défigurées depuis l’utérus de sa mère. Le livre de Jean parle également d’un homme aveugle de naissance.
          </p>

          <div className="my-6 rounded-xl border border-indigo-mid/10 bg-indigo-mid/[0.02] p-5 space-y-3">
            <p className="flex items-center gap-2 font-semibold text-indigo">
              <Sparkles className="size-4 text-gold-dark" /> Bien-aimés, posez-vous ces questions :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-justify text-sm">
              <li>Savez-vous que votre vie débute 5 minutes après la conception ?</li>
              <li>Savez-vous que depuis l’utérus, le voyage de la vie commence ?</li>
              <li>Savez-vous que le choix Divin se fait depuis l’utérus ? <span className="text-[#c8902e] font-mono text-xs">(Jérémie 1:5, Jérémie a été sanctifié et choisi depuis le sein maternel)</span>.</li>
              <li>Savez-vous que la gloire d’une personne peut être avalée déjà étant dans l’utérus ?</li>
            </ul>
          </div>

          <p className="text-justify">
            Peut-être que cet homme avait été, depuis l’utérus, prédestiné par le Seigneur à être un médecin ou un prophète, mais à cause de la négligence et de l’ignorance de ses parents, l’ennemi l’a rendu boiteux.
          </p>

          <p className="text-justify">
            Que peut un homme qui est boiteux, si ce n’est de mendier pour survivre ? Certains parmi nous étaient supposés survoler et parcourir les nations, mais l’ennemi a eu accès à nous déjà étant dans le sein maternel et a porté sur nous ses actes de méchanceté.
          </p>

          <p className="font-semibold text-indigo">
            Faisons une pause et prions ensemble :
          </p>

          {/* Prayer Point 1 */}
          <div className="rounded-2xl border border-red-500/20 bg-ink p-5 text-center shadow-lg relative overflow-hidden my-4">
            <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase">
              <Flame className="size-3 text-red-500 animate-pulse" /> Point de prière
            </div>
            <p className="mt-2 font-display text-base md:text-lg font-bold italic text-white leading-relaxed">
              « Tout pouvoir qui a paralysé ma destinée depuis l’utérus, laisse-moi aller et meurs au nom de JÉSUS ! »
            </p>
          </div>

          <p className="text-justify">
            Ce même homme était transporté « ...tous les jours à la porte du temple appelée la Belle, pour qu’il demande l’aumône ».
          </p>

          <p className="text-justify">
            Peut-être que ses parents donnaient l’impression de l’aider mais en réalité ils l’utilisaient pour mendier. Comme c’est triste. Il m’est arrivé de voir des parents donner l’impression d’aider la personne qu’ils accompagnaient mais en réalité ils étaient la source du problème. J’ai vu une mère trimballer son jeune homme chez les prophètes alors qu’elle était à la base du problème de son fils qui souffrait d’insuffisance rénale. Quelle méchanceté.
          </p>

          {/* Prayer Point 2 */}
          <div className="rounded-2xl border border-red-500/20 bg-ink p-5 text-center shadow-lg relative overflow-hidden my-4">
            <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase">
              <Flame className="size-3 text-red-500 animate-pulse" /> Point de prière
            </div>
            <p className="mt-2 font-display text-base md:text-lg font-bold italic text-white leading-relaxed">
              « Tout pouvoir qui utilise ma gloire pour prospérer, meurs au nom de JÉSUS ! »
            </p>
          </div>

          <p className="text-justify">
            Le mystère est ceci : ses parents le transportaient à la porte et entraient dans le temple. Quand ils en sortaient, ils récupéraient son dû et le ramenaient à la maison. C’est-à-dire qu’à cet âge, il vivait encore avec ses parents, vu que la Bible ne fait mention nulle part de sa femme et de ses enfants ; il n’avait encore rien accompli dans sa vie. 
          </p>

          <p className="text-justify">
            C’est le cas de plusieurs qui, jusqu’à un certain âge, n’arrivent pas à accomplir quelque chose dans la vie parce qu’il y a des pouvoirs qui traitent avec eux et qui dispersent ce qu’ils rassemblent. Cet homme a souffert plusieurs années durant. Pourquoi la Bible l’a appelé « l’homme » ? Je pense qu’il devait être âgé de 40 ans et plus. N’ayant pas de solution, il était un instrument de subsistance pour sa famille.
          </p>

          <p className="text-justify font-bold text-indigo italic">
            Je prophétise dans la vie de tous ceux dont la destinée est boiteuse depuis la naissance : par le pouvoir qui a ressuscité JÉSUS-CHRIST du tombeau, lève-toi et commence à marcher, à courir et à t’envoler au nom de JÉSUS !
          </p>

          <p className="text-justify">
            <strong className="text-indigo">Verset 6</strong> — « Pierre dit : Je n’ai ni argent ni or... » Cet homme demandait de l’argent ou de l’or, mais il reçut au-delà de ce qu’il avait demandé. Pierre dit : <span className="italic">« ce que j’ai, je te le donne ; au nom de JÉSUS-CHRIST de Nazareth, lève-toi et marche »</span>.
          </p>

          <p className="text-justify">
            <strong className="text-indigo">Verset 7</strong> — « Et le prenant par la main droite, il le fit lever. Au même instant, ses pieds et les os de sa cheville devinrent fermes. » Pierre, en lui prenant la main droite, avait posé un acte violent de foi.
          </p>

          <p className="text-justify">
            La révélation libère la foi et la foi libère les miracles. Pierre eut la révélation sur le nom de JÉSUS-CHRIST, il l’utilisa avec foi et elle produisit le résultat escompté. Le nom de JÉSUS-CHRIST est chargé de pouvoir. Le nom de JÉSUS apporte la délivrance, la guérison et la restauration. Le nom de JÉSUS-CHRIST donne accès à la bénédiction de DIEU.
          </p>

          <p className="text-justify">
            Le nom de JÉSUS nous positionne au-dessus de toutes les principautés, des pouvoirs et de la méchanceté spirituelle dans les lieux élevés. Le diable fléchit le genou lorsque le nom de JÉSUS est invoqué. Le nom de JÉSUS brise toutes les barrières et enlève toutes les limitations. Le nom de JÉSUS provoque le tremblement de terre et le tonnerre dans le camp de l’ennemi.
          </p>

          <p className="text-justify">
            <strong className="text-indigo">Verset 8</strong> — « Et se tint debout d’un bond, et marcha, et entra avec eux dans le temple, marchant, sautant et louant DIEU. » Quel grand miracle. Depuis l’enfance, cet homme avait vu des hommes et des femmes entrer dans le temple sans pouvoir y entrer lui-même parce qu’il était infirme boiteux. Pendant que les gens priaient à l’intérieur du temple, il ne le pouvait pas parce qu’il était boiteux. Son problème l’a retenu hors de la présence de DIEU. Son problème lui fermait la porte de la gloire. À peine reçut-il sa délivrance qu’il se précipita dans le temple, vu qu’il attendait ce moment depuis toujours.
          </p>

          <p className="text-justify font-bold text-indigo italic">
            Comme quelqu’un lit ces paroles, je prie que les miracles majeurs qui vont fermer la bouche de vos moqueurs, vous les receviez au nom de JÉSUS ! Le miracle majeur qui amènera les hommes et les femmes à louer DIEU, recevez-le au nom de JÉSUS ! Le DIEU des nouvelles choses se manifestera d’une nouvelle manière dans votre vie, au nom de JÉSUS !
          </p>

          <p className="text-justify">
            Cet homme a reçu des injures dans sa vie, vu que tous ne lui donnaient pas de l’argent ; je prie que vos insultes se transforment en résultats positifs dans votre vie. Cet homme était assis à la porte appelée Belle mais faisait face à des luttes. Certains viennent à l’église bien vêtus mais souffrent de l’intérieur. D’autres montrent une face de bien-être mais confrontent des difficultés en secret. Certains donnent l’apparence de briller mais sont infirmes boiteux à l’intérieur. 
          </p>
          
          <p className="text-justify font-bold text-indigo">
            Je prie que le pouvoir qui a relevé cet homme vous relève et, alors que vous parcourez ce site, vous receviez votre délivrance au nom de JÉSUS. Amen.
          </p>

          <div className="pt-8 border-t border-indigo-mid/10 mt-12 flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="text-left">
              <p className="text-sm font-semibold text-gold-dark uppercase tracking-wider">Nous vous souhaitons encore la bienvenue.</p>
              <p className="text-xs text-body mt-1">Que Dieu vous bénisse abondamment.</p>
            </div>
            
            <div className="text-left md:text-right">
              <p className="font-display text-lg font-bold text-indigo italic">Pasteur David Odion Victor</p>
              <p className="text-xs text-body font-semibold">Surintendant Régional MFM Ficgayo</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
