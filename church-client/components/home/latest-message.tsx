import Link from "next/link";
import { BookOpen } from "lucide-react";

import { IMG } from "@/lib/data";
import { getLatestSermon } from "@/lib/api";
import { BrandButton } from "@/components/ui/brand-button";
import { SermonPlayOverlay, SermonListenButton } from "@/components/home/sermon-cta";
import { SermonDescription } from "@/components/media/sermon-reader";

export async function LatestMessage() {
  const featured = await getLatestSermon();
  const cover = featured.background ?? IMG.latestMessage;
  const info = {
    id: featured.id,
    title: featured.title,
    speaker: featured.speaker,
    isAudio: featured.isAudio,
    mediaSrc: featured.mediaSrc,
    mediaType: featured.mediaType,
    background: featured.background,
    serie: featured.serie,
    date: featured.date,
    duration: featured.duration,
    description: featured.desc,
    scriptures: featured.scriptures,
  };

  return (
    <section className="pb-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-wrap overflow-hidden rounded-[26px] border border-[rgba(40,25,80,0.06)] bg-white shadow-[0_24px_70px_rgba(22,15,51,0.1)]">
          {/* Media — adaptive background (custom cover or default fallback) */}
          <div
            className="relative flex min-h-[320px] flex-[1_1_380px] items-center justify-center bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(140deg,rgba(58,42,110,.35),rgba(22,15,51,.7)),url('${cover}')`,
            }}
          >
            <span className="absolute top-[18px] left-[18px] rounded-[7px] bg-live/95 px-[11px] py-1.5 text-[11px] font-extrabold tracking-wide text-white">
              DERNIER MESSAGE
            </span>
            <SermonPlayOverlay sermon={info} />
          </div>

          {/* Content */}
          <div className="flex flex-[1_1_380px] flex-col justify-center p-[clamp(28px,4vw,52px)]">
            <span className="mb-3 text-xs font-bold tracking-[0.12em] text-gold-dark uppercase">
              {featured.serie}
            </span>
            <h3 className="mb-3.5 font-display text-[clamp(28px,3.4vw,42px)] leading-tight font-semibold text-indigo italic">
              {featured.title}
            </h3>
            <SermonDescription
              className="mb-[18px] max-w-[440px]"
              sermon={{
                id: featured.id,
                title: featured.title,
                speaker: featured.speaker,
                serie: featured.serie,
                date: featured.date,
                duration: featured.duration,
                description: featured.desc,
                mediaType: featured.mediaType,
                mediaSrc: featured.mediaSrc,
                background: featured.background,
                scriptures: featured.scriptures,
              }}
            />

            {/* Scripture badges */}
            {featured.scriptures.length > 0 && (
              <div className="mb-[22px] flex flex-wrap gap-2">
                {featured.scriptures.map((ref) => (
                  <span
                    key={ref}
                    className="inline-flex items-center gap-1 rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-[11.5px] font-bold text-gold-dark"
                  >
                    <BookOpen className="size-3" />
                    {ref}
                  </span>
                ))}
              </div>
            )}

            <div className="mb-[26px] flex items-center gap-3.5 text-[13px] font-semibold text-faint">
              <span>{featured.speaker}</span>
              <Dot />
              <span>{featured.date}</span>
              <Dot />
              <span>{featured.duration}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <SermonListenButton sermon={info} />
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
