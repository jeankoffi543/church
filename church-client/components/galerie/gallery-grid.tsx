"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Images, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { getAlbum, type GalleryAlbum, type GalleryPhoto } from "@/lib/api";
import { Lightbox } from "@/components/galerie/lightbox";

const PAGE_SIZE = 9;
const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

type LightboxState = {
  open: boolean;
  title: string;
  photos: GalleryPhoto[];
  index: number;
  loading: boolean;
};

const CLOSED: LightboxState = { open: false, title: "", photos: [], index: 0, loading: false };

export function GalleryGrid({
  albums,
  initialMeta,
}: {
  albums: GalleryAlbum[];
  initialMeta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    years?: string[];
    categories?: string[];
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [box, setBox] = useState<LightboxState>(CLOSED);

  const year = searchParams.get("year");
  const category = searchParams.get("category");
  const currentPage = initialMeta?.current_page ?? 1;
  const pageCount = initialMeta?.last_page ?? 1;

  const years = useMemo(
    () => initialMeta?.years ?? uniq(albums.map((a) => a.year)).sort((a, b) => b.localeCompare(a)),
    [albums, initialMeta?.years]
  );
  const categories = useMemo(
    () => initialMeta?.categories ?? uniq(albums.map((a) => a.category)).sort(),
    [albums, initialMeta?.categories]
  );

  const filtered = albums;
  const paged = albums;

  const openAlbum = async (album: GalleryAlbum) => {
    setBox({ open: true, title: album.title, photos: album.photos, index: 0, loading: true });
    // The list endpoint omits photos; fetch the album detail on demand.
    const full = await getAlbum(album.slug);
    setBox((b) => ({ ...b, photos: full?.photos ?? [], loading: false }));
  };

  const handlePick = (key: "year" | "category", value: string, current: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (current === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      {/* Filters */}
      {(years.length > 1 || categories.length > 1) && (
        <div className="mb-8 flex flex-col gap-3">
          {categories.length > 1 && (
            <FilterRow label="Catégorie" options={categories} active={category} onPick={(v) => handlePick("category", v, category)} />
          )}
          {years.length > 1 && (
            <FilterRow label="Année" options={years} active={year} onPick={(v) => handlePick("year", v, year)} />
          )}
        </div>
      )}

      <p className="mb-5 text-[13px] font-semibold text-faint">{filtered.length} album(s)</p>

      {/* Asymmetric Masonry */}
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
        {paged.map((album) => (
          <button
            key={album.id}
            type="button"
            onClick={() => openAlbum(album)}
            className="group mb-6 block w-full cursor-pointer break-inside-avoid overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.07)] bg-white text-left shadow-[0_1px_3px_rgba(22,15,51,0.05)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(22,15,51,0.13)]"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-mid to-ink">
              {album.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={album.cover}
                  alt={album.title}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <Images className="size-10 text-white/40" />
                </div>
              )}
              <span className="absolute top-3 left-3 rounded-md bg-ink/55 px-2.5 py-1 text-[10px] font-bold tracking-wide text-gold uppercase backdrop-blur-sm">
                {album.category}
              </span>
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-md bg-ink/55 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                <Images className="size-3" /> {album.photosCount}
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-[20px] leading-tight font-semibold text-indigo italic">{album.title}</h3>
              <p className="mt-1 text-[12.5px] font-semibold text-faint">{album.dateLabel || album.year}</p>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-body-strong">Aucun album</p>
          <p className="mt-1 text-xs text-body">Ajustez vos filtres pour découvrir d’autres souvenirs.</p>
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          <Pager onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Précédent">
            <ChevronLeft className="size-4" />
          </Pager>
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "flex size-10 cursor-pointer items-center justify-center rounded-xl text-sm font-bold transition",
                p === currentPage
                  ? "bg-gradient-to-br from-gold to-gold-dark text-indigo shadow-[0_8px_20px_rgba(200,144,46,0.25)]"
                  : "border border-[rgba(40,25,80,0.12)] bg-white text-indigo hover:border-gold hover:text-gold-dark"
              )}
            >
              {p}
            </button>
          ))}
          <Pager onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pageCount} aria-label="Suivant">
            <ChevronRight className="size-4" />
          </Pager>
        </div>
      )}

      <Lightbox
        open={box.open}
        onOpenChange={(o) => setBox((b) => ({ ...b, open: o }))}
        photos={box.photos}
        index={box.index}
        onIndex={(i) => setBox((b) => ({ ...b, index: i }))}
        title={box.title}
        loading={box.loading}
      />
    </>
  );
}

function FilterRow({
  label,
  options,
  active,
  onPick,
}: {
  label: string;
  options: string[];
  active: string | null;
  onPick: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-bold tracking-wider text-faint uppercase">{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onPick(opt)}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition",
            active === opt
              ? "border-gold bg-gold/10 text-gold-dark"
              : "border-[rgba(40,25,80,0.12)] bg-white text-indigo hover:border-gold/60"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Pager({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex size-10 cursor-pointer items-center justify-center rounded-xl border border-[rgba(40,25,80,0.12)] bg-white text-indigo transition hover:border-gold hover:text-gold-dark disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}
