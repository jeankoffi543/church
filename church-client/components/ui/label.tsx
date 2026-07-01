import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Field label. The default styling is the recurring broadcast micro-caption
 * (tiny, bold, uppercase, tracked, dimmed) used across the studio inspector and
 * settings; override entirely via `className` for other contexts.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-[9.5px] font-extrabold tracking-wide text-white/45 uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
