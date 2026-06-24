"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle, Save, ShieldCheck, Plus, Pencil, Trash2, Users, Lock, ArrowLeftRight, Info } from "lucide-react";

import type { AdminRole, AdminPermissionCategory } from "@/lib/admin-api";
import {
  createRole,
  updateRole,
  deleteRole,
  syncRolePermissions,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { groupStyle } from "../_components/group-style";
import { Pagination } from "../_components/pagination";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { Field, inputClass } from "@/components/admin/ui/field";
import { Modal } from "@/components/admin/ui/modal";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

const SUPER_ADMIN = "Super Admin";

/** Compact column headers for the matrix, keyed by permission name. */
const SHORT_LABELS: Record<string, string> = {
  manage_settings: "Paramètres",
  manage_sermons: "Messages",
  manage_events: "Agenda",
  manage_access: "Accès",
  view_dashboard: "Vue",
  view_statistics: "Stats",
  manage_live: "Live",
  view_prayers: "Voir",
  process_prayers: "Traiter",
  manage_prayer_settings: "Config",
  view_cells: "Voir",
  process_cells: "Traiter",
  validate_home_group_applications: "Valider dmd",
  manage_ministries: "Ministères",
  view_offerings: "Voir",
  manage_offerings: "Gérer",
  send_notifications: "Envoyer",
  manage_announcements: "Annonces",
  moderate_comments: "Modérer",
  manage_testimonies: "Témoignages",
  validate_ministry_applications: "Candidatures",
};

export function RolesManager({
  initialRoles,
  catalog,
}: {
  initialRoles: AdminRole[];
  catalog: AdminPermissionCategory[];
}) {
  const [roles, setRoles] = useState<AdminRole[]>(initialRoles);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);

  // Matrix working copy: roleId -> Set<permissionName>. Tracks unsaved edits.
  const [matrix, setMatrix] = useState<Record<number, Set<string>>>(() =>
    Object.fromEntries(initialRoles.map((r) => [r.id, new Set(r.permissions)]))
  );

  // Modal state for create / rename.
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [roleName, setRoleName] = useState("");

  // Pagination for the groups summary (the matrix below shows every group).
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles]
  );
  const pageCount = Math.max(1, Math.ceil(sortedRoles.length / perPage));
  // Clamp during render so the page stays valid when groups are removed.
  const currentPage = Math.min(page, pageCount);
  const pagedRoles = sortedRoles.slice((currentPage - 1) * perPage, currentPage * perPage);

  const flatPermissions = useMemo(
    () => catalog.flatMap((c) => c.permissions.map((p) => p.name)),
    [catalog]
  );

  const dirty = useMemo(() => {
    return roles.some((role) => {
      const current = matrix[role.id] ?? new Set<string>();
      const original = new Set(role.permissions);
      if (current.size !== original.size) return true;
      for (const p of current) if (!original.has(p)) return true;
      return false;
    });
  }, [roles, matrix]);

  const isSuperAdmin = (name: string) => name === SUPER_ADMIN;

  const toggleCell = (roleId: number, permission: string) => {
    setStatus(null);
    setMatrix((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return { ...prev, [roleId]: next };
    });
  };

  const toggleWholeRole = (role: AdminRole, on: boolean) => {
    setStatus(null);
    setMatrix((prev) => ({
      ...prev,
      [role.id]: on ? new Set(flatPermissions) : new Set(),
    }));
  };

  /* ── Persist the entire matrix ─────────────────────────────────── */

  const handleSaveMatrix = () => {
    startTransition(async () => {
      try {
        const changed = roles.filter((role) => {
          if (isSuperAdmin(role.name)) return false;
          const current = matrix[role.id] ?? new Set<string>();
          const original = new Set(role.permissions);
          if (current.size !== original.size) return true;
          for (const p of current) if (!original.has(p)) return true;
          return false;
        });

        const results = await Promise.all(
          changed.map((role) =>
            syncRolePermissions(role.id, Array.from(matrix[role.id] ?? []))
          )
        );

        setRoles((prev) =>
          prev.map((r) => {
            const updated = results.find((res) => res.data.id === r.id);
            return updated ? updated.data : r;
          })
        );
        setStatus({
          type: "success",
          message:
            changed.length === 0
              ? "Aucune modification à enregistrer."
              : `Privilèges enregistrés pour ${changed.length} groupe(s).`,
        });
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Impossible d'enregistrer les privilèges.",
        });
      }
    });
  };

  /* ── Group create / rename / delete ────────────────────────────── */

  const openCreate = () => {
    setEditingRole(null);
    setRoleName("");
    setStatus(null);
    setModalOpen(true);
  };

  const openRename = (role: AdminRole) => {
    setEditingRole(role);
    setRoleName(role.name);
    setStatus(null);
    setModalOpen(true);
  };

  const handleSubmitRole = () => {
    const name = roleName.trim();
    if (!name) return;

    startTransition(async () => {
      try {
        if (editingRole) {
          const res = await updateRole(editingRole.id, { name });
          setRoles((prev) =>
            prev.map((r) => (r.id === editingRole.id ? res.data : r))
          );
          setStatus({ type: "success", message: "Groupe renommé." });
        } else {
          const res = await createRole({ name });
          setRoles((prev) => [...prev, res.data]);
          setMatrix((prev) => ({ ...prev, [res.data.id]: new Set() }));
          setStatus({ type: "success", message: "Groupe créé." });
        }
        setModalOpen(false);
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Opération impossible.",
        });
      }
    });
  };

  const confirmDelete = () => {
    const role = deleteTarget;
    if (!role) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteRole(role.id);
        setRoles((prev) => prev.filter((r) => r.id !== role.id));
        setMatrix((prev) => {
          const next = { ...prev };
          delete next[role.id];
          return next;
        });
        setStatus({ type: "success", message: "Groupe supprimé." });
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Suppression impossible.",
        });
      }
    });
  };

  /* ── Render ────────────────────────────────────────────────────── */

  const totalPermissions = flatPermissions.length;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sécurité & accès"
        title="Groupes & Départements"
        subtitle={`${roles.length} groupe${roles.length > 1 ? "s" : ""} · définissez les départements de l'église et distribuez leurs privilèges.`}
        actions={
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            Nouveau groupe
          </Button>
        }
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Groups summary */}
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pagedRoles.map((role) => {
          const style = groupStyle(role.name);
          const count = (matrix[role.id] ?? new Set()).size;
          return (
            <div
              key={role.id}
              className="flex items-center justify-between rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-4 shadow-[0_1px_3px_rgba(22,15,51,0.03)]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", style.dot)} />
                  <span className="truncate font-display text-lg font-bold text-indigo italic">
                    {role.name}
                  </span>
                  {isSuperAdmin(role.name) && (
                    <ShieldCheck className="size-4 shrink-0 text-gold-dark" />
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[12px] text-body">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5 text-faint" />
                    {role.users_count} membre{role.users_count > 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3.5 text-faint" />
                    {isSuperAdmin(role.name)
                      ? "Tous les privilèges"
                      : `${count}/${totalPermissions} privilèges`}
                  </span>
                </div>
              </div>
              {!isSuperAdmin(role.name) && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openRename(role)}
                    className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo"
                    title="Renommer"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(role)}
                    className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live"
                    title="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Groups pagination — drives both the cards above and the matrix below */}
      {sortedRoles.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-[14px] border border-[rgba(40,25,80,0.08)] bg-white">
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={sortedRoles.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="groupes"
          />
        </div>
      )}

      {/* ── Security matrix ───────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-indigo italic">
              Matrice de sécurité
            </h2>
            <p className="text-xs text-body">
              Cochez les privilèges accordés à chaque groupe, puis enregistrez.
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold text-gold-dark">
              <ArrowLeftRight className="size-3" />
              Défilez horizontalement pour voir toutes les catégories
            </span>
          </div>
          <Button size="sm" icon={<Save className="size-3.5" />} loading={isPending} disabled={!dirty} onClick={handleSaveMatrix}>
            Enregistrer les privilèges
          </Button>
        </div>

        <div className="relative max-h-[68vh] overflow-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(40,25,80,0.22)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(40,25,80,0.35)] [&::-webkit-scrollbar-track]:bg-cream/40 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5">
          <table className="w-full border-collapse text-sm">
            <thead>
              {/* Category band */}
              <tr className="bg-cream">
                <th className="sticky top-0 left-0 z-30 h-11 border-b border-[rgba(40,25,80,0.08)] bg-cream px-6 text-left text-[11px] font-bold tracking-wider text-body uppercase shadow-[6px_0_8px_-6px_rgba(22,15,51,0.12)]">
                  Groupe
                </th>
                {catalog.map((cat) => (
                  <th
                    key={cat.category}
                    colSpan={cat.permissions.length}
                    className="sticky top-0 z-20 h-11 border-b border-l border-[rgba(40,25,80,0.08)] bg-cream px-3 text-center text-[11px] font-bold tracking-wider text-gold-dark uppercase"
                  >
                    {cat.category}
                  </th>
                ))}
              </tr>
              {/* Permission labels */}
              <tr className="bg-cream/50">
                <th className="sticky top-11 left-0 z-30 h-9 border-b border-[rgba(40,25,80,0.08)] bg-[#f6f2ea] px-6 shadow-[6px_0_8px_-6px_rgba(22,15,51,0.12)]" />
                {catalog.map((cat) =>
                  cat.permissions.map((perm, idx) => (
                    <th
                      key={perm.name}
                      title={perm.label}
                      className={cn(
                        "sticky top-11 z-20 h-9 cursor-help border-b border-[rgba(40,25,80,0.08)] bg-[#f6f2ea] px-3 text-center text-[11px] font-semibold text-body",
                        idx === 0 && "border-l border-[rgba(40,25,80,0.08)]"
                      )}
                    >
                      <span className="mx-auto flex max-w-[88px] items-center justify-center gap-1">
                        <span className="truncate">{SHORT_LABELS[perm.name] ?? perm.label}</span>
                        <Info className="size-3 shrink-0 text-faint" />
                      </span>
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {pagedRoles.map((role) => {
                const style = groupStyle(role.name);
                const superAdmin = isSuperAdmin(role.name);
                const set = matrix[role.id] ?? new Set<string>();
                const allOn = flatPermissions.every((p) => set.has(p));
                return (
                  <tr key={role.id} className="group/row hover:bg-cream/30">
                    <td className="sticky left-0 z-10 bg-white px-6 py-3 shadow-[6px_0_8px_-6px_rgba(22,15,51,0.12)] group-hover/row:bg-cream/40">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 rounded-full", style.dot)} />
                        <span className="font-semibold text-indigo">{role.name}</span>
                      </div>
                      {!superAdmin && (
                        <button
                          onClick={() => toggleWholeRole(role, !allOn)}
                          className="mt-0.5 cursor-pointer text-[10px] font-bold text-faint uppercase tracking-wide transition hover:text-gold-dark"
                        >
                          {allOn ? "Tout décocher" : "Tout cocher"}
                        </button>
                      )}
                    </td>
                    {catalog.map((cat) =>
                      cat.permissions.map((perm, idx) => {
                        const checked = superAdmin || set.has(perm.name);
                        return (
                          <td
                            key={perm.name}
                            className={cn(
                              "px-3 py-3 text-center",
                              idx === 0 && "border-l border-[rgba(40,25,80,0.06)]"
                            )}
                          >
                            <button
                              type="button"
                              disabled={superAdmin}
                              onClick={() => toggleCell(role.id, perm.name)}
                              aria-pressed={checked}
                              aria-label={`${role.name} · ${perm.label}`}
                              className={cn(
                                "inline-flex size-6 items-center justify-center rounded-md border transition",
                                checked
                                  ? "border-gold bg-gradient-to-br from-gold to-gold-dark text-white shadow-sm"
                                  : "border-[rgba(40,25,80,0.18)] bg-white hover:border-gold",
                                superAdmin
                                  ? "cursor-not-allowed opacity-80"
                                  : "cursor-pointer"
                              )}
                            >
                              {checked && <CheckCircle className="size-3.5" strokeWidth={2.5} />}
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 border-t border-[rgba(40,25,80,0.08)] bg-cream/40 px-6 py-3 text-[11px] text-body">
          <ShieldCheck className="size-3.5 text-gold-dark" />
          Le groupe <span className="font-bold">Super Admin</span> possède toujours tous les
          privilèges et ne peut pas être restreint.
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
        title="Supprimer le groupe ?"
        message={`Le groupe « ${deleteTarget?.name ?? ""} » sera supprimé et ses membres détachés.`}
        confirmLabel="Supprimer"
        loading={isPending}
        onConfirm={confirmDelete}
      />

      {/* Create / rename modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editingRole ? "Renommer le groupe" : "Nouveau groupe"} size="sm">
        <div className="px-6 py-6">
          <Field label="Nom du groupe / département">
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitRole();
              }}
              placeholder="Ex : Huissier, Louange, Protocole…"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
            Annuler
          </Button>
          <Button type="button" size="sm" icon={<Save className="size-3.5" />} loading={isPending} disabled={!roleName.trim()} onClick={handleSubmitRole}>
            {editingRole ? "Renommer" : "Créer le groupe"}
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}
