import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getMinistries } from "@/lib/api";
import { Eyebrow } from "@/components/ui/eyebrow";
import { BrandButton } from "@/components/ui/brand-button";
import { MinistryCard } from "@/components/cards/ministry-card";

const PREVIEW_COUNT = 4;

export async function MinistriesPreview() {
  const { data: ministries } = await getMinistries({ perPage: 100 });
  const preview = ministries.slice(0, PREVIEW_COUNT);
  const hasMore = ministries.length > PREVIEW_COUNT;

  return (
    <section className="py-[clamp(72px,9vw,108px)]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="mx-auto mb-[50px] max-w-[640px] text-center">
          <Eyebrow>Ministères</Eyebrow>
          <h2 className="mt-2.5 font-display text-[clamp(32px,4.4vw,52px)] leading-[1.04] font-semibold tracking-[-0.4px] text-indigo italic">
            Une famille, plusieurs maisons
          </h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
          {preview.map((m) => (
            <MinistryCard key={m.name} ministry={m} variant="preview" />
          ))}
        </div>

        {hasMore && (
          <div className="mt-12 flex justify-center">
            <BrandButton asChild variant="outline">
              <Link href="/ministeres">
                Voir tous les ministères
                <ArrowRight className="size-4" />
              </Link>
            </BrandButton>
          </div>
        )}
      </div>
    </section>
  );
}
