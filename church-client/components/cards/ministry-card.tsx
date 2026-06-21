import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Ministry } from "@/lib/data";

const CARD =
  "rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-[26px] shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(22,15,51,0.13)]";

/**
 * Ministry card. `preview` (home) stacks a soft-lilac icon tile above the text;
 * `full` (L'Église) puts a deep-navy icon tile inline and adds a join footer.
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
      <article className={CARD}>
        <div className="mb-4 flex items-center gap-3.5">
          <div className="flex size-[50px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-mid to-ink">
            <span className="font-display text-[23px] font-bold text-gold italic">
              {ministry.initial}
            </span>
          </div>
          <h3 className="text-[17px] leading-tight font-bold text-indigo">
            {ministry.name}
          </h3>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-body">{ministry.desc}</p>
        <div className="flex items-center justify-between border-t border-[rgba(40,25,80,0.07)] pt-3.5">
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
      </article>
    );
  }

  return (
    <article className={cn(CARD, "group")}>
      <div className="mb-[18px] flex size-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-lilac-200 to-lilac-300">
        <span className="font-display text-[23px] font-bold text-indigo-mid italic">
          {ministry.initial}
        </span>
      </div>
      <h3 className="mb-2 text-[17px] font-bold text-indigo">{ministry.name}</h3>
      <p className="mb-3.5 text-sm leading-relaxed text-body">{ministry.desc}</p>
      <span className="text-xs font-semibold text-gold-dark">
        {ministry.schedule}
      </span>
    </article>
  );
}

