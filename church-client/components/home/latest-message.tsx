import Link from "next/link";
import { IMG } from "@/lib/data";
import { getLatestSermon } from "@/lib/api";
import { BrandButton } from "@/components/ui/brand-button";
import { LatestMessagePlayButton } from "./latest-message-play-button";


export async function LatestMessage() {
  const featured = await getLatestSermon();
  return (
    <section className="pb-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-wrap overflow-hidden rounded-[26px] border border-[rgba(40,25,80,0.06)] bg-white shadow-[0_24px_70px_rgba(22,15,51,0.1)]">
          {/* Media */}
          <div
            className="relative flex min-h-[320px] flex-[1_1_380px] items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(140deg,rgba(58,42,110,.35),rgba(22,15,51,.7)),url('${IMG.latestMessage}')`,
            }}
          >
            <span className="absolute top-[18px] left-[18px] rounded-[7px] bg-live/95 px-[11px] py-1.5 text-[11px] font-extrabold tracking-wide text-white">
              DERNIER MESSAGE
            </span>
            <LatestMessagePlayButton
              title={featured.title}
              speaker={featured.speaker}
              videoUrl={(featured as any).videoUrl}
              audioUrl={(featured as any).audioUrl}
            />
          </div>

          {/* Content */}
          <div className="flex flex-[1_1_380px] flex-col justify-center p-[clamp(28px,4vw,52px)]">
            <span className="mb-3 text-xs font-bold tracking-[0.12em] text-gold-dark uppercase">
              {featured.serie}
            </span>
            <h3 className="mb-3.5 font-display text-[clamp(28px,3.4vw,42px)] leading-tight font-semibold text-indigo italic">
              {featured.title}
            </h3>
            <p className="mb-[22px] max-w-[440px] text-[15px] leading-relaxed text-body">
              {featured.desc}
            </p>
            <div className="mb-[26px] flex items-center gap-3.5 text-[13px] font-semibold text-faint">
              <span>{featured.speaker}</span>
              <Dot />
              <span>{featured.date}</span>
              <Dot />
              <span>{featured.duration}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <BrandButton asChild variant="dark" size="sm" className="px-6">
                <Link href="/mediatheque">Écouter le message</Link>
              </BrandButton>
              <BrandButton asChild variant="outline" size="sm" className="px-6">
                <Link href="/mediatheque">Voir la médiathèque</Link>
              </BrandButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="size-1 rounded-full bg-[#c8b9d0]" />;
}
