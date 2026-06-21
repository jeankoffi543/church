"use client";

import { useState } from "react";
import { Play, Heart, Share2, BookOpen, Eye } from "lucide-react";
import { IMG } from "@/lib/data";
import { LiveDot } from "@/components/ui/live-dot";
import type { LiveConfig } from "@/lib/api";

export function LivePlayer({ 
  config, 
  onFollowBible 
}: { 
  config: LiveConfig; 
  onFollowBible: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [likes, setLikes] = useState(124);
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1);
      setLiked(false);
    } else {
      setLikes(likes + 1);
      setLiked(true);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: config.title,
        text: "Rejoignez-nous pour le direct de l’Église MFM Ficgayo !",
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Lien partagé dans le presse-papiers !");
    }
  };

  // Convert typical YouTube link to embed link if needed
  let videoEmbedUrl = config.streamUrl;
  if (videoEmbedUrl) {
    if (videoEmbedUrl.includes("watch?v=")) {
      videoEmbedUrl = videoEmbedUrl.replace("watch?v=", "embed/");
    } else if (videoEmbedUrl.includes("youtu.be/")) {
      const parts = videoEmbedUrl.split("youtu.be/");
      const id = parts[parts.length - 1].split("?")[0];
      videoEmbedUrl = `https://www.youtube.com/embed/${id}`;
    }
  }

  return (
    <div className="flex-[2_1_560px]">
      {/* Video Container */}
      <div className="relative aspect-video overflow-hidden rounded-[18px] bg-ink shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
        {config.isLive && videoEmbedUrl ? (
          <iframe
            src={`${videoEmbedUrl}${videoEmbedUrl.includes("?") ? "&" : "?"}autoplay=1`}
            title={config.title}
            className="absolute inset-0 size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-cover bg-center px-6 text-center"
            style={{
              backgroundImage: `linear-gradient(180deg,rgba(22,15,51,.2),rgba(22,15,51,.75)),url('${IMG.livePlayer}')`,
            }}
          >
            <span className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-[7px] text-xs font-extrabold tracking-wide text-white/70">
              <span className="size-2 rounded-full bg-white/40" />
              HORS DIRECT
            </span>

            <div className="max-w-[420px] animate-fade-up">
              <p className="font-display text-2xl font-semibold text-white/95 italic leading-snug">
                Le prochain culte débutera bientôt.
              </p>
              <p className="mt-2.5 text-sm text-gold font-medium tracking-wide">
                Rejoignez-nous chaque Dimanche à 9h00.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Meta + actions */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="mb-1.5 font-display text-[26px] font-semibold text-white italic">
            {config.title}
          </h2>
          <div className="text-sm text-white/60">
            {config.isLive ? "Diffusion en direct depuis le temple principal MFM Ficgayo" : "Rediffusion & cultes de la Maison"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleLike}
            className={`flex cursor-pointer items-center gap-1.5 rounded-[10px] border px-4 py-2.5 text-[13px] font-semibold transition ${
              liked 
                ? "border-gold bg-gold/20 text-gold" 
                : "border-white/15 bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            <Heart className={`size-4 ${liked ? "fill-gold" : ""}`} /> {liked ? "Aimé" : "J’aime"} ({likes})
          </button>
          <button
            onClick={handleShare}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-white/15 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-white/15"
          >
            <Share2 className="size-4" /> Partager
          </button>
          <button
            onClick={onFollowBible}
            className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-gold/30 bg-gold/15 px-4 py-2.5 text-[13px] font-semibold text-gold transition hover:bg-gold/25"
          >
            <BookOpen className="size-4" /> Suivre la Bible
          </button>
        </div>
      </div>
    </div>
  );
}
