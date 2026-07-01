import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Scrollable region with the slim broadcast scrollbar (`.studio-scroll`).
 * Defaults to vertical scrolling; compose flex/min-h-0 at the call site for
 * panels that must shrink inside a flex column.
 */
function ScrollArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("studio-scroll overflow-y-auto", className)}
      {...props}
    />
  );
}

export { ScrollArea };
