"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Video,
  Headphones,
  FileVideo,
  FileAudio,
  UploadCloud,
  BookOpen,
  X,
  ImagePlus,
  PlayCircle,
  FileText,
} from "lucide-react";
import {
  createSermon,
  updateSermon,
  deleteSermon,
  type AdminSermon,
  type SermonMediaType,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SermonReaderDialog, type ReaderSermon } from "@/components/media/sermon-reader";
import { BookMultiSelect } from "@/components/admin/book-multi-select";
import { BIBLE_BOOKS } from "@/lib/constants/bible";
import { SearchableSelect } from "../_components/searchable-select";

/** Form-only choice: the 4 real media types + "none" (notes-only sermon). */
type MediaChoice = SermonMediaType | "none";

const MEDIA_TYPES: { value: MediaChoice; label: string; icon: typeof Video }[] = [
  { value: "video_url", label: "Vidéo · Lien", icon: Video },
  { value: "video_file", label: "Vidéo · Fichier", icon: FileVideo },
  { value: "audio_url", label: "Audio · Lien", icon: Headphones },
  { value: "audio_file", label: "Audio · Fichier", icon: FileAudio },
  { value: "none", label: "Aucun · Notes", icon: FileText },
];

const isFileType = (t: MediaChoice) => t.endsWith("_file");
const isAudioType = (t: MediaChoice) => t.startsWith("audio_");
const baseName = (p?: string | null) => (p ? p.split("/").pop() ?? "" : "");

