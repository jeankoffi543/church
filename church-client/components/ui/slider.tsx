"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Thin, controlled range slider. Styled by the global `.studio-range` rules
 * (gold thumb on a faint track) but theme-neutral and reusable elsewhere via
 * `className`. Use `onValueChange` for a number, or standard `onChange`.
 */
function Slider({
  className,
  onValueChange,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  onValueChange?: (value: number) => void;
}) {
  return (
    <input
      type="range"
      data-slot="slider"
      className={cn("studio-range", className)}
      onChange={(e) => {
        onValueChange?.(Number(e.target.value));
        onChange?.(e);
      }}
      {...props}
    />
  );
}

export { Slider };
