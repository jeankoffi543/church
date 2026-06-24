"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";

import { createBranch, updateBranch, deleteBranch, getAdminBranchesPaginated, type AdminBranch, type AdminUser, type AdminListMeta } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";
import { Button } from "@/components/admin/ui/button";
import { Field } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { SearchableSelect, type SearchableOption } from "../_components/searchable-select";
import { LocationPicker } from "../_components/location-picker";

const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

const filterFields: FilterField[] = [
  { id: "title", label: "Nom du campus", type: "text" },
  { id: "address", label: "Adresse / Ville", type: "text" },
  { id: "pastor", label: "Pasteur", type: "async-select" },
];

const INPUT_CLASS = "h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 text-sm text-indigo focus-visible:border-gold";

export const BRANCHES_PER_PAGE = 10;

/** UI column id → QueryMaster sortable field (pastor is a relation, not sortable). */
const BRANCH_SORT_FIELD: Record<string, string | undefined> = {
  title: "title",
  address: "address",
  pastor: undefined,
};

export function BranchesManager({
  initialBranches,
  initialMeta,
  users,
}: {
  initialBranches: AdminBranch[];
  initialMeta: AdminListMeta;
  users: AdminUser[];
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<AdminBranch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBranch | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [website, setWebsite] = useState("");
  const [pastorId, setPastorId] = useState<number | null>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setAddress("");
    setPhone("");
    setHours("");
    setLat("");
    setLng("");
    setWebsite("");
    setPastorId(null);
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (b: AdminBranch) => {
    setEditingBranch(b);
    setTitle(b.title);
    setSlug(b.slug);
    setDescription(b.description ?? "");
    setAddress(b.address);
    setPhone(b.phone);
    setHours(b.hours);
    setLat(b.lat ? String(b.lat) : "");
    setLng(b.lng ? String(b.lng) : "");
    setWebsite(b.website ?? "");
    setPastorId(b.pastor_id);
    setIsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingBranch) setSlug(slugify(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !address.trim() || !phone.trim() || !hours.trim() || !lat.trim() || !lng.trim()) {
      setStatus({ type: "error", message: "Veuillez remplir tous les champs obligatoires." });
      return;
    }

    const payload: Partial<AdminBranch> = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      address: address.trim(),
      phone: phone.trim(),
      hours: hours.trim(),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      website: website.trim() || null,
      pastor_id: pastorId,
    };

    if (isNaN(payload.lat!) || isNaN(payload.lng!)) {
      setStatus({ type: "error", message: "Les coordonnées géographiques doivent être des nombres valides." });
      return;
    }

    startTransition(async () => {
      try {
        if (editingBranch) {
          const res = await updateBranch(editingBranch.id, payload);
          setBranches((prev) => prev.map((item) => (item.id === editingBranch.id ? res.data : item)));
          table.refresh();
          setStatus({ type: "success", message: "La branche a été mise à jour avec succès." });
        } else {
          const res = await createBranch(payload);
          setBranches((prev) => [...prev, res.data]);
          table.refresh();
          setStatus({ type: "success", message: "La branche a été créée avec succès." });
        }
        setIsModalOpen(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Une erreur est survenue." });
      }
    });
  };

  const confirmDelete = () => {
    const b = deleteTarget;
    if (!b) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteBranch(b.id);
        setBranches((prev) => prev.filter((item) => item.id !== b.id));
        table.refresh();
        setStatus({ type: "success", message: "La branche a été supprimée." });
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const userOptions = useMemo<SearchableOption[]>(
    () => users.map((u) => ({ value: u.id, label: u.name, sublabel: u.email })),
    [users],
  );

  const columns: Column<AdminBranch>[] = [
    {
      id: "title",
      header: "Nom / Ville",
      sortable: true,
      sortValue: (b) => b.title,
      cell: (b) => (
        <div>
          <span className="block text-base font-bold">{b.title}</span>
          <span className="block font-mono text-xs text-faint">/{b.slug}</span>
        </div>
      ),
    },
    {
      id: "address",
      header: "Adresse",
      sortable: true,
      sortValue: (b) => b.address,
      cell: (b) => <span className="block max-w-xs truncate text-xs leading-relaxed text-indigo">{b.address}</span>,
    },
    {
      id: "pastor",
      header: "Pasteur Résident",
      sortable: true,
      sortValue: (b) => b.pastor?.name ?? "",
      cell: (b) =>
        b.pastor ? (
          <div>
            <span className="block text-xs font-semibold">{b.pastor.name}</span>
            <span className="block text-[10px] text-faint">{b.pastor.email}</span>
          </div>
        ) : (
          <span className="text-xs italic text-faint">Non assigné</span>
        ),
    },
    {
      id: "hours",
      header: "Horaires cultes",
      cell: (b) => <span className="text-xs">{b.hours}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (b) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEditModal(b)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] bg-white text-indigo transition hover:bg-cream/40"
            title="Modifier"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => setDeleteTarget(b)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-faint transition hover:bg-red-50 hover:text-live"
            title="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const table = useServerDataTable<AdminBranch>({
    fetcher: getAdminBranchesPaginated,
    initialData: initialBranches,
    initialMeta,
    initialPerPage: BRANCHES_PER_PAGE,
    sortFieldMap: BRANCH_SORT_FIELD,
  });
  const setBranches = table.setItems;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Gestion territoriale"
        title="Campus & Extensions"
        subtitle={`${table.total} site${table.total > 1 ? "s" : ""} · gérez les campus principaux, les extensions régionales et les pasteurs résidents.`}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreateModal}>
            Nouveau campus / extension
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher par nom, adresse, pasteur…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
        asyncOptions={{ pastor: userOptions }}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(b) => b.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        empty={
          <div className="flex flex-col items-center gap-2 py-6">
            <MapPin className="size-8 text-faint" />
            <p className="text-sm font-semibold text-indigo">Aucun campus/extension trouvé</p>
          </div>
        }
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
          itemLabel: "campus / extensions",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer la branche ?"
        message={`« ${deleteTarget?.title ?? ""} » sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingBranch ? "Modifier le campus" : "Créer un nouveau campus / extension"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom du campus / extension" required>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Ex: Siège régional de Yopougon" className={INPUT_CLASS} required />
            </Field>
            <Field label="Slug unique" required>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="Ex: siege-regional-yopougon" className={`${INPUT_CLASS} font-mono`} required />
            </Field>
          </div>

          <Field label="Description descriptive" required>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez brièvement la branche, son historique ou sa vocation..."
              rows={3}
              className="rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3 text-sm text-indigo focus-visible:border-gold"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Téléphone de contact" required>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex: +225 07 00 00 00 00" className={INPUT_CLASS} required />
            </Field>
            <Field label="Horaires des cultes" required>
              <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Ex: Dimanche 09h00 · Mardi 18h30" className={INPUT_CLASS} required />
            </Field>
          </div>

          <Field label="Site Internet (Optionnel)">
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Ex: https://mfm-ficgayo.ci" className={INPUT_CLASS} />
          </Field>

          <LocationPicker
            value={{ address, latitude: lat ? parseFloat(lat) : null, longitude: lng ? parseFloat(lng) : null, zone: null }}
            onChange={(next) => {
              setAddress(next.address);
              setLat(next.latitude !== null ? String(next.latitude) : "");
              setLng(next.longitude !== null ? String(next.longitude) : "");
            }}
          />

          <Field label="Pasteur Résident">
            <SearchableSelect
              options={userOptions}
              value={pastorId}
              onChange={setPastorId}
              placeholder="Rechercher et associer un pasteur..."
              clearable={true}
              clearLabel="— Aucun Pasteur —"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.06)] pt-4">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" size="sm" loading={isPending}>
              {editingBranch ? "Enregistrer" : "Créer la branche"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
