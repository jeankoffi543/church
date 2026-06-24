"use client";

import { useState, useTransition, useEffect } from "react";
import { Plus, Edit, Trash2, Star } from "lucide-react";

import { createEvent, updateEvent, deleteEvent, checkEventSlug } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { assetUrl } from "@/lib/asset-url";
import type { FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { useDataTable, type Column } from "@/components/admin/data/use-data-table";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

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
      { value: "normal", label: "Normal" },
    ],
  },
];

const slugifyForInput = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]+/g, "-");

export function EventsManager({ initialEvents }: { initialEvents: Event[] }) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [removeImage, setRemoveImage] = useState(false);

  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);

  useEffect(() => {
    const cleanedSlug = slug.trim().replace(/(^-|-$)+/g, "");
    // All state updates run inside the debounce, never synchronously in the
    // effect body (avoids cascading-render lint + needless work).
    const timer = setTimeout(async () => {
      if (!cleanedSlug) {
        setSlugError(null);
        return;
      }
      setIsCheckingSlug(true);
      try {
        const res = await checkEventSlug(cleanedSlug, editingEvent?.id);
        setSlugError(res.exists ? "Ce slug est déjà utilisé par un autre événement." : null);
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
    const nextSunday = new Date(now.setDate(now.getDate() + ((7 - now.getDay()) % 7)));
    nextSunday.setHours(9, 0, 0, 0);
    const tzoffset = nextSunday.getTimezoneOffset() * 60000;
    setStartsAt(new Date(nextSunday.getTime() - tzoffset).toISOString().slice(0, 16));
    setEndsAt("");
    setHighlightsInput("");
    setIsFeatured(false);
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

    const formatDateTime = (dtStr: string | null) => {
      if (!dtStr) return "";
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return "";
      const tzoffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
    };

    setStartsAt(formatDateTime(event.starts_at));
    setEndsAt(formatDateTime(event.ends_at));
    setHighlightsInput(event.highlights ? event.highlights.join("\n") : "");
    setIsFeatured(event.is_featured);
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

  const confirmDelete = () => {
    const ev = deleteTarget;
    if (!ev) return;
    setDeleteTarget(null);
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteEvent(ev.id);
        setEvents((prev) => prev.filter((e) => e.id !== ev.id));
        setStatus({ type: "success", message: `L'événement "${ev.title}" a été supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible de supprimer cet événement." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startsAt || !description.trim() || !location.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const highlights = highlightsInput.split("\n").map((line) => line.trim()).filter(Boolean);

        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("slug", slug.trim());
        fd.append("type", type || "");
        fd.append("description", description.trim());
        fd.append("location", location.trim());
        fd.append("host", host || "");
        fd.append("start_date", startsAt);
        if (endsAt) fd.append("end_date", endsAt);
        fd.append("is_featured", isFeatured ? "1" : "0");
        highlights.forEach((h, idx) => fd.append(`highlights[${idx}]`, h));
        if (imageFile) fd.append("image", imageFile);
        if (removeImage) fd.append("remove_image", "1");

        if (editingEvent) {
          const res = await updateEvent(editingEvent.id, fd);
          const updated = res.data as Event;
          setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          setStatus({ type: "success", message: `L'événement "${title}" a été mis à jour.` });
        } else {
          const res = await createEvent(fd);
          const created = res.data as Event;
          setEvents((prev) => [...prev, created]);
          setStatus({ type: "success", message: `L'événement "${title}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const columns: Column<Event>[] = [
    {
      id: "is_featured",
      header: "Featured",
      sortable: true,
      sortValue: (e) => (e.is_featured ? 1 : 0),
      cell: (e) =>
        e.is_featured ? (
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-gold/20 text-gold-dark" title="Mis en avant">
            <Star className="size-4 fill-gold-dark" />
          </span>
        ) : (
          <span className="font-semibold text-faint/30">—</span>
        ),
    },
    {
      id: "title",
      header: "Titre / Type",
      sortable: true,
      sortValue: (e) => e.title,
      cell: (e) => (
        <div>
          <p className="font-semibold">{e.title}</p>
          {e.type && <p className="mt-0.5 text-xs font-medium tracking-wider text-gold-dark uppercase">{e.type}</p>}
        </div>
      ),
    },
    {
      id: "location",
      header: "Lieu / Hôte",
      sortable: true,
      sortValue: (e) => e.location ?? "",
      cell: (e) => (
        <div className="text-xs">
          <p className="font-semibold text-indigo">{e.location ?? "—"}</p>
          {e.host && <p className="text-faint">{e.host}</p>}
        </div>
      ),
    },
    {
      id: "starts_at",
      header: "Date de début",
      sortable: true,
      sortValue: (e) => e.starts_at,
      className: "font-mono text-xs font-semibold text-faint",
      cell: (e) => e.starts_at.replace("T", " ").substring(0, 16),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (e) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEditModal(e)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo transition-colors hover:border-gold hover:bg-gold/5"
            title="Modifier"
          >
            <Edit className="size-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(e)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live transition-colors hover:bg-live/10"
            title="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const table = useDataTable({
    rows: events,
    columns,
    searchKeys: [(e) => e.title, (e) => e.type, (e) => e.location],
    filterAccessors: {
      title: (e) => e.title,
      type: (e) => e.type,
      location: (e) => e.location,
      host: (e) => e.host,
    },
    matchFilters: { is_featured: (e, f) => f.value === "" || e.is_featured === (f.value === "featured") },
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Ressources"
        title="Gestion de l’Agenda"
        subtitle="Gérez les cultes spéciaux, conférences, séminaires et veillées de l’église."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreateModal}>
            Nouvel Événement
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher un événement…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(e) => e.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        emptyLabel="Aucun événement trouvé."
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
          itemLabel: "événements",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer l’événement ?"
        message={`L'événement « ${deleteTarget?.title ?? ""} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal
        open={isModalOpen}
        onOpenChange={(o) => (o ? setIsModalOpen(true) : closeModal())}
        title={editingEvent ? "Modifier l’événement" : "Créer un événement"}
        description="Remplissez le formulaire ci-dessous pour configurer l’événement."
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Titre de l’événement" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSlug(slugifyForInput(e.target.value));
              }}
              placeholder="ex: Veillée de combat spirituel"
              className={inputClass}
            />
          </Field>

          <Field label="Slug unique (URL)" required error={slugError ?? undefined}>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(slugifyForInput(e.target.value))}
              placeholder="ex: veillee-combat-2026"
              className={cn(inputClass, slugError && "border-live focus:border-live")}
            />
          </Field>

          <Field label="Type d’événement">
            <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="ex: Conférence, Veillée, Séminaire" className={inputClass} />
          </Field>

          <Field label="Date & Heure de début" required>
            <input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
          </Field>

          <Field label="Date & Heure de fin">
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
          </Field>

          <Field label="Lieu / Emplacement" required>
            <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ex: Temple principal MFM Ficgayo" className={inputClass} />
          </Field>

          <Field label="Hôte / Invité">
            <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="ex: Pasteur David Okonkwo" className={inputClass} />
          </Field>

          <Field label="Mise en avant">
            <label className="flex h-[42px] cursor-pointer items-center gap-2">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="size-4 cursor-pointer accent-gold" />
              <span className="text-[13px] font-semibold text-indigo">Événement majeur (Hero Agenda)</span>
            </label>
          </Field>

          <Field className="sm:col-span-2" label="Affiche / Flyer de l'événement">
            {imagePreview ? (
              <div className="group relative max-w-[200px] overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Affiche" className="h-auto max-h-36 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                    setRemoveImage(true);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-live p-2 text-white shadow-md transition-transform hover:scale-110"
                  title="Supprimer l'affiche"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[rgba(40,25,80,0.15)] bg-cream p-5 transition hover:bg-cream/45">
                <Plus className="mb-1 size-5 text-faint" />
                <span className="text-xs font-semibold text-indigo">Téléverser une image d’affiche</span>
                <span className="mt-0.5 text-[9px] text-faint">JPEG, PNG, WebP (max. 2 Mo)</span>
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
          </Field>

          <Field className="sm:col-span-2" label="Points clés / Highlights (Un par ligne)">
            <textarea
              value={highlightsInput}
              onChange={(e) => setHighlightsInput(e.target.value)}
              rows={2}
              placeholder={"ex: Temps fort d’intercession\nEntrée libre et gratuite"}
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
          </Field>

          <Field className="sm:col-span-2" label="Description exhaustive" required>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Objectif et descriptif complet de la rencontre..."
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4 sm:col-span-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isPending} disabled={!!slugError || isCheckingSlug}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
