import { Eyebrow } from "@/components/ui/eyebrow";

/** Eyebrow + serif title + intro used at the top of the inner pages. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mb-10 max-w-[640px]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2.5 mb-3 font-display text-[clamp(36px,5vw,58px)] leading-[1.02] font-semibold text-indigo italic">
        {title}
      </h1>
      {intro && <p className="text-base leading-relaxed text-body">{intro}</p>}
    </div>
  );
}
