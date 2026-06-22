"use client";

import React, { useMemo } from "react";
import { Play, Calendar, Clock, User, ChevronRight, Tv } from "lucide-react";
import { type Sermon } from "@/lib/data";
import { usePlayback } from "@/components/layout/playback-context";
import { BrandButton } from "@/components/ui/brand-button";

export function LivesArchivesView({ sermons }: { sermons: Sermon[] }) {
  const { playVideo } = usePlayback();

  // Find the latest sermon that has a video URL (or fallback to the first one)
  const videoSermons = useMemo(() => {
    return sermons.filter((s) => s.videoUrl);
  }, [sermons]);

  // If no sermons have videoUrl in the backend data, use all sermons and supply a fallback video
  const displaySermons = videoSermons.length > 0 ? videoSermons : sermons.map(s => ({
    ...s,
    // Add a high-quality church/nature video background fallback for testing if no URL
    videoUrl: s.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"
  }));

  const featuredSermon = displaySermons[0];

  // Group sermons by series for rows
  const groupedBySeries = useMemo(() => {
    const groups: Record<string, typeof displaySermons> = {};
    displaySermons.forEach((s) => {
      const serie = s.serie || "Messages généraux";
      if (!groups[serie]) {
        groups[serie] = [];
      }
      groups[serie].push(s);
    });
    return groups;
  }, [displaySermons]);

  const handlePlayFeatured = () => {
    if (featuredSermon && featuredSermon.videoUrl) {
      playVideo({ title: featuredSermon.title, url: featuredSermon.videoUrl });
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white pb-24">
      {/* 1. Cinematic Hero Banner */}
      {featuredSermon && (
        <section 
          className="relative flex min-h-[70vh] flex-col justify-end bg-cover bg-center px-6 pb-12 pt-36 md:px-12"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(22, 15, 51, 1) 0%, rgba(22, 15, 51, 0.4) 50%, rgba(22, 15, 51, 0.15) 100%), url('https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=1600&q=80&auto=format&fit=crop')`
          }}
        >
          <div className="absolute top-6 left-6 z-10 flex items-center gap-2 rounded-lg bg-live px-3.5 py-1.5 text-xs font-extrabold tracking-wide uppercase text-white shadow-lg md:left-12">
            <Tv className="size-3.5" />
            Archive Cinématographique
          </div>

          <div className="relative mx-auto w-full max-w-[1200px] animate-fade-up">
            <div className="max-w-2xl">
              <span className="text-xs font-bold tracking-widest text-gold uppercase">
                {featuredSermon.serie}
              </span>
              <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl italic">
                {featuredSermon.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-faint max-w-xl">
                {featuredSermon.description || "Un message puissant et inspiré apporté par le corps pastoral de notre église. Laissez-vous transformer par la Parole de Dieu et sa vérité éternelle."}
              </p>

              {/* Meta stats */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-faint">
                <span className="flex items-center gap-1.5">
                  <User className="size-4 text-gold-dark" />
                  {featuredSermon.speaker}
                </span>
                <span className="size-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-4 text-gold-dark" />
                  {featuredSermon.date}
                </span>
                <span className="size-1 rounded-full bg-white/20" />
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-gold-dark" />
                  {featuredSermon.duration}
                </span>
              </div>

              {/* Controls */}
              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={handlePlayFeatured}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-gradient-to-r from-gold to-gold-dark px-7 py-4 text-sm font-extrabold text-ink transition duration-200 hover:scale-105 shadow-lg shadow-gold/25"
                >
                  <Play className="size-4 fill-ink text-ink" />
                  Visionner le live
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Categorized VOD Catalog Rows */}
      <section className="mx-auto mt-12 max-w-[1200px] px-6 md:px-12 space-y-12">
        {/* Latest uploads row */}
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold italic tracking-wide text-white">
              Dernières Rediffusions
            </h2>
            <span className="text-[11px] font-bold text-gold uppercase tracking-wider flex items-center gap-1">
              Tout voir <ChevronRight className="size-3" />
            </span>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {displaySermons.map((s, index) => (
              <div
                key={s.title + index}
                onClick={() => s.videoUrl && playVideo({ title: s.title, url: s.videoUrl })}
                className="group relative flex-[0_0_280px] cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-ink-light transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] md:flex-[0_0_320px]"
              >
                {/* Thumbnail image representation */}
                <div 
                  className="relative aspect-video w-full bg-cover bg-center flex items-center justify-center bg-indigo-mid/40"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(22,15,51,0.8), transparent), url('https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&q=80&auto=format&fit=crop')`
                  }}
                >
                  <button 
                    className="flex size-11 items-center justify-center rounded-full border border-white/40 bg-black/45 backdrop-blur-xs opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100"
                    aria-label="Lire la vidéo"
                  >
                    <Play className="ml-0.5 size-4 fill-white text-white" />
                  </button>
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {s.duration}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4">
                  <span className="text-[10px] font-extrabold tracking-wider text-gold uppercase">
                    {s.serie}
                  </span>
                  <h3 className="mt-1 line-clamp-1 font-display text-[17px] font-bold leading-tight text-white group-hover:text-gold transition">
                    {s.title}
                  </h3>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-faint">
                    <span>{s.speaker}</span>
                    <span>{s.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Series Rows */}
        {Object.entries(groupedBySeries).map(([seriesName, seriesSermons]) => (
          <div key={seriesName}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold italic tracking-wide text-white">
                Série : {seriesName}
              </h2>
              <span className="text-[11px] font-bold text-gold uppercase tracking-wider flex items-center gap-1">
                Explorer la série <ChevronRight className="size-3" />
              </span>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {seriesSermons.map((s, index) => (
                <div
                  key={s.title + "-series-" + index}
                  onClick={() => s.videoUrl && playVideo({ title: s.title, url: s.videoUrl })}
                  className="group relative flex-[0_0_280px] cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-ink-light transition-all duration-300 hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] md:flex-[0_0_320px]"
                >
                  <div 
                    className="relative aspect-video w-full bg-cover bg-center flex items-center justify-center bg-indigo-mid/40"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(22,15,51,0.8), transparent), url('https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=600&q=80&auto=format&fit=crop')`
                    }}
                  >
                    <button 
                      className="flex size-11 items-center justify-center rounded-full border border-white/40 bg-black/45 backdrop-blur-xs opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100"
                      aria-label="Lire la vidéo"
                    >
                      <Play className="ml-0.5 size-4 fill-white text-white" />
                    </button>
                    <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {s.duration}
                    </span>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-1 font-display text-[17px] font-bold leading-tight text-white group-hover:text-gold transition">
                      {s.title}
                    </h3>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-faint">
                      <span>{s.speaker}</span>
                      <span>{s.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
