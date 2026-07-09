import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";

/** A small confirm modal (studio chrome) replacing window.confirm for deletes. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Supprimer",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <button type="button" aria-label="Annuler" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <div className="animate-modal-in relative w-[380px] max-w-full rounded-2xl border border-white/10 bg-studio-panel p-5 shadow-[0_40px_90px_rgba(0,0,0,.6)]">
        <div className="mb-2 flex items-center gap-2">
          <TriangleAlert className="size-4 text-studio-onair" />
          <h3 className="text-[14px] font-extrabold text-white">{title}</h3>
        </div>
        <p className="mb-4 text-[12px] leading-relaxed text-white/60">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/12 bg-white/4 px-3.5 py-2 text-[12px] font-bold text-white/70 transition hover:text-white"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-studio-onair/40 bg-studio-onair/15 px-3.5 py-2 text-[12px] font-extrabold text-[#ff9a9a] transition hover:bg-studio-onair/25"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
