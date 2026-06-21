"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { createSermon, updateSermon, deleteSermon } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Sermon = {
  id: number;
  series: string | null;
  title: string;
  description: string | null;
  speaker: string;
  book: string | null;
  preached_at: string;
  duration: string | null;
  video_url: string | null;
  audio_url: string | null;
  is_published: boolean;
};

export function SermonsManager({
  initialSermons,
}: {
  initialSermons: Sermon[];
}) {
  const [sermons, setSermons] = useState<Sermon[]>(initialSermons);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [book, setBook] = useState("");
  const [preachedAt, setPreachedAt] = useState("");
  const [duration, setDuration] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const openCreateModal = () => {
    setEditingSermon(null);
    setTitle("");
    setSeries("");
    setSpeaker("");
    setBook("");
    setPreachedAt(new Date().toISOString().split("T")[0]);
    setDuration("");
    setVideoUrl("");
    setAudioUrl("");
    setDescription("");
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (sermon: Sermon) => {
    setEditingSermon(sermon);
    setTitle(sermon.title);
    setSeries(sermon.series ?? "");
    setSpeaker(sermon.speaker);
    setBook(sermon.book ?? "");
    setPreachedAt(sermon.preached_at);
    setDuration(sermon.duration ?? "");
    setVideoUrl(sermon.video_url ?? "");
    setAudioUrl(sermon.audio_url ?? "");
    setDescription(sermon.description ?? "");
    setIsPublished(sermon.is_published);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSermon(null);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le sermon "${title}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteSermon(id);
        setSermons(sermons.filter((s) => s.id !== id));
        setStatus({ type: "success", message: `Le sermon "${title}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer ce sermon." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !speaker.trim() || !preachedAt) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const payload = {
          title,
          series: series || null,
          speaker,
          book: book || null,
          preached_at: preachedAt,
          duration: duration || null,
          video_url: videoUrl || null,
          audio_url: audioUrl || null,
          description: description || null,
          is_published: isPublished,
        };

        if (editingSermon) {
          const res = await updateSermon(editingSermon.id, payload);
          const updated = res.data as Sermon;
          setSermons(sermons.map((s) => (s.id === updated.id ? updated : s)));
          setStatus({ type: "success", message: `Le sermon "${title}" a été mis à jour.` });
        } else {
          const res = await createSermon(payload);
          const created = res.data as Sermon;
          setSermons([...sermons, created]);
          setStatus({ type: "success", message: `Le sermon "${title}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const filtered = sermons.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.speaker.toLowerCase().includes(search.toLowerCase()) ||
    (s.series && s.series.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion des Prédications
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez la médiathèque de sermons, séries d’enseignements et fichiers multimédias.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
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

      {/* Filter and search bar */}
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

      {/* Table grid */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="bg-cream border-b border-[rgba(40,25,80,0.08)] text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Titre / Série</th>
                <th className="px-6 py-4">Orateur</th>
                <th className="px-6 py-4">Médias</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((sermon) => (
                <tr key={sermon.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono font-semibold text-faint">
                    {sermon.preached_at}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold">{sermon.title}</p>
                      {sermon.series && (
                        <p className="mt-0.5 text-xs text-gold-dark font-medium uppercase tracking-wider">{sermon.series}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{sermon.speaker}</td>
                  <td className="px-6 py-4 text-xs text-body-soft">
                    <div className="flex flex-col gap-0.5">
                      {sermon.video_url && <span className="text-indigo font-semibold">🎥 Vidéo</span>}
                      {sermon.audio_url && <span className="text-indigo font-semibold">🔊 Audio</span>}
                      {!sermon.video_url && !sermon.audio_url && <span className="text-faint italic">Aucun</span>}
                    </div>
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
                  <td colSpan={6} className="px-6 py-10 text-center text-xs text-body">
                    Aucun sermon trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-xs" onClick={closeModal} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-2xl animate-fade-up">
            <div className="contents">
              <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-indigo italic">
                {editingSermon ? "Modifier la prédication" : "Ajouter une prédication"}
              </h3>
              <button onClick={closeModal} className="text-faint hover:text-indigo">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Titre de la prédication *</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Le mystère de l’intercession agissante"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Orateur / Prédicateur *</span>
                <input
                  type="text"
                  required
                  value={speaker}
                  onChange={(e) => setSpeaker(e.target.value)}
                  placeholder="ex: Dr. Daniel Olukoya"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Date de prédication *</span>
                <input
                  type="date"
                  required
                  value={preachedAt}
                  onChange={(e) => setPreachedAt(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Série d’enseignements</span>
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="ex: Victorieux par la prière"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Référence Biblique</span>
                <input
                  type="text"
                  value={book}
                  onChange={(e) => setBook(e.target.value)}
                  placeholder="ex: Actes 3.1-10"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Durée (ex: 45 min)</span>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="ex: 1h 15m"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="flex flex-col gap-2.5 justify-center">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Statut</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="size-4 accent-gold cursor-pointer"
                  />
                  <span className="text-[13px] font-semibold text-indigo">Publier directement</span>
                </label>
              </div>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">URL Vidéo (YouTube link / embed)</span>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">URL Audio (Podcasts / Soundcloud)</span>
                <input
                  type="url"
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Résumé / Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="De quoi parle ce sermon ?"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold resize-none leading-relaxed"
                />
              </label>

              <div className="sm:col-span-2 mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="cursor-pointer rounded-xl border border-[rgba(40,25,80,0.1)] px-4 py-2.5 text-xs font-bold text-body hover:bg-cream transition"
                >
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
          </div>
        </div>
      </>
      )}
    </div>
  );
}
