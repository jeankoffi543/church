import { cn } from "@/lib/utils";

/** Small blinking dot used in every "EN DIRECT" badge. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-2 animate-live-blink rounded-full bg-current",
        className
      )}
    />
  );
}
