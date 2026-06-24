"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Loader2, 
  Star, 
  CheckCircle, 
  AlertCircle,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  X
} from "lucide-react";
import { createEvent, updateEvent, deleteEvent, checkEventSlug, getAdminEventsPaginated, type AdminListMeta } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { assetUrl } from "@/lib/asset-url";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

export const EVENTS_PER_PAGE = 10;

/** UI sort columns → QueryMaster sortable model fields. */
const EVENT_SORT_FIELD: Record<string, string> = {
  is_featured: "is_featured",
  title: "title",
  location: "location",
  starts_at: "start_date",
};

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

const filterFields: FilterField[] = [
  { id: "title", label: "Titre", type: "text" },
  { id: "type", label: "Type", type: "text" },
  { id: "location", label: "Lieu", type: "text" },
  { id: "host", label: "Hôte", type: "text" },
  { 
    id: "is_featured", 
    label: "Mise en avant", 
    type: "select", 
    options: [
      { value: "featured", label: "Mis en avant" },
      { value: "normal", label: "Normal" }
    ] 
  }
];

export function EventsManager({
  initialEvents,
  initialMeta,
}: {
  initialEvents: Event[];
  initialMeta: AdminListMeta;
}) {
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
  const [highlightsInput, setHighlightsInput] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  // Sorting and Filtering states
  const [sortBy, setSortBy] = useState<"is_featured" | "title" | "location" | "starts_at" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(EVENTS_PER_PAGE);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const eventFilters: Record<string, string> = { ...serializeFiltersForQueryMaster(activeFilters) };
  if (eventFilters.is_featured__eq) {
    eventFilters.is_featured__eq = eventFilters.is_featured__eq === "featured" ? "1" : "0";
  }

  const {
    items: events,
    setItems: setEvents,
    meta,
    isLoading,
    refresh,
  } = useServerList<Event>({
    fetcher: getAdminEventsPaginated,
    params: {
      page,
      perPage,
      search,
      sort: sortBy && sortOrder ? { field: EVENT_SORT_FIELD[sortBy], dir: sortOrder } : null,
      filters: eventFilters,
    },
    initialData: initialEvents,
    initialMeta,
  });

  // Validation & helper states
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accent marks
      .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
      .replace(/(^-|-$)+/g, ""); // remove leading/trailing hyphens
  };

  const slugifyForInput = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accent marks
      .replace(/[^a-z0-9-]+/g, "-"); // replace non-alphanumeric (except hyphen) with hyphens, allow trailing hyphens
  };

  useEffect(() => {
    if (!slug.trim()) {
      setSlugError(null);
      return;
    }

    const cleanedSlug = slug.trim().replace(/(^-|-$)+/g, "");
    if (!cleanedSlug) {
      setSlugError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const res = await checkEventSlug(cleanedSlug, editingEvent?.id);
        if (res.exists) {
          setSlugError("Ce slug est déjà utilisé par un autre événement.");
        } else {
          setSlugError(null);
        }
      } catch (err) {
        console.error("Error checking slug uniqueness:", err);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [slug, editingEvent]);

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
    const tzoffset = nextSunday.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(nextSunday.getTime() - tzoffset)).toISOString().slice(0, 16);
    
    setStartsAt(localISOTime);
    setEndsAt("");
    setHighlightsInput("");
    setIsFeatured(false);
    
    // Clear image upload states
    setImageFile(null);
    setImagePreview("");
    setRemoveImage(false);
    
    setSlugError(null);
    setIsCheckingSlug(false);
    setStatus(null);
    
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
    setHighlightsInput(event.highlights ? event.highlights.join("\n") : "");
    setIsFeatured(event.is_featured);
    
    // Initialize image upload states
    setImageFile(null);
    setImagePreview(event.image ? (assetUrl(event.image) ?? "") : "");
    setRemoveImage(false);
    
    setSlugError(null);
    setIsCheckingSlug(false);
    setStatus(null);
    
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
    setSlugError(null);
    setIsCheckingSlug(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer l'événement "${title}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteEvent(id);
        setEvents(events.filter((e) => e.id !== id));
        refresh();
        setStatus({ type: "success", message: `L'événement "${title}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer cet événement." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !description.trim() || !location.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const highlights = highlightsInput
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("slug", slug.trim());
        fd.append("type", type || "");
        fd.append("description", description.trim());
        fd.append("location", location.trim());
        fd.append("host", host || "");
        fd.append("start_date", startsAt);
        if (endsAt) {
          fd.append("end_date", endsAt);
        }
        fd.append("is_featured", isFeatured ? "1" : "0");
        
        highlights.forEach((h, idx) => {
          fd.append(`highlights[${idx}]`, h);
        });

        if (imageFile) {
          fd.append("image", imageFile);
        }
        if (removeImage) {
          fd.append("remove_image", "1");
        }

        if (editingEvent) {
          const res = await updateEvent(editingEvent.id, fd);
          const updated = res.data as Event;
          setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
          refresh();
          setStatus({ type: "success", message: `L'événement "${title}" a été mis à jour.` });
        } else {
          const res = await createEvent(fd);
          const created = res.data as Event;
          setEvents([...events, created]);
          refresh();
          setStatus({ type: "success", message: `L'événement "${title}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    setStatus(null);
  };

  const hasActiveFilters = activeFilters.length > 0;

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setPage(1);
  };

  const handleSort = (column: "is_featured" | "title" | "location" | "starts_at") => {
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

  const renderSortChevron = (column: "is_featured" | "title" | "location" | "starts_at") => {
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
  const paginatedEvents = events;
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

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

      {/* Filter and search bar row (Set z-20 relative for correct stacking context) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap z-20 relative">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Main search bar */}
          <div className="flex flex-1 min-w-[220px] max-w-md items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
            <Search className="size-4 text-faint" />
            <input
              type="text"
              placeholder="Rechercher un événement..."
              value={search}
              onChange={handleSearchChange}
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

        {hasActiveFilters && (
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
                  onClick={() => handleSort("is_featured")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Featured</span>
                    {renderSortChevron("is_featured")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("title")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Titre / Type</span>
                    {renderSortChevron("title")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Lieu / Hôte</span>
                    {renderSortChevron("location")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("starts_at")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date de début</span>
                    {renderSortChevron("starts_at")}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paginatedEvents.map((event) => (
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

              {paginatedEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-xs text-body">
                    Aucun événement trouvé.
                  </td>
                </tr>
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
            onPageChange={(page) => {
              setPage(page);
              setStatus(null);
            }}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage);
              setPage(1);
              setStatus(null);
            }}
            itemLabel="événements"
          />
        )}
      </div>

      {/* Replaced raw backdrop and centered wrappers with native Radix Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-white border-0 outline-none">
          <div className="mb-1">
            <DialogTitle className="font-display text-xl font-bold text-indigo italic">
              {editingEvent ? "Modifier l’événement" : "Créer un événement"}
            </DialogTitle>
            <DialogDescription className="text-xs text-body mt-0.5">
              Remplissez le formulaire ci-dessous pour configurer l’événement.
            </DialogDescription>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <label className="sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Titre de l’événement *</span>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSlug(slugifyForInput(e.target.value));
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
                onChange={(e) => setSlug(slugifyForInput(e.target.value))}
                placeholder="ex: veillee-combat-2026"
                className={cn(
                  "rounded-xl border bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold",
                  slugError ? "border-live focus:border-live" : "border-[rgba(40,25,80,0.12)]"
                )}
              />
              {slugError && (
                <span className="text-xs text-live font-semibold flex items-center gap-1 mt-0.5">
                  <AlertCircle className="size-3.5" />
                  {slugError}
                </span>
              )}
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
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Lieu / Emplacement *</span>
              <input
                type="text"
                required
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

            {/* Affiche/Flyer Image Upload Field with preview & delete */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Affiche / Flyer de l'événement</span>
              {imagePreview ? (
                <div className="relative group max-w-[200px] rounded-xl overflow-hidden border border-[rgba(40,25,80,0.12)] bg-cream">
                  <img src={imagePreview} alt="Affiche" className="w-full h-auto object-cover max-h-36" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview("");
                      setRemoveImage(true);
                    }}
                    className="absolute top-2 right-2 bg-live text-white p-2 rounded-full shadow-md transition-transform hover:scale-110"
                    title="Supprimer l'affiche"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[rgba(40,25,80,0.15)] rounded-xl p-5 bg-[#faf8f4] hover:bg-cream/45 cursor-pointer transition">
                  <Plus className="size-5 text-faint mb-1" />
                  <span className="text-xs font-semibold text-indigo">Téléverser une image d'affiche</span>
                  <span className="text-[9px] text-faint mt-0.5">JPEG, PNG, WebP (max. 2 Mo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                        setRemoveImage(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>

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
              <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Description exhaustive *</span>
              <textarea
                required
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
                disabled={isPending || !!slugError || isCheckingSlug}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo transition hover:brightness-105 disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-3.5 animate-spin" />}
                Enregistrer
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
