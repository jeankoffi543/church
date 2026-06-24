"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Edit, Trash2, Video, FileVideo, ImagePlus, UploadCloud, Eye, X, BarChart3, Clapperboard } from "lucide-react";

import {
  createPastLive,
  updatePastLive,
  deletePastLive,
  getAdminPastLivesPaginated,
  type AdminPastLive,
  type AdminUser,
  type AdminListMeta,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { SmartImage } from "@/components/ui/smart-image";
import type { FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { Button } from "@/components/admin/ui/button";
import { Badge } from "@/components/admin/ui/badge";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { SearchableSelect } from "../_components/searchable-select";
import { AnalyticsDialog } from "./analytics-dialog";

type Source = "youtube" | "file";

const IMG_FALLBACK = "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&q=80";

const filterFields: FilterField[] = [
  { id: "title", label: "Titre", type: "text" },
  { id: "series_name", label: "Série", type: "text" },
];

export const PAST_LIVES_PER_PAGE = 10;

export function PastLivesManager({
  initialLives,
  initialMeta,
  preachers,
}: {
  initialLives: AdminPastLive[];
  initialMeta: AdminListMeta;
  preachers: AdminUser[];
}) {
  const preacherOptions = preachers.map((p) => ({ value: p.id, label: p.name, sublabel: p.email }));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPastLive | null>(null);
  const [analyticsTarget, setAnalyticsTarget] = useState<AdminPastLive | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPastLive | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [series, setSeries] = useState("");
  const [preacherId, setPreacherId] = useState("");
  const [duration, setDuration] = useState("");
  const [broadcastedAt, setBroadcastedAt] = useState("");
  const [source, setSource] = useState<Source>("youtube");
  const [youtubeId, setYoutubeId] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingVideo, setExistingVideo] = useState<string | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSeries("");
    setPreacherId("");
    setDuration("");
    setBroadcastedAt(new Date().toISOString().slice(0, 16));
    setSource("youtube");
    setYoutubeId("");
    setVideoFile(null);
    setExistingVideo(null);
    setThumbFile(null);
    setThumbPreview(null);
    setProgress(null);
  };

  const openCreate = () => {
    setEditing(null);
    reset();
    setIsModalOpen(true);
  };

  const openEdit = (l: AdminPastLive) => {
    setEditing(l);
    reset();
    setTitle(l.title);
    setDescription(l.description ?? "");
    setSeries(l.series_name ?? "");
    setPreacherId(l.preacher_id ? String(l.preacher_id) : "");
    setDuration(l.duration ?? "");
    setBroadcastedAt(l.broadcasted_at ? l.broadcasted_at.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setSource(l.media_type === "video_file" ? "file" : "youtube");
    setYoutubeId(l.youtube_id ?? "");
    setExistingVideo(l.media_type === "video_file" ? "Fichier vidéo actuel" : null);
    setThumbPreview(assetUrl(l.thumbnail_path));
    setIsModalOpen(true);
  };

  const pickThumb = (file: File | null) => {
    if (!file) return;
    if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (!title.trim() || !broadcastedAt) return;
    if (source === "youtube" && !youtubeId.trim()) {
      setStatus({ type: "error", message: "Indiquez l’identifiant (ou l’URL) YouTube." });
      return;
    }
    if (source === "file" && !videoFile && !existingVideo) {
      setStatus({ type: "error", message: "Téléversez un fichier vidéo." });
      return;
    }

    const hasUpload = Boolean(videoFile || thumbFile);
    if (hasUpload) startFaux();

    startTransition(async () => {
      try {
        const payload = {
          title,
          description: description || null,
          series_name: series || null,
          preacher_id: preacherId ? Number(preacherId) : null,
          duration: duration || null,
          broadcasted_at: broadcastedAt,
          youtube_id: source === "youtube" ? extractYouTube(youtubeId) : null,
        };
        const files = { video: source === "file" ? videoFile : null, thumbnail: thumbFile };

        if (editing) {
          const res = await updatePastLive(editing.id, payload, files);
          setLives((prev) => prev.map((l) => (l.id === res.data.id ? res.data : l)));
          table.refresh();
          setStatus({ type: "success", message: `« ${title} » mis à jour.` });
        } else {
          const res = await createPastLive(payload, files);
          setLives((prev) => [res.data, ...prev]);
          table.refresh();
          setStatus({ type: "success", message: `« ${title} » créé.` });
        }
        stopFaux(true);
        setIsModalOpen(false);
      } catch (err) {
        stopFaux(false);
        setStatus({ type: "error", message: (err as Error).message || "Erreur lors de l’enregistrement." });
      }
    });
  };

  const confirmDelete = () => {
    const l = deleteTarget;
    if (!l) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await deletePastLive(l.id);
        setLives((prev) => prev.filter((x) => x.id !== l.id));
        table.refresh();
        setStatus({ type: "success", message: `« ${l.title} » supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      } finally {
        setDeleteTarget(null);
      }
    });
  };

  const columns: Column<AdminPastLive>[] = [
    {
      id: "title",
      header: "Rediffusion",
      sortable: true,
      sortValue: (l) => l.title,
      cell: (l) => (
        <div className="flex items-center gap-3">
          <SmartImage
            src={assetUrl(l.thumbnail_path)}
            alt={l.title}
            fallback={IMG_FALLBACK}
            sizes="56px"
            skeletonClassName="bg-indigo/5"
            className="h-9 w-14 shrink-0 rounded-md"
          />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">{l.title}</span>
            <Badge
              tone={l.source_type === "live_archive" ? "live" : "upload"}
              icon={l.source_type === "live_archive" ? <Clapperboard className="size-3" /> : <UploadCloud className="size-3" />}
            >
              {l.source_type === "live_archive" ? "Live Archive" : "Upload"}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      id: "series_name",
      header: "Série",
      sortable: true,
      sortValue: (l) => l.series_name ?? "",
      className: "text-xs font-medium tracking-wide text-gold-dark uppercase",
      cell: (l) => l.series_name ?? "—",
    },
    {
      id: "media_type",
      header: "Source",
      sortable: true,
      sortValue: (l) => l.media_type ?? "",
      cell: (l) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">
          {l.media_type === "video_file" ? <FileVideo className="size-3" /> : <Video className="size-3" />}
          {l.media_type === "video_file" ? "Fichier" : "YouTube"}
        </span>
      ),
    },
    {
      id: "views_count",
      header: "Vues",
      sortable: true,
      sortValue: (l) => l.views_count,
      className: "font-mono text-xs font-semibold text-faint",
      cell: (l) => (
        <span className="inline-flex items-center gap-1">
          <Eye className="size-3" />
          {l.views_count}
        </span>
      ),
    },
    {
      id: "broadcasted_at",
      header: "Diffusé le",
      sortable: true,
      sortValue: (l) => l.broadcasted_at ?? "",
      className: "font-mono text-xs font-semibold whitespace-nowrap text-faint",
      cell: (l) => l.date_label,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (l) => (
        <div className="flex justify-end gap-2">
          <ActionBtn title="Impressions" onClick={() => setAnalyticsTarget(l)}>
            <BarChart3 className="size-3.5" />
          </ActionBtn>
          <ActionBtn title="Modifier" onClick={() => openEdit(l)}>
            <Edit className="size-3.5" />
          </ActionBtn>
          <ActionBtn title="Supprimer" destructive onClick={() => setDeleteTarget(l)}>
            <Trash2 className="size-3.5" />
          </ActionBtn>
        </div>
      ),
    },
  ];

  const table = useServerDataTable<AdminPastLive>({
    fetcher: getAdminPastLivesPaginated,
    initialData: initialLives,
    initialMeta,
    initialPerPage: PAST_LIVES_PER_PAGE,
  });
  const setLives = table.setItems;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Médiathèque visuelle"
        title="Archives des Lives"
        subtitle="Publiez les rediffusions (YouTube ou fichier) et organisez-les par série."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            Nouvelle rediffusion
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher une rediffusion…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(l) => l.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        emptyLabel="Aucune rediffusion."
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
          itemLabel: "rediffusions",
        }}
      />

      <AnalyticsDialog
        live={analyticsTarget}
        open={analyticsTarget !== null}
        onOpenChange={(o) => {
          if (!o) setAnalyticsTarget(null);
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer la rediffusion ?"
        message={`« ${deleteTarget?.title ?? ""} » sera définitivement supprimée. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal
        open={isModalOpen}
        onOpenChange={(o) => {
          if (!o) setIsModalOpen(false);
        }}
        title={editing ? "Modifier la rediffusion" : "Nouvelle rediffusion"}
      >
        <form
          onSubmit={submit}
          onChange={() => setStatus((s) => (s ? null : s))}
          className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2"
        >
          <Field className="sm:col-span-2" label="Titre" required>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Culte de Pentecôte 2026" className={inputClass} />
          </Field>
          <Field label="Diffusé le" required>
            <input type="datetime-local" required value={broadcastedAt} onChange={(e) => setBroadcastedAt(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Durée">
            <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ex: 1h 32min" className={inputClass} />
          </Field>
          <Field label="Série d’enseignements">
            <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="ex: Vivre par la foi" className={inputClass} />
          </Field>
          <Field label="Prédicateur">
            <SearchableSelect
              options={preacherOptions}
              value={preacherId === "" ? null : Number(preacherId)}
              onChange={(val) => setPreacherId(val === null ? "" : String(val))}
              placeholder="Assigner un prédicateur…"
              clearLabel="— Aucun —"
            />
          </Field>

          {/* Source selector */}
          <Field className="sm:col-span-2" label="Source vidéo">
            <div className="grid grid-cols-2 gap-2">
              {(["youtube", "file"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSource(s)}
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition",
                    source === s ? "border-gold bg-gold/10 text-gold-dark" : "border-[rgba(40,25,80,0.12)] bg-cream text-body hover:border-gold/60",
                  )}
                >
                  {s === "youtube" ? <Video className="size-4" /> : <FileVideo className="size-4" />}
                  {s === "youtube" ? "Lien YouTube" : "Fichier vidéo"}
                </button>
              ))}
            </div>
          </Field>

          <div className="sm:col-span-2">
            {source === "youtube" ? (
              <Field label="Identifiant ou URL YouTube">
                <input value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="dQw4w9WgXcQ ou https://youtu.be/…" className={inputClass} />
              </Field>
            ) : (
              <Field label="Fichier vidéo">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(40,25,80,0.2)] bg-cream px-4 py-6 text-center hover:border-gold/60">
                  <UploadCloud className="size-6 text-indigo/60" />
                  <span className="text-[13px] font-bold text-indigo">
                    {videoFile ? `${videoFile.name} · ${(videoFile.size / 1_048_576).toFixed(1)} Mo` : existingVideo ?? "Glissez ou cliquez pour téléverser"}
                  </span>
                  <span className="text-[11px] text-faint">MP4, WEBM, MOV</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
                </label>
              </Field>
            )}
          </div>

          {/* Thumbnail */}
          <Field className="sm:col-span-2" label="Miniature (vignette)">
            {thumbPreview ? (
              <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbPreview} alt="Miniature" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview);
                    setThumbFile(null);
                    setThumbPreview(null);
                  }}
                  className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white hover:bg-live"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-24 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-cream text-center hover:border-gold hover:bg-gold/5">
                <ImagePlus className="size-5 text-indigo/60" />
                <span className="text-[12px] font-bold text-indigo">Importer une vignette</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickThumb(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </Field>

          <Field className="sm:col-span-2" label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Résumé de la rediffusion…" className={cn(inputClass, "resize-none leading-relaxed")} />
          </Field>

          {progress !== null && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(40,25,80,0.1)] sm:col-span-2">
              <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}

          <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4 sm:col-span-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}

/** Square icon button used in table rows. */
function ActionBtn({
  title,
  destructive = false,
  onClick,
  children,
}: {
  title: string;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex size-8 cursor-pointer items-center justify-center rounded-lg border transition",
        destructive
          ? "border-live/10 text-live hover:bg-live/10"
          : "border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5",
      )}
    >
      {children}
    </button>
  );
}

/** Accept a raw YouTube id or any YouTube URL, returning the 11-char id. */
function extractYouTube(input: string): string {
  const v = input.trim();
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : v;
}
