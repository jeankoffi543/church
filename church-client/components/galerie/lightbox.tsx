"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GalleryPhoto } from "@/lib/api";

/**
 * Immersive full-screen photo theatre. Built on the Radix Dialog primitive (not
 * the centered shadcn wrapper) so the content can truly fill the viewport with
 * no background scroll. Fluid transitions, HD zoom, keyboard nav and download.
 */
export function Lightbox({
  open,
  onOpenChange,
  photos,
  index,
  onIndex,
  title,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: GalleryPhoto[];
  index: number;
  onIndex: (next: number) => void;
  title: string;
  loading?: boolean;
}) {
  const [zoom, setZoom] = useState(false);
  const photo = photos[index] ?? null;
  const count = photos.length;

  const go = useCallback(
    (dir: number) => {
      if (count === 0) return;
      onIndex((index + dir + count) % count);
      setZoom(false);
    },
    [count, index, onIndex]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col p-0 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          {/* Top bar */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <span className="truncate text-sm font-semibold text-white/85">
              {title}
              {count > 0 && <span className="ml-2 text-white/45">{index + 1} / {count}</span>}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                aria-label={zoom ? "Dézoomer" : "Zoomer"}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
              </button>
              {photo && (
                <a
                  href={photo.src}
                  download
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Télécharger l'image"
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  <Download className="size-5" />
                </a>
              )}
              <DialogPrimitive.Close
                aria-label="Fermer"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Stage */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-8">
            {loading ? (
              <Loader2 className="size-8 animate-spin text-white/60" />
            ) : photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo.id}
                src={photo.src}
                alt={title}
                onClick={() => setZoom((z) => !z)}
                className={cn(
                  "max-h-full max-w-full origin-center rounded-lg object-contain shadow-2xl transition-transform duration-300 ease-out select-none animate-in fade-in zoom-in-95",
                  zoom ? "scale-[1.6] cursor-zoom-out" : "cursor-zoom-in"
                )}
              />
            ) : (
              <p className="text-sm text-white/50">Aucune image.</p>
            )}

            {count > 1 && !loading && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Image précédente"
                  className="absolute left-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:left-6"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Image suivante"
                  className="absolute right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:right-6"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
