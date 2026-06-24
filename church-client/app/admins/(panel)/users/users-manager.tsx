"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Mail, ShieldCheck, Users as UsersIcon } from "lucide-react";

import type { AdminServant, AdminListMeta } from "@/lib/admin-api";
import { createServant, updateServant, deleteServant, getServantsPaginated } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { serializeFiltersForQueryMaster, type FilterField } from "@/components/admin/query-builder";
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
import { MultiSelect } from "../_components/multi-select";
import { groupStyle } from "../_components/group-style";

type FormState = {
  name: string;
  email: string;
  password: string;
  is_active: boolean;
  roles: string[];
};

const EMPTY_FORM: FormState = { name: "", email: "", password: "", is_active: true, roles: [] };

export const USERS_PER_PAGE = 10;

/** UI column id → QueryMaster sortable field (roles is a relation, not sortable). */
const SERVANT_SORT_FIELD: Record<string, string | undefined> = {
  name: "name",
  is_active: "is_active",
  roles: undefined,
};

export function UsersManager({
  initialServants,
  initialMeta,
  roleNames,
  currentUserId,
}: {
  initialServants: AdminServant[];
  initialMeta: AdminListMeta;
  roleNames: string[];
  currentUserId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServant | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminServant | null>(null);

  const filterFields: FilterField[] = [
    { id: "name", label: "Nom", type: "text" },
    { id: "email", label: "Email", type: "text" },
    { id: "role", label: "Département", type: "select", options: roleNames.map((role) => ({ value: role, label: role })) },
    {
      id: "is_active",
      label: "Statut",
      type: "select",
      options: [
        { value: "active", label: "Actif" },
        { value: "suspended", label: "Suspendu" },
      ],
    },
  ];

  const patchForm = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setStatus(null);
    setModalOpen(true);
  };

  const openEdit = (servant: AdminServant) => {
    setEditing(servant);
    setForm({ name: servant.name, email: servant.email, password: "", is_active: servant.is_active, roles: servant.roles });
    setStatus(null);
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setStatus({ type: "error", message: "Le nom et l'email sont requis." });
      return;
    }
    if (!editing && !form.password.trim()) {
      setStatus({ type: "error", message: "Un mot de passe est requis pour un nouveau serviteur." });
      return;
    }

    startTransition(async () => {
      try {
        if (editing) {
          const res = await updateServant(editing.id, {
            name: form.name.trim(),
            email: form.email.trim(),
            is_active: form.is_active,
            roles: form.roles,
            ...(form.password.trim() ? { password: form.password.trim() } : {}),
          });
          setServants((prev) => prev.map((s) => (s.id === editing.id ? res.data : s)));
          table.refresh();
          setStatus({ type: "success", message: "Serviteur mis à jour." });
        } else {
          const res = await createServant({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
            is_active: form.is_active,
            roles: form.roles,
          });
          setServants((prev) => [...prev, res.data]);
          table.refresh();
          setStatus({ type: "success", message: "Serviteur ajouté." });
        }
        setModalOpen(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Opération impossible." });
      }
    });
  };

  const handleToggleActive = (servant: AdminServant) => {
    const next = !servant.is_active;
    setServants((prev) => prev.map((s) => (s.id === servant.id ? { ...s, is_active: next } : s)));
    startTransition(async () => {
      try {
        const res = await updateServant(servant.id, { is_active: next });
        setServants((prev) => prev.map((s) => (s.id === servant.id ? res.data : s)));
        table.refresh();
        setStatus({ type: "success", message: next ? "Accès réactivé." : "Accès suspendu." });
      } catch (err) {
        setServants((prev) => prev.map((s) => (s.id === servant.id ? servant : s)));
        setStatus({ type: "error", message: (err as Error).message || "Impossible de changer le statut." });
      }
    });
  };

  const confirmDelete = () => {
    const servant = deleteTarget;
    if (!servant) return;
    setDeleteTarget(null);
    setServants((prev) => prev.filter((s) => s.id !== servant.id));
    startTransition(async () => {
      try {
        await deleteServant(servant.id);
        table.refresh();
        setStatus({ type: "success", message: "Serviteur supprimé." });
      } catch (err) {
        setServants((prev) => [...prev, servant].sort((a, b) => a.name.localeCompare(b.name)));
        setStatus({ type: "error", message: (err as Error).message || "Suppression impossible." });
      }
    });
  };

  const columns: Column<AdminServant>[] = [
    {
      id: "name",
      header: "Serviteur",
      sortable: true,
      sortValue: (s) => s.name,
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-sm font-bold text-indigo">
            {s.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="flex items-center gap-1.5 font-semibold">
              {s.name}
              {s.id === currentUserId && (
                <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-dark uppercase">Vous</span>
              )}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-faint">
              <Mail className="size-3" />
              {s.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "roles",
      header: "Départements",
      sortable: true,
      sortValue: (s) => s.roles.join(", "),
      cell: (s) => (
        <div className="flex flex-wrap gap-1.5">
          {s.roles.length === 0 && <span className="text-xs italic text-faint">Aucun</span>}
          {s.roles.map((role) => {
            const style = groupStyle(role);
            return (
              <span
                key={role}
                className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset", style.bg, style.text, style.ring)}
              >
                {role === "Super Admin" && <ShieldCheck className="size-3" />}
                <span className={cn("size-1.5 rounded-full", style.dot)} />
                {role}
              </span>
            );
          })}
        </div>
      ),
    },
    {
      id: "is_active",
      header: "Accès",
      sortable: true,
      sortValue: (s) => (s.is_active ? "active" : "inactive"),
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <Switch
            checked={s.is_active}
            disabled={s.id === currentUserId || isPending}
            onCheckedChange={() => handleToggleActive(s)}
            label={`Accès de ${s.name}`}
          />
          <span className={cn("text-[11px] font-bold", s.is_active ? "text-online" : "text-faint")}>
            {s.is_active ? "Actif" : "Suspendu"}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (s) => {
        const isSelf = s.id === currentUserId;
        return (
          <div className="flex items-center justify-end gap-1">
            <button onClick={() => openEdit(s)} className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo" title="Modifier">
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(s)}
              disabled={isSelf}
              className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live disabled:cursor-not-allowed disabled:opacity-30"
              title={isSelf ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      },
    },
  ];

  const table = useServerDataTable<AdminServant>({
    fetcher: getServantsPaginated,
    initialData: initialServants,
    initialMeta,
    initialPerPage: USERS_PER_PAGE,
    sortFieldMap: SERVANT_SORT_FIELD,
    buildFilters: (filters) => {
      const f = { ...serializeFiltersForQueryMaster(filters) };
      // The "Statut" <select> ships "active"/"suspended" — map to 1/0.
      if (f.is_active__eq) f.is_active__eq = f.is_active__eq === "active" ? "1" : "0";
      return f;
    },
  });
  const setServants = table.setItems;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Serviteurs"
        title="Comptes & Accès"
        subtitle={`${table.total} compte${table.total > 1 ? "s" : ""} · gérez les serviteurs et leurs départements.`}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            Nouveau serviteur
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      <DataFilters
        search={table.search}
        onSearch={table.setSearch}
        placeholder="Rechercher par nom ou email…"
        fields={filterFields}
        filters={table.filters}
        onFilters={table.setFilters}
        onReset={table.resetFilters}
      />

      <DataTable
        columns={columns}
        rows={table.view}
        getKey={(s) => s.id}
        sortBy={table.sortBy}
        sortDir={table.sortDir}
        onSort={table.toggleSort}
        empty={
          <div className="flex flex-col items-center gap-3 py-6">
            <UsersIcon className="size-10 text-gold/40" />
            <p className="text-sm font-semibold text-body-strong">Aucun serviteur trouvé</p>
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
          itemLabel: "serviteurs",
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer le serviteur ?"
        message={`Le compte de « ${deleteTarget?.name ?? ""} » sera définitivement supprimé.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? "Modifier le serviteur" : "Nouveau serviteur"}>
        <div className="space-y-5 px-6 py-6">
          <Field label="Nom complet">
            <input type="text" value={form.name} onChange={(e) => patchForm({ name: e.target.value })} placeholder="Ex : Frère Jean Koffi" className={inputClass} />
          </Field>
          <Field label="Adresse email">
            <input type="email" value={form.email} onChange={(e) => patchForm({ email: e.target.value })} placeholder="serviteur@mfm-ficgayo.ci" className={inputClass} />
          </Field>
          <Field label="Mot de passe" hint={editing ? "Laisser vide pour conserver l'actuel." : undefined}>
            <input
              type="password"
              value={form.password}
              onChange={(e) => patchForm({ password: e.target.value })}
              placeholder="••••••••"
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <Field label="Départements">
            <MultiSelect options={roleNames} selected={form.roles} onChange={(roles) => patchForm({ roles })} />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream/50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-indigo">Accès autorisé</p>
              <p className="text-xs text-body">Désactivez pour suspendre la connexion de ce serviteur.</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => patchForm({ is_active: v })} label="Accès autorisé" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button type="button" size="sm" loading={isPending} onClick={handleSubmit}>
            {editing ? "Enregistrer" : "Créer le serviteur"}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
