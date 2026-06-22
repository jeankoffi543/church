"use client";

import React, { useState } from "react";
import { X, Image as ImageIcon, ZoomIn, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Photo = {
  id: string;
  url: string;
  title: string;
  category: string;
  date: string;
  aspect: string; // for asymmetric masonry effect
};

const CATEGORIES = ["Tous", "Louange", "Culte", "Communauté", "Jeunesse", "Événements"];

const PHOTOS: Photo[] = [
  {
    id: "1",
    url: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=800&q=80&auto=format&fit=crop",
    title: "Conférence Maison de Feu 2026",
    category: "Événements",
    date: "12 Juillet 2026",
    aspect: "aspect-[4/3]"
  },
  {
    id: "2",
    url: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80&auto=format&fit=crop",
    title: "Chœur de Louange en action",
    category: "Louange",
    date: "14 Juin 2026",
    aspect: "aspect-[3/4]"
  },
  {
    id: "3",
    url: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=800&q=80&auto=format&fit=crop",
    title: "Culte du Dimanche - Prédication",
    category: "Culte",
    date: "7 Juin 2026",
    aspect: "aspect-video"
  },
  {
    id: "4",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80&auto=format&fit=crop",
    title: "Moments d'intercession",
    category: "Louange",
    date: "7 Juin 2026",
    aspect: "aspect-square"
  },
  {
    id: "5",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80&auto=format&fit=crop",
    title: "Rassemblement de la Jeunesse",
    category: "Jeunesse",
    date: "30 Mai 2026",
    aspect: "aspect-[3/4]"
  },
  {
    id: "6",
    url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80&auto=format&fit=crop",
    title: "Partage en cellule de quartier",
    category: "Communauté",
    date: "27 Mai 2026",
    aspect: "aspect-video"
  },
  {
    id: "7",
    url: "https://images.unsplash.com/photo-1461532247732-225e412ecd0f?w=800&q=80&auto=format&fit=crop",
    title: "Service des enfants - MFM Kids",
    category: "Communauté",
    date: "24 Mai 2026",
    aspect: "aspect-[4/3]"
  },
  {
    id: "8",
    url: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&q=80&auto=format&fit=crop",
    title: "Bénédiction finale",
    category: "Culte",
    date: "24 Mai 2026",
    aspect: "aspect-square"
  },
  {
    id: "9",
    url: "https://images.unsplash.com/photo-1543165796-540007779593?w=800&q=80&auto=format&fit=crop",
    title: "Baptêmes d'eau",
    category: "Événements",
    date: "17 Mai 2026",
    aspect: "aspect-[3/4]"
  }
];

export function GalleryGrid() {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const filteredPhotos = activeCategory === "Tous"
    ? PHOTOS
    : PHOTOS.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-10">
      {/* Categories Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-300 ${
              activeCategory === cat
                ? "bg-indigo text-white shadow-md shadow-indigo/10"
                : "border border-[rgba(40,25,80,0.08)] bg-white text-indigo-mid hover:bg-cream/50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Asymmetric Masonry Grid */}
      <div className="columns-1 gap-5 space-y-5 sm:columns-2 md:columns-3">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="group relative overflow-hidden rounded-[20px] border border-[rgba(40,25,80,0.06)] bg-white p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer break-inside-avoid"
          >
            <div className={`relative overflow-hidden rounded-[14px] ${photo.aspect} bg-cream`}>
              <img
                src={photo.url}
                alt={photo.title}
                className="size-full object-cover transition-all duration-700 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Premium Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-5 text-white">
                <span className="text-[10px] font-extrabold tracking-wider text-gold uppercase mb-1">
                  {photo.category}
                </span>
                <h3 className="font-display text-lg font-bold leading-tight italic">
                  {photo.title}
                </h3>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-faint border-t border-white/10 pt-2.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-gold-dark" />
                    {photo.date}
                  </span>
                  <ZoomIn className="size-4 text-gold" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPhotos.length === 0 && (
        <div className="py-20 text-center rounded-[24px] border border-dashed border-[rgba(40,25,80,0.12)] bg-white">
          <ImageIcon className="size-8 text-faint mx-auto mb-3" />
          <h3 className="font-display text-sm font-bold text-indigo">Aucune photo trouvée</h3>
          <p className="text-xs text-body mt-1">Sélectionnez une autre catégorie.</p>
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl w-[90vw] border-none bg-ink p-1 text-white shadow-2xl overflow-hidden flex flex-col items-center">
          <DialogTitle className="sr-only">
            {selectedPhoto?.title || "Visualisation Photo"}
          </DialogTitle>
          {selectedPhoto && (
            <div className="relative flex flex-col items-center w-full max-h-[85vh]">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.title}
                className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
              />
              <div className="w-full text-center px-4 py-3 mt-2 bg-ink/40">
                <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
                  {selectedPhoto.category}
                </span>
                <h3 className="font-display text-xl font-bold italic mt-0.5 text-white">
                  {selectedPhoto.title}
                </h3>
                <p className="text-xs text-faint mt-1">{selectedPhoto.date}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
