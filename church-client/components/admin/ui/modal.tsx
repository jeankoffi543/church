"use client";

import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "md:max-w-md",
  md: "md:max-w-2xl",
  lg: "md:max-w-4xl",
  xl: "md:max-w-6xl",
} as const;

/**
 * Standard admin modal. Wraps the Radix dialog with the guarantees that were
 * applied inconsistently before:
 *  • `onOpenAutoFocus` prevented → no focus jump / page scroll on open
 *  • children mounted only while open → clean state reset on every open
 *  • normalised widths + scrollable body + branded title bar
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cn(
          "max-h-[88vh] w-[95vw] gap-0 overflow-y-auto rounded-2xl border-0 bg-white p-0",
          SIZES[size],
          className,
        )}
      >
        <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
          <DialogTitle className="font-display text-xl font-bold text-indigo italic">{title}</DialogTitle>
          {description && <p className="mt-0.5 text-[13px] text-body">{description}</p>}
        </div>
        {open && children}
      </DialogContent>
    </Dialog>
  );
}
