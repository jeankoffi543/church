import { cn } from "@/lib/utils";

/**
 * The uppercase, letter-spaced label that sits above section titles.
 * Gold on light surfaces by default.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-bold tracking-[0.2em] text-gold-dark uppercase",
        className
      )}
    >
      {children}
    </span>
  );
}
