"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";

export function PastorPortrait({ photoUrl, name }: { photoUrl: string; name: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const isLocal = photoUrl.includes("127.0.0.1") || photoUrl.includes("localhost");

  return (
    <>
      {/* Visual Frame */}
      <div
        onClick={() => setIsOpen(true)}
        className="relative w-full max-w-[340px] aspect-[3/4] mx-auto cursor-zoom-in group"
      >
        {/* Asymmetric offset Background (Gold) */}
        <div className="absolute inset-0 bg-[#e2b85f] rounded-2xl translate-x-4 translate-y-4 shadow-md transition-transform duration-300 group-hover:translate-x-5 group-hover:translate-y-5" />

        {/* Image Container */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[rgba(40,25,80,0.1)] shadow-xl bg-indigo-mid/5 transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1">
          <Image
            src={photoUrl}
            alt={name}
            fill
            sizes="(max-w-768px) 100vw, 340px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            priority
            unoptimized={isLocal}
          />
          {/* Zoom Overlay on Hover */}
          <div className="absolute inset-0 bg-indigo/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="bg-white/95 text-indigo p-3 rounded-full shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-all duration-300">
              <ZoomIn className="size-5 text-gold-dark" />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
        >
          {/* Close button */}
          <div className="absolute top-6 right-6 text-white/70 hover:text-white transition duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              aria-label="Fermer"
            >
              <X className="size-5 text-white" />
            </button>
          </div>

          {/* Portrait Image container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[450px] aspect-[3/4] max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-indigo-mid/10 animate-scale-in"
          >
            <Image
              src={photoUrl}
              alt={name}
              fill
              sizes="(max-w-768px) 100vw, 450px"
              className="object-cover"
              unoptimized={isLocal}
            />
          </div>
        </div>
      )}
    </>
  );
}
