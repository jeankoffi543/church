"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Images,
  ImagePlus,
  UploadCloud,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
} from "lucide-react";

import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAdminAlbum,
  uploadAlbumPhotos,
  deleteAlbumPhoto,
  type AdminAlbum,
  type AdminAlbumPhoto,
  type AdminEvent,
  type AdminListMeta,
  getAdminAlbumsPaginated,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

const MAX_PHOTOS = 50;
type Pending = { file: File; url: string };

export const GALLERY_PER_PAGE = 10;

const filterFields: FilterField[] = [
  { id: "title", label: "Titre", type: "text" },
  { id: "category", label: "Catégorie", type: "text" }
];

/** UI sort columns → QueryMaster sortable model fields (category is a relation, not sortable). */
const ALBUM_SORT_FIELD: Record<string, string | undefined> = {
  title: "title",
  photos_count: "photos_count",
  date_label: "created_at",
  category: undefined,
};

export function GalleryManager({
  initialAlbums,
  initialMeta,
  events,
}: {
  initialAlbums: AdminAlbum[];
  initialMeta: AdminListMeta;
  events: Pick<AdminEvent, "id" | "title">[];
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(GALLERY_PER_PAGE);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Sorting and Filtering states
  const [sortBy, setSortBy] = useState<"title" | "category" | "photos_count" | "date_label" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const albumSort = sortBy ? ALBUM_SORT_FIELD[sortBy] : undefined;
  const {
    items: albums,
    setItems: setAlbums,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminAlbum>({
    fetcher: getAdminAlbumsPaginated,
    params: {
      page,
      perPage,
      search,
      sort: albumSort && sortOrder ? { field: albumSort, dir: sortOrder } : null,
      filters: serializeFiltersForQueryMaster(activeFilters),
    },
    initialData: initialAlbums,
    initialMeta,
  });

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  /* ── Album form modal ─────────────────────────────────────────── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAlbum | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventId("");
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(false);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (a: AdminAlbum) => {
    setEditing(a);
    resetForm();
    setTitle(a.title);
    setDescription(a.description ?? "");
    setEventId(a.event_id ? String(a.event_id) : "");
    setCoverPreview(assetUrl(a.cover_image));
    setIsModalOpen(true);
  };

  const pickCover = (file: File | null) => {
    if (!file) return;
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!title.trim()) return;

    startTransition(async () => {
      try {
        const payload = { title, description: description || null, event_id: eventId ? Number(eventId) : null };
        if (editing) {
          const res = await updateAlbum(editing.id, payload, coverFile, removeCover);
          setAlbums((prev) => prev.map((a) => (a.id === res.data.id ? res.data : a)));
          refresh();
          setStatus({ type: "success", message: `Album « ${title} » mis à jour.` });
        } else {
          const res = await createAlbum(payload, coverFile);
          setAlbums((prev) => [res.data, ...prev]);
          refresh();
          setStatus({ type: "success", message: `Album « ${title} » créé.` });
        }
        setIsModalOpen(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Erreur lors de l’enregistrement." });
      }
    });
  };

  const handleDelete = (a: AdminAlbum) => {
    if (!confirm(`Supprimer l’album « ${a.title} » et toutes ses photos ?`)) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteAlbum(a.id);
        setAlbums((prev) => prev.filter((x) => x.id !== a.id));
        refresh();
        setStatus({ type: "success", message: `Album « ${a.title} » supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  /* ── Photo management modal ───────────────────────────────────── */
  const [photoAlbum, setPhotoAlbum] = useState<AdminAlbum | null>(null);

  const openPhotos = async (a: AdminAlbum) => {
    setPhotoAlbum({ ...a, photos: [] });
    const full = await getAdminAlbum(a.id);
    setPhotoAlbum(full);
  };

  const onPhotosChanged = (updater: (prev: AdminAlbumPhoto[]) => AdminAlbumPhoto[]) => {
    setPhotoAlbum((prev) => (prev ? { ...prev, photos: updater(prev.photos ?? []) } : prev));
    // Keep the table's photo count in sync.
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === photoAlbum?.id ? { ...a, photos_count: updater(photoAlbum?.photos ?? []).length } : a
      )
    );
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setPage(1);
  };

  const handleSort = (column: "title" | "category" | "photos_count" | "date_label") => {
    setPage(1);
    if (sortBy !== column) {
      setSortBy(column);
      setSortOrder("asc");
    } else {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else if (sortOrder === "desc") {
        setSortBy(null);
        setSortOrder(null);
      } else {
        setSortOrder("asc");
      }
    }
  };

  const renderSortChevron = (column: "title" | "category" | "photos_count" | "date_label") => {
    if (sortBy !== column) {
      return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
    }
    if (sortOrder === "asc") {
      return <ChevronUp className="size-3 text-gold-dark shrink-0" />;
    }
    if (sortOrder === "desc") {
      return <ChevronDown className="size-3 text-gold-dark shrink-0" />;
    }
    return <ChevronsUpDown className="size-3 text-faint shrink-0" />;
  };

  // The API already returns the filtered + sorted page; render it directly.
  const paged = albums;
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">Médiathèque visuelle</span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">Galerie & Albums</h1>
          <p className="mt-1 text-sm text-body">Créez des albums, importez des photos en masse et organisez le portfolio.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <Plus className="size-4" /> Nouvel album
        </button>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success" ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? <CheckCircle className="size-5 shrink-0 text-online" /> : <AlertCircle className="size-5 shrink-0 text-live" />}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      {/* Filter and search bar row (Set z-20 relative for correct stacking context) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap z-20 relative">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Main search bar */}
          <div className="flex flex-1 min-w-[220px] max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
            <Search className="size-4 text-faint" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un album…"
              className="w-full text-[14px] text-indigo outline-none placeholder:text-faint bg-transparent border-none"
            />
          </div>

          {/* Reusable Query Builder containing inline chips & sliders filter button */}
          <QueryBuilder
            fields={filterFields}
            activeFilters={activeFilters}
            onChange={(nextFilters) => {
              setActiveFilters(nextFilters);
              setPage(1);
            }}
          />
        </div>

        {activeFilters.length > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-live/15 bg-live/5 px-3.5 py-2 text-xs font-semibold text-live transition hover:bg-live/10"
          >
            <X className="size-3.5" />
            Effacer les filtres actifs
          </button>
        )}
      </div>

      {/* Table grid (z-10 relative) */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)] relative z-10">
        <div className={cn("overflow-x-auto transition-opacity", isLoading && "pointer-events-none opacity-60")}>
          <table className="w-full text-left text-sm text-indigo">
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase select-none">
              <tr>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Album</span>
                    {renderSortChevron("title")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Catégorie</span>
                    {renderSortChevron("category")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("photos_count")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Photos</span>
                    {renderSortChevron("photos_count")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("date_label")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {renderSortChevron("date_label")}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((a) => (
                <tr key={a.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-lilac">
                        {a.cover_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={assetUrl(a.cover_image) ?? ""} alt="" className="size-full object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center"><Images className="size-4 text-indigo/40" /></span>
                        )}
                      </span>
                      <span className="font-semibold">{a.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">{a.category}</span>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-faint">{a.photos_count}</td>
                  <td className="px-6 py-3 text-xs font-mono font-semibold whitespace-nowrap text-faint">{a.date_label}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openPhotos(a)} title="Gérer les photos" className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.1)] px-2.5 py-1.5 text-[12px] font-bold text-indigo transition hover:border-gold hover:bg-gold/5">
                        <Images className="size-3.5" /> Photos
                      </button>
                      <button onClick={() => openEdit(a)} title="Modifier" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5">
                        <Edit className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(a)} title="Supprimer" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-xs text-body">Aucun album.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={total}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="albums"
          />
        )}
      </div>

      {/* ── Album form modal ───────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) setIsModalOpen(false); }}>
        <DialogContent showCloseButton onOpenAutoFocus={(e) => e.preventDefault()} className="w-[95vw] md:max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 gap-0">
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h3 className="font-display text-xl font-bold text-indigo italic">{editing ? "Modifier l’album" : "Nouvel album"}</h3>
          </div>
          <form onSubmit={submit} onChange={() => setStatus((s) => (s ? null : s))} className="flex flex-col gap-4 px-6 py-6">
            <Field label="Titre *">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Conférence Maison de Feu 2026" className={INPUT} />
            </Field>
            <Field label="Événement lié (catégorie)">
              <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={INPUT}>
                <option value="">— Aucun (Autre) —</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Quelques mots sur cet album…" className={cn(INPUT, "resize-none leading-relaxed")} />
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Image de couverture</span>
              {coverPreview && !removeCover ? (
                <div className="relative h-36 w-full max-w-xs overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverPreview} alt="Couverture" className="size-full object-cover" />
                  <button type="button" onClick={() => { if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview); setCoverFile(null); setCoverPreview(null); setRemoveCover(true); }} className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white hover:bg-live">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-cream text-center transition hover:border-gold hover:bg-gold/5">
                  <ImagePlus className="size-5 text-indigo/60" />
                  <span className="text-[12px] font-bold text-indigo">Importer une couverture</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
            <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.1)] px-4 py-2.5 text-xs font-bold text-body hover:bg-cream">Annuler</button>
              <button type="submit" disabled={isPending} className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo hover:brightness-105 disabled:opacity-50">
                {isPending && <Loader2 className="size-3.5 animate-spin" />} Enregistrer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Photo management modal ─────────────────────────────────── */}
      <Dialog open={photoAlbum !== null} onOpenChange={(o) => { if (!o) setPhotoAlbum(null); }}>
        <DialogContent showCloseButton onOpenAutoFocus={(e) => e.preventDefault()} className="w-[96vw] md:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 gap-0">
          {photoAlbum && (
            <PhotoBoard
              album={photoAlbum}
              onChanged={onPhotosChanged}
              onStatus={setStatus}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Bulk drag-and-drop photo board ───────────────────────────────── */
function PhotoBoard({
  album,
  onChanged,
  onStatus,
}: {
  album: AdminAlbum;
  onChanged: (updater: (prev: AdminAlbumPhoto[]) => AdminAlbumPhoto[]) => void;
  onStatus: (s: { type: "success" | "error"; message: string }) => void;
}) {
  const photos = album.photos ?? [];
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => pending.forEach((p) => URL.revokeObjectURL(p.url)), [pending]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setPending((prev) => {
      const room = MAX_PHOTOS - prev.length;
      return [...prev, ...incoming.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    });
  };

  const removePending = (url: string) => {
    URL.revokeObjectURL(url);
    setPending((prev) => prev.filter((p) => p.url !== url));
  };

  const startFaux = () => {
    setProgress(8);
    timer.current = setInterval(() => setProgress((p) => (p === null || p >= 92 ? p : p + Math.max(1, Math.round((95 - p) / 12)))), 180);
  };
  const stopFaux = (done: boolean) => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(done ? 100 : null);
    if (done) setTimeout(() => setProgress(null), 600);
  };

  const upload = async () => {
    if (pending.length === 0 || busy) return;
    setBusy(true);
    startFaux();
    try {
      const res = await uploadAlbumPhotos(album.id, pending.map((p) => p.file));
      onChanged((prev) => [...prev, ...res.data]);
      pending.forEach((p) => URL.revokeObjectURL(p.url));
      setPending([]);
      stopFaux(true);
      onStatus({ type: "success", message: `${res.data.length} photo(s) ajoutée(s).` });
    } catch (err) {
      stopFaux(false);
      onStatus({ type: "error", message: (err as Error).message || "Échec du téléversement." });
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async (photo: AdminAlbumPhoto) => {
    try {
      await deleteAlbumPhoto(photo.id);
      onChanged((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (err) {
      onStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
    }
  };

  return (
    <>
      <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
        <h3 className="font-display text-xl font-bold text-indigo italic">Photos · {album.title}</h3>
        <p className="mt-0.5 text-xs text-body">{photos.length} photo(s) · jusqu’à {MAX_PHOTOS} ajouts simultanés</p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
            dragOver ? "border-gold bg-gold/5" : "border-[rgba(40,25,80,0.2)] bg-cream hover:border-gold/60"
          )}
        >
          <UploadCloud className="size-7 text-indigo/60" />
          <span className="text-[14px] font-bold text-indigo">Glissez-déposez vos images ici</span>
          <span className="text-[11px] text-faint">ou cliquez pour parcourir · JPG, PNG, WEBP</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        </label>

        {/* Pending previews */}
        {pending.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-indigo">{pending.length} à téléverser</span>
              <button onClick={() => { pending.forEach((p) => URL.revokeObjectURL(p.url)); setPending([]); }} className="cursor-pointer text-[12px] font-bold text-faint hover:text-live">Tout retirer</button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {pending.map((p) => (
                <div key={p.url} className="group relative aspect-square overflow-hidden rounded-lg border border-[rgba(40,25,80,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button onClick={() => removePending(p.url)} className="absolute top-1 right-1 flex size-5 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition group-hover:opacity-100 hover:bg-live">
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
            {progress !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(40,25,80,0.1)]">
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
            )}
            <button onClick={upload} disabled={busy} className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-sm font-bold text-indigo hover:brightness-105 disabled:opacity-50">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
              Téléverser {pending.length} photo(s)
            </button>
          </div>
        )}

        {/* Existing photos */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-[rgba(40,25,80,0.12)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(photo.image_path) ?? ""} alt="" loading="lazy" className="size-full object-cover" />
              <button onClick={() => removePhoto(photo)} className="absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white opacity-0 transition group-hover:opacity-100 hover:bg-live">
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
          {photos.length === 0 && pending.length === 0 && (
            <p className="col-span-full py-6 text-center text-xs text-faint italic">Aucune photo pour l’instant.</p>
          )}
        </div>
      </div>
    </>
  );
}

const INPUT = "rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold w-full";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">{label}</span>
      {children}
    </label>
  );
}
