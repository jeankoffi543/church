"use client";

import { AlertTriangle } from "lucide-react";

import { Button, type ButtonVariant } from "./button";
import { Modal } from "./modal";

/** Confirmation modal — replaces ad-hoc `window.confirm` and bespoke dialogs. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = "Confirmer",
  tone = "destructive",
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: Extract<ButtonVariant, "destructive" | "primary">;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <div className="px-6 py-6">
        <div className="flex items-start gap-3.5">
          <span
            className={cn_tone(tone)}
          >
            <AlertTriangle className="size-5" />
          </span>
          <p className="text-[13px] leading-relaxed text-body">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function cn_tone(tone: "destructive" | "primary"): string {
  return tone === "destructive"
    ? "flex size-11 shrink-0 items-center justify-center rounded-full bg-live/10 text-live"
    : "flex size-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark";
}
