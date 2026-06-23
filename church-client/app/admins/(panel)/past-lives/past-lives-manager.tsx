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
  Video,
  FileVideo,
  ImagePlus,
  UploadCloud,
  Eye,
  X,
} from "lucide-react";

import {
  createPastLive,
  updatePastLive,
  deletePastLive,
  type AdminPastLive,
  type AdminUser,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SmartImage } from "@/components/ui/smart-image";
import { Pagination } from "../_components/pagination";
import { SearchableSelect } from "../_components/searchable-select";

type Source = "youtube" | "file";

const IMG_FALLBACK = "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&q=80";

export function PastLivesManager({
  initialLives,
  preachers,
}: {
  initialLives: AdminPastLive[];
  preachers: AdminUser[];
}) {
  const preacherOptions = preachers.map((p) => ({ value: p.id, label: p.name, sublabel: p.email }));
  const [lives, setLives] = useState<AdminPastLive[]>(initialLives);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPastLive | null>(null);

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
          setStatus({ type: "success", message: `« ${title} » mis à jour.` });
        } else {
          const res = await createPastLive(payload, files);
          setLives((prev) => [res.data, ...prev]);
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

  const handleDelete = (l: AdminPastLive) => {
    if (!confirm(`Supprimer la rediffusion « ${l.title} » ?`)) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await deletePastLive(l.id);
        setLives((prev) => prev.filter((x) => x.id !== l.id));
        setStatus({ type: "success", message: `« ${l.title} » supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const filtered = lives.filter(
    (l) => l.title.toLowerCase().includes(search.toLowerCase()) || (l.series_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">Médiathèque visuelle</span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">Archives des Lives</h1>
          <p className="mt-1 text-sm text-body">Publiez les rediffusions (YouTube ou fichier) et organisez-les par série.</p>
        </div>
        <button onClick={openCreate} className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105">
          <Plus className="size-4" /> Nouvelle rediffusion
        </button>
      </header>

      {status && (
        <div className={cn("mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm", status.type === "success" ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live")}>
          {status.type === "success" ? <CheckCircle className="size-5 shrink-0 text-online" /> : <AlertCircle className="size-5 shrink-0 text-live" />}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      <div className="mb-6 flex max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5">
        <Search className="size-4 text-faint" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher une rediffusion…" className="w-full text-[14px] text-indigo outline-none placeholder:text-faint" />
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Rediffusion</th>
                <th className="px-6 py-4">Série</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Vues</th>
                <th className="px-6 py-4">Diffusé le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((l) => (
                <tr key={l.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <SmartImage
                        src={assetUrl(l.thumbnail_path)}
                        alt={l.title}
                        fallback={IMG_FALLBACK}
                        sizes="56px"
                        skeletonClassName="bg-indigo/5"
                        className="h-9 w-14 shrink-0 rounded-md"
                      />
                      <span className="font-semibold">{l.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-xs font-medium tracking-wide text-gold-dark uppercase">{l.series_name ?? "—"}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">
                      {l.media_type === "video_file" ? <FileVideo className="size-3" /> : <Video className="size-3" />}
                      {l.media_type === "video_file" ? "Fichier" : "YouTube"}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-xs font-semibold text-faint"><span className="inline-flex items-center gap-1"><Eye className="size-3" />{l.views_count}</span></td>
                  <td className="px-6 py-3 text-xs font-mono font-semibold whitespace-nowrap text-faint">{l.date_label}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(l)} title="Modifier" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5">
                        <Edit className="size-3.5" />
                      </button>
                      <button onClick={() => handleDelete(l)} title="Supprimer" className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-body">Aucune rediffusion.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="rediffusions"
          />
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) setIsModalOpen(false); }}>
        <DialogContent showCloseButton onOpenAutoFocus={(e) => e.preventDefault()} className="w-[95vw] md:max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 gap-0">
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h3 className="font-display text-xl font-bold text-indigo italic">{editing ? "Modifier la rediffusion" : "Nouvelle rediffusion"}</h3>
          </div>
          <form onSubmit={submit} onChange={() => setStatus((s) => (s ? null : s))} className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
            <Field className="sm:col-span-2" label="Titre *">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: Culte de Pentecôte 2026" className={INPUT} />
            </Field>
            <Field label="Diffusé le *">
              <input type="datetime-local" required value={broadcastedAt} onChange={(e) => setBroadcastedAt(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Durée">
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ex: 1h 32min" className={INPUT} />
            </Field>
            <Field label="Série d’enseignements">
              <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="ex: Vivre par la foi" className={INPUT} />
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
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Source vidéo</span>
              <div className="grid grid-cols-2 gap-2">
                {(["youtube", "file"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setSource(s)} className={cn("flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] font-bold transition", source === s ? "border-gold bg-gold/10 text-gold-dark" : "border-[rgba(40,25,80,0.12)] bg-cream text-body hover:border-gold/60")}>
                    {s === "youtube" ? <Video className="size-4" /> : <FileVideo className="size-4" />}
                    {s === "youtube" ? "Lien YouTube" : "Fichier vidéo"}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              {source === "youtube" ? (
                <Field label="Identifiant ou URL YouTube">
                  <input value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="dQw4w9WgXcQ ou https://youtu.be/…" className={INPUT} />
                </Field>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Fichier vidéo</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[rgba(40,25,80,0.2)] bg-cream px-4 py-6 text-center hover:border-gold/60">
                    <UploadCloud className="size-6 text-indigo/60" />
                    <span className="text-[13px] font-bold text-indigo">{videoFile ? `${videoFile.name} · ${(videoFile.size / 1_048_576).toFixed(1)} Mo` : existingVideo ?? "Glissez ou cliquez pour téléverser"}</span>
                    <span className="text-[11px] text-faint">MP4, WEBM, MOV</span>
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
                  </label>
                </div>
              )}
            </div>

            {/* Thumbnail */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Miniature (vignette)</span>
              {thumbPreview ? (
                <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbPreview} alt="Miniature" className="size-full object-cover" />
                  <button type="button" onClick={() => { if (thumbPreview?.startsWith("blob:")) URL.revokeObjectURL(thumbPreview); setThumbFile(null); setThumbPreview(null); }} className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white hover:bg-live"><X className="size-4" /></button>
                </div>
              ) : (
                <label className="flex h-24 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-cream text-center hover:border-gold hover:bg-gold/5">
                  <ImagePlus className="size-5 text-indigo/60" />
                  <span className="text-[12px] font-bold text-indigo">Importer une vignette</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickThumb(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            <Field className="sm:col-span-2" label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Résumé de la rediffusion…" className={cn(INPUT, "resize-none leading-relaxed")} />
            </Field>

            {progress !== null && (
              <div className="sm:col-span-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(40,25,80,0.1)]">
                <div className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-200" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4 sm:col-span-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.1)] px-4 py-2.5 text-xs font-bold text-body hover:bg-cream">Annuler</button>
              <button type="submit" disabled={isPending} className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo hover:brightness-105 disabled:opacity-50">
                {isPending && <Loader2 className="size-3.5 animate-spin" />} Enregistrer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Accept a raw YouTube id or any YouTube URL, returning the 11-char id. */
function extractYouTube(input: string): string {
  const v = input.trim();
  const m = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : v;
}

const INPUT = "rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold w-full";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">{label}</span>
      {children}
    </label>
  );
}