export function SermonsManager({
  initialSermons,
  preachers,
}: {
  initialSermons: AdminSermon[];
  preachers: { id: number; name: string }[];
}) {
  const [sermons, setSermons] = useState<AdminSermon[]>(initialSermons);
  const preacherOptions = preachers.map((p) => ({ value: p.id, label: p.name }));
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<AdminSermon | null>(null);
  const [previewSermon, setPreviewSermon] = useState<AdminSermon | null>(null);

  // Auto-dismiss the status banner after 4s so it never lingers across actions.
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  // Core fields
  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("");
  const [preacherId, setPreacherId] = useState("");
  const [books, setBooks] = useState<string[]>([]);
  const [preachedAt, setPreachedAt] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Media
  const [mediaType, setMediaType] = useState<MediaChoice>("video_url");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [existingMediaName, setExistingMediaName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Background image
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState(false);

  // Scriptures (tags)
  const [scriptures, setScriptures] = useState<string[]>([]);
  const [scriptureInput, setScriptureInput] = useState("");

  const resetForm = () => {
    setTitle("");
    setSeries("");
    setPreacherId("");
    setBooks([]);
    setPreachedAt(new Date().toISOString().split("T")[0]);
    setDuration("");
    setDescription("");
    setIsPublished(true);
    setMediaType("video_url");
    setMediaUrl("");
    setMediaFile(null);
    setExistingMediaName(null);
    setBackgroundFile(null);
    setBackgroundPreview(null);
    setRemoveBackground(false);
    setScriptures([]);
    setScriptureInput("");
    setUploadProgress(null);
  };

  const openCreateModal = () => {
    setEditingSermon(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (s: AdminSermon) => {
    // Close any open preview so its video can't keep playing behind the modal.
    setPreviewSermon(null);
    setEditingSermon(s);
    resetForm();
    setTitle(s.title);
    setSeries(s.series ?? "");
    setPreacherId(s.user_id ? String(s.user_id) : "");
    setBooks(s.books_category ?? []);
    setPreachedAt(s.date ?? new Date().toISOString().split("T")[0]);
    setDuration(s.duration ?? "");
    setDescription(s.description ?? "");
    setIsPublished(s.is_published);
    setMediaType(s.media_type ?? "none");
    setMediaUrl(s.is_file ? "" : s.media_url ?? "");
    setExistingMediaName(s.is_file ? baseName(s.media_path) : null);
    setBackgroundPreview(assetUrl(s.background_image));
    setScriptures(s.scriptures ?? []);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSermon(null);
  };

  /* ── Scripture tags ─────────────────────────────────────────────── */
  const addScripture = () => {
    const ref = scriptureInput.trim();
    if (!ref) return;
    if (scriptures.some((s) => s.toLowerCase() === ref.toLowerCase())) {
      setScriptureInput("");
      return;
    }
    setScriptures((prev) => [...prev, ref]);
    setScriptureInput("");
  };

  const removeScripture = (ref: string) =>
    setScriptures((prev) => prev.filter((s) => s !== ref));

  /* ── Media file selection ───────────────────────────────────────── */
  const pickMediaFile = (file: File | null) => {
    if (!file) return;
    setMediaFile(file);
    setExistingMediaName(null);
  };

  const pickBackground = (file: File | null) => {
    if (!file) return;
    if (backgroundPreview?.startsWith("blob:")) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(file);
    setBackgroundPreview(URL.createObjectURL(file));
    setRemoveBackground(false);
  };

  const clearBackground = () => {
    if (backgroundPreview?.startsWith("blob:")) URL.revokeObjectURL(backgroundPreview);
    setBackgroundFile(null);
    setBackgroundPreview(null);
    setRemoveBackground(true);
  };

  /* ── Faux upload progress (server actions hide real byte progress) ── */
  const startProgress = () => {
    setUploadProgress(8);
    progressTimer.current = setInterval(() => {
      setUploadProgress((p) => {
        const cur = p ?? 0;
        if (cur >= 92) return cur;
        return cur + Math.max(1, Math.round((95 - cur) / 12));
      });
    }, 180);
  };

  const stopProgress = (done: boolean) => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = null;
    setUploadProgress(done ? 100 : null);
    if (done) setTimeout(() => setUploadProgress(null), 600);
  };

  const handleDelete = (id: number, t: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le sermon "${t}" ?`)) return;
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteSermon(id);
        setSermons((prev) => prev.filter((s) => s.id !== id));
        setStatus({ type: "success", message: `Le sermon "${t}" a été supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear any lingering feedback the moment the admin re-submits.
    setStatus(null);
    if (!title.trim() || !preachedAt) return;
    if (!preacherId) {
      setStatus({ type: "error", message: "Veuillez sélectionner un orateur." });
      return;
    }

    const notesOnly = mediaType === "none";
    if (!notesOnly && !isFileType(mediaType) && !mediaUrl.trim()) {
      setStatus({ type: "error", message: "Veuillez fournir une URL pour ce type de média." });
      return;
    }
    if (!notesOnly && isFileType(mediaType) && !mediaFile && !existingMediaName) {
      setStatus({ type: "error", message: "Veuillez téléverser le fichier média pour ce type." });
      return;
    }

    setStatus(null);
    const hasUpload = Boolean(mediaFile || backgroundFile);
    if (hasUpload) startProgress();

    startTransition(async () => {
      try {
        const payload = {
          title,
          series: series || null,
          user_id: preacherId ? Number(preacherId) : null,
          preached_at: preachedAt,
          duration: duration || null,
          description: description || null,
          media_type: mediaType === "none" ? null : mediaType,
          media_url: notesOnly || isFileType(mediaType) ? null : mediaUrl || null,
          scriptures,
          books_category: books,
          is_published: isPublished,
        };
        const files = {
          media: !notesOnly && isFileType(mediaType) ? mediaFile : null,
          background_image: backgroundFile,
          remove_background_image: removeBackground,
        };

        if (editingSermon) {
          const res = await updateSermon(editingSermon.id, payload, files);
          setSermons((prev) => prev.map((s) => (s.id === res.data.id ? res.data : s)));
          setStatus({ type: "success", message: `Le sermon "${title}" a été mis à jour.` });
        } else {
          const res = await createSermon(payload, files);
          setSermons((prev) => [res.data, ...prev]);
          setStatus({ type: "success", message: `Le sermon "${title}" a été créé.` });
        }
        stopProgress(true);
        closeModal();
      } catch (err) {
        stopProgress(false);
        setStatus({ type: "error", message: (err as Error).message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const filtered = sermons.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.speaker.toLowerCase().includes(search.toLowerCase()) ||
      (s.series && s.series.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-275 animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">Ressources</span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">Gestion des Prédications</h1>
          <p className="mt-1 text-sm text-body">
            Gérez la médiathèque de sermons, leurs médias et leurs références bibliques.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <Plus className="size-4" /> Nouvelle Prédication
        </button>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success" ? "border-online/20 bg-online/5 text-body-strong" : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <div>
            <p className="font-bold">{status.type === "success" ? "Succès" : "Erreur"}</p>
            <p className="mt-0.5 text-xs text-body">{status.message}</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
        <Search className="size-4 text-faint" />
        <input
          type="text"
          placeholder="Rechercher par titre, orateur ou série..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[14px] text-indigo outline-none placeholder:text-faint"
        />
      </div>

      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Titre / Série</th>
                <th className="px-6 py-4">Orateur</th>
                <th className="px-6 py-4">Média</th>
                <th className="px-6 py-4">Références</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((sermon) => (
                <tr key={sermon.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold whitespace-nowrap text-faint">{sermon.date}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{sermon.title}</p>
                    {sermon.series && (
                      <p className="mt-0.5 text-xs font-medium tracking-wider text-gold-dark uppercase">{sermon.series}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{sermon.speaker}</td>
                  <td className="px-6 py-4">
                    {!sermon.media_type ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">
                        <FileText className="size-3 shrink-0" /> Notes
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold whitespace-nowrap text-indigo">
                        {sermon.is_audio ? <Headphones className="size-3 shrink-0" /> : <Video className="size-3 shrink-0" />}
                        {sermon.is_audio ? "Audio" : "Vidéo"}
                        <span className="text-faint">· {sermon.is_file ? "Fichier" : "Lien"}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {sermon.scriptures.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold-dark">
                        <BookOpen className="size-3" /> {sermon.scriptures.length}
                      </span>
                    ) : (
                      <span className="text-xs italic text-faint">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {sermon.is_published ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-online/10 px-2.5 py-1 text-xs font-bold text-online">
                        <Eye className="size-3" /> Publié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                        <EyeOff className="size-3" /> Brouillon
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setPreviewSermon(sermon)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Aperçu / Lire"
                      >
                        <PlayCircle className="size-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(sermon)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sermon.id, sermon.title)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live hover:bg-live/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-xs text-body">Aucun sermon trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent
          showCloseButton
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-0 bg-white p-0 gap-0 outline-none"
        >
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h3 className="font-display text-xl font-bold text-indigo italic">
              {editingSermon ? "Modifier la prédication" : "Ajouter une prédication"}
            </h3>
          </div>

          <form
            onSubmit={handleSubmit}
            onChange={() => setStatus((s) => (s ? null : s))}
            className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2"
          >
            <Field className="sm:col-span-2" label="Titre de la prédication *">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex: La grâce qui transforme" className={INPUT} />
            </Field>

            <Field label="Orateur *">
              <SearchableSelect
                options={preacherOptions}
                value={preacherId === "" ? null : Number(preacherId)}
                onChange={(val) => setPreacherId(val === null ? "" : String(val))}
                placeholder="Sélectionner un orateur…"
                clearLabel="— Aucun orateur —"
              />
            </Field>
            <Field label="Date de prédication *">
              <input type="date" required value={preachedAt} onChange={(e) => setPreachedAt(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Série d’enseignements">
              <input value={series} onChange={(e) => setSeries(e.target.value)} placeholder="ex: Vivre par la foi" className={INPUT} />
            </Field>
            <Field className="sm:col-span-2" label="Livres bibliques (catégories)">
              <BookMultiSelect value={books} onChange={setBooks} options={BIBLE_BOOKS} />
            </Field>
            <Field label="Durée">
              <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ex: 48 min" className={INPUT} />
            </Field>
            <div className="flex flex-col justify-center gap-2.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Statut</span>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="size-4 cursor-pointer accent-gold" />
                <span className="text-[13px] font-semibold text-indigo">Publier directement</span>
              </label>
            </div>

            {/* Media type selector */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Type de média</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MEDIA_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMediaType(value);
                      setStatus((s) => (s ? null : s));
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-bold transition",
                      mediaType === value
                        ? "border-gold bg-gold/10 text-gold-dark shadow-sm"
                        : "border-[rgba(40,25,80,0.12)] bg-[#faf8f4] text-body hover:border-gold/60"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional media input */}
            <div className="sm:col-span-2">
              {mediaType === "none" ? (
                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3.5 text-[13px] text-body">
                  <FileText className="size-5 shrink-0 text-indigo/60" />
                  <span>Ce message ne contient aucun média — seules les notes, le résumé et les références bibliques seront affichés.</span>
                </div>
              ) : !isFileType(mediaType) ? (
                <Field label={isAudioType(mediaType) ? "URL audio (SoundCloud, podcast…)" : "URL vidéo (YouTube, Vimeo…)"}>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://…"
                    className={INPUT}
                  />
                </Field>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">
                    Fichier {isAudioType(mediaType) ? "audio" : "vidéo"}
                  </span>
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickMediaFile(e.dataTransfer.files?.[0] ?? null); }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
                      dragOver ? "border-gold bg-gold/5" : "border-[rgba(40,25,80,0.2)] bg-[#faf8f4] hover:border-gold/60"
                    )}
                  >
                    <UploadCloud className="size-6 text-indigo/60" />
                    {mediaFile ? (
                      <span className="text-[13px] font-bold text-indigo">{mediaFile.name} · {(mediaFile.size / 1_048_576).toFixed(1)} Mo</span>
                    ) : existingMediaName ? (
                      <span className="text-[13px] font-semibold text-indigo">Fichier actuel : {existingMediaName}</span>
                    ) : (
                      <span className="text-[13px] font-bold text-indigo">Glissez-déposez ou cliquez pour téléverser</span>
                    )}
                    <span className="text-[11px] text-faint">{isAudioType(mediaType) ? "MP3, WAV, M4A, OGG" : "MP4, WEBM, MOV"} · max 200 Mo</span>
                    <input
                      type="file"
                      accept={isAudioType(mediaType) ? "audio/*" : "video/*"}
                      className="hidden"
                      onChange={(e) => pickMediaFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {uploadProgress !== null && (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(40,25,80,0.1)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-dark transition-[width] duration-200 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Background image (optional) */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Image de couverture (optionnel)</span>
              {backgroundPreview && !removeBackground ? (
                <div className="relative h-36 w-full max-w-xs overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={backgroundPreview} alt="Couverture" className="size-full object-cover" />
                  <button type="button" onClick={clearBackground} className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-sm transition hover:bg-live" title="Retirer">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-[#faf8f4] text-center transition hover:border-gold hover:bg-gold/5">
                  <ImagePlus className="size-5 text-indigo/60" />
                  <span className="text-[12px] font-bold text-indigo">Importer une image</span>
                  <span className="text-[10px] text-faint">JPG, PNG, WEBP</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickBackground(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>

            {/* Scriptures (tags) */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Références bibliques</span>
              <div className="flex gap-2">
                <input
                  value={scriptureInput}
                  onChange={(e) => setScriptureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addScripture();
                    }
                  }}
                  placeholder="ex: Jean 3:16, puis Entrée"
                  className={cn(INPUT, "flex-1")}
                />
                <button
                  type="button"
                  onClick={addScripture}
                  className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-indigo px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-mid"
                >
                  <Plus className="size-3.5" /> Ajouter
                </button>
              </div>
              {scriptures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {scriptures.map((ref) => (
                    <span
                      key={ref}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/10 px-2.5 py-1 text-[12px] font-bold text-gold-dark"
                    >
                      <BookOpen className="size-3" />
                      {ref}
                      <button
                        type="button"
                        onClick={() => removeScripture(ref)}
                        className="ml-0.5 cursor-pointer rounded-full text-gold-dark/70 transition hover:text-live"
                        aria-label={`Retirer ${ref}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Field className="sm:col-span-2" label="Résumé / Description">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="De quoi parle ce message ?"
                className={cn(INPUT, "resize-none leading-relaxed")}
              />
            </Field>

            <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4 sm:col-span-2">
              <button type="button" onClick={closeModal} className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.1)] px-4 py-2.5 text-xs font-bold text-body transition hover:bg-cream">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo transition hover:brightness-105 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Media preview / reader ─────────────────────────────────── */}
      {previewSermon && (
        <SermonReaderDialog
          open={Boolean(previewSermon)}
          onOpenChange={(o) => { if (!o) setPreviewSermon(null); }}
          sermon={toReaderSermon(previewSermon)}
        />
      )}
    </div>
  );
}

/** Map an admin sermon to the public reader's shape (resolving file paths). */
function toReaderSermon(s: AdminSermon): ReaderSermon {
  return {
    id: s.id,
    title: s.title,
    speaker: s.speaker,
    serie: s.series,
    date: s.date,
    duration: s.duration,
    description: s.description,
    mediaType: s.media_type,
    // `media_url` carries the Range-capable stream route for uploaded files.
    mediaSrc: s.is_file ? assetUrl(s.media_url) : s.media_url,
    background: assetUrl(s.background_image),
    scriptures: s.scriptures,
  };
}

const INPUT =
  "rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold w-full";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">{label}</span>
      {children}
    </label>
  );
}
