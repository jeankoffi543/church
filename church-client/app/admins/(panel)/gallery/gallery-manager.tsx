"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Edit, Trash2, Loader2, Images, ImagePlus, UploadCloud, X } from "lucide-react";

import {
  createAlbum,
  updateAlbum,
  deleteAlbum,
  getAdminAlbum,
  uploadAlbumPhotos,
  deleteAlbumPhoto,
  getAdminAlbumsPaginated,
  type AdminAlbum,
  type AdminAlbumPhoto,
  type AdminEvent,
  type AdminListMeta,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

const MAX_PHOTOS = 50;
type Pending = { file: File; url: string };

export const GALLERY_PER_PAGE = 10;

/** UI column id → QueryMaster sortable field (category lives on the event relation). */
const ALBUM_SORT_FIELD: Record<string, string | undefined> = {
  title: "title",
  photos_count: "photos_count",
  date_label: "created_at",
  category: undefined,
};

const filterFields: FilterField[] = [
  { id: "title", label: "Titre", type: "text" },
  { id: "category", label: "Catégorie", type: "text" },
];

export function GalleryManager({
  initialAlbums,
  initialMeta,
  events,
}: {
  initialAlbums: AdminAlbum[];
  initialMeta: AdminListMeta;
  events: Pick<AdminEvent, "id" | "title">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  /* ── Album form modal ─────────────────────────────────────────── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAlbum | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAlbum | null>(null);
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
          table.refresh();
          setStatus({ type: "success", message: `Album « ${title} » mis à jour.` });
        } else {
          const res = await createAlbum(payload, coverFile);
          setAlbums((prev) => [res.data, ...prev]);
          table.refresh();
          setStatus({ type: "success", message: `Album « ${title} » créé.` });
        }
        setIsModalOpen(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Erreur lors de l’enregistrement." });
      }
    });
  };

  const confirmDelete = () => {
    const a = deleteTarget;
    if (!a) return;
    setDeleteTarget(null);
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteAlbum(a.id);
        setAlbums((prev) => prev.filter((x) => x.id !== a.id));
        table.refresh();
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
    setAlbums((prev) =>
      prev.map((a) => (a.id === photoAlbum?.id ? { ...a, photos_count: updater(photoAlbum?.photos ?? []).length } : a)),
    );
  };

  const columns: Column<AdminAlbum>[] = [
    {
      id: "title",
      header: "Album",
      sortable: true,
      sortValue: (a) => a.title,
      cell: (a) => (
        <div className="flex items-center gap-3">
          <span className="size-11 shrink-0 overflow-hidden rounded-lg bg-lilac">
            {a.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={assetUrl(a.cover_image) ?? ""} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Images className="size-4 text-indigo/40" />
              </span>
            )}
          </span>
          <span className="font-semibold">{a.title}</span>
        </div>
      ),
    },
    {
      id: "category",
      header: "Catégorie",
      sortable: true,
      sortValue: (a) => a.category,
      cell: (a) => <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">{a.category}</span>,
    },
    {
      id: "photos_count",
      header: "Photos",
      sortable: true,
      sortValue: (a) => a.photos_count,
      className: "font-mono text-xs font-semibold text-faint",
      cell: (a) => a.photos_count,
    },
    {
      id: "date_label",
      header: "Date",
      sortable: true,
      sortValue: (a) => a.date_label ?? "",
      className: "font-mono text-xs font-semibold whitespace-nowrap text-faint",
      cell: (a) => a.date_label,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (a) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openPhotos(a)}
            title="Gérer les photos"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.1)] px-2.5 py-1.5 text-[12px] font-bold text-indigo transition hover:border-gold hover:bg-gold/5"
          >
            <Images className="size-3.5" /> Photos
          </button>
          <button onClick={() => openEdit(a)} title="Modifier" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5">
            <Edit className="size-3.5" />
          </button>
          <button onClick={() => setDeleteTarget(a)} title="Supprimer" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const table = useServerDataTable<AdminAlbum>({
    fetcher: getAdminAlbumsPaginated,
    initialData: initialAlbums,
    initialMeta,
    initialPerPage: GALLERY_PER_PAGE,
    sortFieldMap: ALBUM_SORT_FIELD,
  });
  const setAlbums = table.setItems;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Médiathèque visuelle"
        title="Galerie & Albums"
        subtitle="Créez des albums, importez des photos en masse et organisez le portfolio."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            Nouvel album
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher un album…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(a) => a.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        emptyLabel="Aucun album."
        pagination={{
          page: table.page,
          pageCount: table.pageCount,
          total: table.total,
          perPage: table.perPage,
          onPageChange: table.setPage,
          onPerPageChange: (n) => {
            table.setPerPage(n);
            table.setPage(1);
          },
          itemLabel: "albums",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer l’album ?"
        message={`L'album « ${deleteTarget?.title ?? ""} » et toutes ses photos seront supprimés.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      {/* ── Album form modal ───────────────────────────────────────── */}
      <Modal open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : setIsModalOpen(false))} title={editing ? "Modifier l’album" : "Nouvel album"} size="sm">
        <form onSubmit={submit} onChange={() => setStatus((s) => (s ? null : s))} className="flex flex-col gap-4 px-6 py-6">
          <Field label="Titre" required>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Conférence Maison de Feu 2026" className={inputClass} />
          </Field>
          <Field label="Événement lié (catégorie)">
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
              <option value="">— Aucun (Autre) —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Quelques mots sur cet album…" className={cn(inputClass, "resize-none leading-relaxed")} />
          </Field>
          <Field label="Image de couverture">
            {coverPreview && !removeCover ? (
              <div className="relative h-36 w-full max-w-xs overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Couverture" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
                    setCoverFile(null);
                    setCoverPreview(null);
                    setRemoveCover(true);
                  }}
                  className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white hover:bg-live"
                >
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
          </Field>
          <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Photo management modal (bespoke board kept as-is) ──────── */}
      <Dialog open={photoAlbum !== null} onOpenChange={(o) => { if (!o) setPhotoAlbum(null); }}>
        <DialogContent showCloseButton onOpenAutoFocus={(e) => e.preventDefault()} className="w-[96vw] md:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 gap-0">
          {photoAlbum && <PhotoBoard album={photoAlbum} onChanged={onPhotosChanged} onStatus={setStatus} />}
        </DialogContent>
      </Dialog>
    </PageShell>
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
            dragOver ? "border-gold bg-gold/5" : "border-[rgba(40,25,80,0.2)] bg-cream hover:border-gold/60",
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
