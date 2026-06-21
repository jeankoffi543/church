import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import type { Ministry } from "@/lib/data";

const CARD =
  "overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(22,15,51,0.13)]";

/**
 * Cover media for a ministry: the uploaded image, or an elegant gradient
 * placeholder bearing the ministry initial when no image is set.
 */
function MinistryMedia({
  ministry,
  className,
}: {
  ministry: Ministry;
  className?: string;
}) {
  const src = assetUrl(ministry.image);

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={ministry.name}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-indigo-mid to-ink">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(226,184,95,0.20),transparent_60%)]" />
          <span className="relative font-display text-[44px] font-bold italic text-gold drop-shadow-sm">
            {ministry.initial}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Ministry card. `preview` (home) and `full` (L'Église / Ministères) both lead
 * with a cover image; `full` adds a join footer.
 */
export function MinistryCard({
  ministry,
  variant = "preview",
  onJoin,
}: {
  ministry: Ministry;
  variant?: "preview" | "full";
  onJoin?: (ministry: Ministry) => void;
}) {
  if (variant === "full") {
    return (
      <article className={cn(CARD, "group flex flex-col")}>
        <MinistryMedia ministry={ministry} className="h-44" />
        <div className="flex flex-1 flex-col p-[26px]">
          <h3 className="mb-2 text-[17px] leading-tight font-bold text-indigo">
            {ministry.name}
          </h3>
          <p className="mb-4 text-sm leading-relaxed text-body">{ministry.desc}</p>
          <div className="mt-auto flex items-center justify-between border-t border-[rgba(40,25,80,0.07)] pt-3.5">
            <span className="text-[12.5px] font-semibold text-gold-dark">
              {ministry.schedule}
            </span>
            <button
              onClick={() => onJoin?.(ministry)}
              className="flex cursor-pointer items-center gap-1 text-[13px] font-bold text-indigo-mid transition-all duration-200 hover:text-gold hover:scale-105 active:scale-95 outline-none border-none bg-transparent p-0"
              aria-label={`Rejoindre le ministère ${ministry.name}`}
            >
              Rejoindre <ArrowRight className="size-3.5 transition-transform" />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn(CARD, "group")}>
      <MinistryMedia ministry={ministry} className="h-32" />
      <div className="p-[22px]">
        <h3 className="mb-2 text-[17px] font-bold text-indigo">{ministry.name}</h3>
        <p className="mb-3.5 text-sm leading-relaxed text-body">{ministry.desc}</p>
        <span className="text-xs font-semibold text-gold-dark">
          {ministry.schedule}
        </span>
      </div>
    </article>
  );
}
