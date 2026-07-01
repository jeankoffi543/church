"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Native <select> wrapped with a chevron affordance. Theme-neutral: callers
 * pass the surface styling via `className`. Controlled like any select
 * (`value` + `onChange`), or use `onValueChange` for the string value.
 */
function Select({
  className,
  children,
  onValueChange,
  onChange,
  ...props
}: React.ComponentProps<"select"> & {
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "w-full cursor-pointer appearance-none rounded-lg pr-8 outline-none",
          className,
        )}
        onChange={(e) => {
          onValueChange?.(e.target.value);
          onChange?.(e);
        }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-white/40" />
    </div>
  );
}

export { Select };
