import { cn } from "../lib/cn";

/**
 * A single-value slider with the studio look (the `.studio-range` gold thumb) —
 * a lightweight stand-in for the web's shadcn `Slider`, same `onValueChange`
 * call site so the ported docks read verbatim.
 */
export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  className,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (v: number) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onValueChange(Number(e.target.value))}
      className={cn("studio-range", className)}
    />
  );
}
