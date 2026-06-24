import { AlertCircle, CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type Status = { type: "success" | "error"; message: string } | null;

/** Inline success/error banner — replaces the per-manager copies. */
export function StatusBanner({ status, className }: { status: Status; className?: string }) {
  if (!status) return null;
  const ok = status.type === "success";

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-xl border p-4 text-sm animate-fade-up",
        ok ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live",
        className,
      )}
    >
      {ok ? (
        <CheckCircle className="size-5 shrink-0 text-online" />
      ) : (
        <AlertCircle className="size-5 shrink-0 text-live" />
      )}
      <p className="font-semibold">{status.message}</p>
    </div>
  );
}
