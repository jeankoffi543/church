"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Thin, controlled range slider. Styled by the global `.studio-range` rules
 * (gold thumb on a faint track) but theme-neutral and reusable elsewhere via
 * `className`. Use `onValueChange` for a number, or standard `onChange`.
 */
const Slider = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentPropsWithoutRef<"input">, "type"> & {
    onValueChange?: (value: number) => void;
  }
>(({ className, onValueChange, onChange, ...props }, ref) => {
  return (
    <input
      ref={ref}
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
});
Slider.displayName = "Slider";

export { Slider };
