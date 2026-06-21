"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  Star, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import { createEvent, updateEvent, deleteEvent } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Event = {
  id: number;
  title: string;
  slug: string;
  type: string | null;
  description: string | null;
  location: string | null;
  host: string | null;
  starts_at: string;
  ends_at: string | null;
  image: string | null;
  highlights: string[] | null;
  is_featured: boolean;
};

export function EventsManager({
  initialEvents,
}: {
  initialEvents: Event[];
}) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [host, setHost] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [image, setImage] = useState("");
  const [highlightsInput, setHighlightsInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const openCreateModal = () => {
    setEditingEvent(null);
    setTitle("");
    setSlug("");
    setType("Culte spécial");
    setDescription("");
    setLocation("");
    setHost("MFM Ficgayo");
    const now = new Date();
    // Default starts_at to next Sunday 09:00 local time
    const nextSunday = new Date(now.setDate(now.getDate() + (7 - now.getDay()) % 7));
    nextSunday.setHours(9, 0, 0, 0);
    const tzoffset = nextSunday.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = (new Date(nextSunday.getTime() - tzoffset)).toISOString().slice(0, 16);
    setStartsAt(localISOTime);
    setEndsAt("");
    setImage("");
    setHighlightsInput("");
    setIsFeatured(false);
    setIsModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setSlug(event.slug);
    setType(event.type ?? "");
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");
    setHost(event.host ?? "");
    
    // Format dates for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatDateTime = (dtStr: string | null) => {
      if (!dtStr) return "";
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return "";
      const tzoffset = d.getTimezoneOffset() * 60000;
      return (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
    };

    setStartsAt(formatDateTime(event.starts_at));
    setEndsAt(formatDateTime(event.ends_at));
    setImage(event.image ?? "");
    setHighlightsInput(event.highlights ? event.highlights.join("\n") : "");
    setIsFeatured(event.is_featured);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer l'événement "${title}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteEvent(id);
        setEvents(events.filter((e) => e.id !== id));
        setStatus({ type: "success", message: `L'événement "${title}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer cet événement." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const highlights = highlightsInput
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const payload = {
          title,
          slug: slug.trim() || undefined,
          type: type || null,
          description: description || null,
          location: location || null,
          host: host || null,
          starts_at: startsAt,
          ends_at: endsAt || null,
          image: image || null,
          highlights,
          is_featured: isFeatured,
        };

        if (editingEvent) {
          const res = await updateEvent(editingEvent.id, payload);
          const updated = res.data as Event;
          setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
          setStatus({ type: "success", message: `L'événement "${title}" a été mis à jour.` });
        } else {
          const res = await createEvent(payload);
          const created = res.data as Event;
          setEvents([...events, created]);
          setStatus({ type: "success", message: `L'événement "${title}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.type && e.type.toLowerCase().includes(search.toLowerCase())) ||
    (e.location && e.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion de l’Agenda
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les cultes spéciaux, conférences, séminaires et veillées de l’église.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <Plus className="size-4" /> Nouvel Événement
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
          placeholder="Rechercher un événement..."
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
                <th className="px-6 py-4">Featured</th>
                <th className="px-6 py-4">Titre / Type</th>
                <th className="px-6 py-4">Lieu / Hôte</th>
                <th className="px-6 py-4">Date de début</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((event) => (
                <tr key={event.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4">
                    {event.is_featured ? (
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-gold/20 text-gold-dark" title="Mis en avant">
                        <Star className="size-4 fill-gold-dark" />
                      </span>
                    ) : (
                      <span className="text-faint/30 font-semibold">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      {event.type && (
                        <p className="mt-0.5 text-xs text-gold-dark font-medium uppercase tracking-wider">{event.type}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-body-soft">
                    <div>
                      <p className="font-semibold text-indigo">{event.location ?? "—"}</p>
                      {event.host && <p className="text-faint">{event.host}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-semibold text-faint">
                    {event.starts_at.replace("T", " ").substring(0, 16)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(event)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id, event.title)}
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
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-body">
                    Aucun événement trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-[620px] overflow-hidden rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-2xl animate-fade-up">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-indigo italic">
                {editingEvent ? "Modifier l’événement" : "Créer un événement"}
              </h3>
              <button onClick={closeModal} className="text-faint hover:text-indigo">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Titre de l’événement *</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!editingEvent) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                    }
                  }}
                  placeholder="ex: Veillée de combat spirituel"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Slug unique (URL)</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: veillee-combat-2026"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Type d’événement</span>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="ex: Conférence, Veillée, Séminaire"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Date & Heure de début *</span>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Date & Heure de fin</span>
                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Lieu / Emplacement</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="ex: Temple principal MFM Ficgayo"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Hôte / Invité</span>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="ex: Pasteur David Okonkwo"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="flex flex-col gap-2.5 justify-center">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Mise en avant</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="size-4 accent-gold cursor-pointer"
                  />
                  <span className="text-[13px] font-semibold text-indigo">Événement majeur (Hero Agenda)</span>
                </label>
              </div>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Lien URL Image d’illustration</span>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Points clés / Highlights (Un par ligne)</span>
                <textarea
                  value={highlightsInput}
                  onChange={(e) => setHighlightsInput(e.target.value)}
                  rows={2}
                  placeholder="ex: Temps fort d’intercession&#10;Entrée libre et gratuite"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold resize-none leading-relaxed"
                />
              </label>

              <label className="sm:col-span-2 flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Description exhaustive</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Objectif et descriptif complet de la rencontre..."
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
      )}
    </div>
  );
}
