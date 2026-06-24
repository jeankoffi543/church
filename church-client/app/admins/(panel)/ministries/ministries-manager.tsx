"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, X, Eye, EyeOff, ImagePlus } from "lucide-react";

import { createMinistry, updateMinistry, deleteMinistry } from "@/lib/admin-api";
import type { AdminMinistry, AdminUser } from "@/lib/admin-api";
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
import { SearchableSelect } from "../_components/searchable-select";

type Ministry = AdminMinistry;

const filterFields: FilterField[] = [
  { id: "name", label: "Nom", type: "text" },
  { id: "chef", label: "Chef du ministère", type: "async-select" },
  { id: "schedule", label: "Programme / Horaires", type: "text" },
  {
    id: "is_active",
    label: "Statut",
    type: "select",
    options: [
      { value: "active", label: "Actif" },
      { value: "inactive", label: "Inactif" },
    ],
  },
];

export function MinistriesManager({
  initialMinistries,
  staff,
}: {
  initialMinistries: Ministry[];
  staff: AdminUser[];
}) {
  const [ministries, setMinistries] = useState<Ministry[]>(initialMinistries);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ministry | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [chefId, setChefId] = useState<number | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const staffOptions = staff.map((u) => ({ value: u.id, label: u.name, sublabel: u.email }));

  const resetImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(false);
  };

  const handlePickImage = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const currentImageSrc = imagePreview ?? (!removeImage && editingMinistry?.image ? assetUrl(editingMinistry.image) : null);

  const openCreateModal = () => {
    setEditingMinistry(null);
    setName("");
    setDescription("");
    setSchedule("");
    setFormSortOrder(0);
    setIsActive(true);
    setChefId(null);
    resetImage();
    setIsModalOpen(true);
  };

  const openEditModal = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setName(ministry.name);
    setDescription(ministry.description ?? "");
    setSchedule(ministry.schedule ?? "");
    setFormSortOrder(ministry.sort_order);
    setIsActive(ministry.is_active);
    setChefId(ministry.chef_id);
    resetImage();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMinistry(null);
  };

  const confirmDelete = () => {
    const m = deleteTarget;
    if (!m) return;
    setDeleteTarget(null);
    setStatus(null);
    startTransition(async () => {
      try {
        await deleteMinistry(m.id);
        setMinistries((prev) => prev.filter((x) => x.id !== m.id));
        setStatus({ type: "success", message: `Le ministère "${m.name}" a été supprimé.` });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Impossible de supprimer ce ministère." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        const payload = {
          name,
          description: description || null,
          schedule: schedule || null,
          sort_order: Number(formSortOrder),
          is_active: isActive,
          chef_id: chefId,
        };

        if (editingMinistry) {
          const res = await updateMinistry(editingMinistry.id, payload, imageFile, removeImage);
          const updated = res.data as Ministry;
          setMinistries((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          setStatus({ type: "success", message: `Le ministère "${name}" a été mis à jour.` });
        } else {
          const res = await createMinistry({ ...payload, name }, imageFile);
          const created = res.data as Ministry;
          setMinistries((prev) => [...prev, created]);
          setStatus({ type: "success", message: `Le ministère "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const columns: Column<Ministry>[] = [
    {
      id: "sort_order",
      header: "Ordre",
      className: "font-mono text-xs font-semibold text-faint",
      cell: (m) => m.sort_order,
    },
    {
      id: "name",
      header: "Nom",
      sortable: true,
      sortValue: (m) => m.name,
      cell: (m) => (
        <div>
          <p className="font-semibold">{m.name}</p>
          {m.description && <p className="mt-0.5 line-clamp-1 text-xs text-body">{m.description}</p>}
        </div>
      ),
    },
    {
      id: "chef",
      header: "Chef",
      sortable: true,
      sortValue: (m) => m.chef?.name ?? "",
      cell: (m) =>
        m.chef ? (
          <span className="inline-flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-[10px] font-bold text-indigo">
              {m.chef.name.charAt(0).toUpperCase()}
            </span>
            <span className="text-xs font-semibold text-indigo">{m.chef.name}</span>
          </span>
        ) : (
          <span className="text-xs italic text-faint">Non assigné</span>
        ),
    },
    {
      id: "schedule",
      header: "Programme / Horaires",
      sortable: true,
      sortValue: (m) => m.schedule ?? "",
      className: "text-xs font-medium text-body-soft",
      cell: (m) => m.schedule ?? "—",
    },
    {
      id: "is_active",
      header: "Statut",
      sortable: true,
      sortValue: (m) => (m.is_active ? 1 : 0),
      cell: (m) =>
        m.is_active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-online/10 px-2.5 py-1 text-xs font-bold text-online">
            <Eye className="size-3" /> Actif
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
            <EyeOff className="size-3" /> Inactif
          </span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (m) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => openEditModal(m)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo transition-colors hover:border-gold hover:bg-gold/5"
            title="Modifier"
          >
            <Edit className="size-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(m)}
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
    rows: ministries,
    columns,
    searchKeys: [(m) => m.name, (m) => m.description],
    filterAccessors: { name: (m) => m.name, schedule: (m) => m.schedule },
    matchFilters: {
      chef: (m, f) => f.value === "" || m.chef_id === Number(f.value),
      is_active: (m, f) => f.value === "" || m.is_active === (f.value === "active"),
    },
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Ressources"
        title="Gestion des Ministères"
        subtitle="Gérez la liste des départements, services et pôles d’activité de la Maison."
        actions={
          <>
            <Link
              href="/admins/ministries/applications"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[rgba(40,25,80,0.12)] bg-white px-5 py-2.5 text-sm font-bold text-body transition hover:bg-cream"
            >
              Voir les Candidatures
            </Link>
            <Button icon={<Plus className="size-4" />} onClick={openCreateModal}>
              Nouveau Ministère
            </Button>
          </>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher un ministère…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
        asyncOptions={{ chef: staffOptions }}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(m) => m.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        emptyLabel="Aucun ministère trouvé."
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
          itemLabel: "ministères",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer le ministère ?"
        message={`Le ministère « ${deleteTarget?.name ?? ""} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal open={isModalOpen} onOpenChange={(o) => (o ? setIsModalOpen(true) : closeModal())} title={editingMinistry ? "Modifier le ministère" : "Créer un ministère"} size="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-6">
          <Field label="Nom du ministère" required>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Département Jeunesse" className={inputClass} />
          </Field>

          <Field label="Programme / Horaires">
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="ex: Samedi 16:00 · Salle Polyvalente" className={inputClass} />
          </Field>

          <Field label="Chef du ministère">
            <SearchableSelect options={staffOptions} value={chefId} onChange={setChefId} placeholder="Assigner un responsable…" clearLabel="— Aucun chef —" />
          </Field>

          <Field label="Image du ministère">
            {currentImageSrc ? (
              <div className="relative overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentImageSrc} alt="Aperçu du ministère" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-2 right-2 flex size-7 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white backdrop-blur-sm transition hover:bg-live"
                  title="Retirer l'image"
                >
                  <X className="size-4" />
                </button>
                <label className="absolute right-2 bottom-2 cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-indigo shadow-sm backdrop-blur-sm transition hover:bg-white">
                  Changer
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            ) : (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(40,25,80,0.25)] bg-cream text-center transition hover:border-gold hover:bg-gold/5">
                <span className="flex size-11 items-center justify-center rounded-full bg-indigo/5 text-indigo">
                  <ImagePlus className="size-5" />
                </span>
                <span className="text-[13px] font-bold text-indigo">Importer une image</span>
                <span className="text-[11px] text-faint">JPG, PNG ou WEBP · max 4 Mo</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handlePickImage(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ordre d’affichage">
              <input type="number" min={0} value={formSortOrder} onChange={(e) => setFormSortOrder(Number(e.target.value))} className={inputClass} />
            </Field>
            <Field label="Visibilité public">
              <label className="flex h-[42px] cursor-pointer items-center gap-2">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="size-4 cursor-pointer accent-gold" />
                <span className="text-[13px] font-semibold text-indigo">Afficher sur le site</span>
              </label>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Objectif et activités du ministère..."
              className={cn(inputClass, "resize-none leading-relaxed")}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
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
