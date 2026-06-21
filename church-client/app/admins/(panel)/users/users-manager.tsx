"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  Save,
  Users as UsersIcon,
  Mail,
  ShieldCheck,
} from "lucide-react";

import type { AdminServant } from "@/lib/admin-api";
import {
  createServant,
  updateServant,
  deleteServant,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "../_components/multi-select";
import { groupStyle } from "../_components/group-style";
import { Pagination } from "../_components/pagination";

type Feedback = { type: "success" | "error"; message: string } | null;

type FormState = {
  name: string;
  email: string;
  password: string;
  is_active: boolean;
  roles: string[];
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  is_active: true,
  roles: [],
};

export function UsersManager({
  initialServants,
  roleNames,
  currentUserId,
}: {
  initialServants: AdminServant[];
  roleNames: string[];
  currentUserId: number;
}) {
  const [servants, setServants] = useState<AdminServant[]>(initialServants);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Feedback>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminServant | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Pagination (client-side over the loaded servants).
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const sorted = useMemo(
    () => [...servants].sort((a, b) => a.name.localeCompare(b.name)),
    [servants]
  );
  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  // Clamp during render so the page stays valid when the list shrinks.
  const currentPage = Math.min(page, pageCount);
  const paged = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setStatus(null);
    setModalOpen(true);
  };

  const openEdit = (servant: AdminServant) => {
    setEditing(servant);
    setForm({
      name: servant.name,
      email: servant.email,
      password: "",
      is_active: servant.is_active,
      roles: servant.roles,
    });
    setStatus(null);
    setModalOpen(true);
  };

  const patchForm = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

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
          setServants((prev) =>
            prev.map((s) => (s.id === editing.id ? res.data : s))
          );
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
          setStatus({ type: "success", message: "Serviteur ajouté." });
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

  const handleToggleActive = (servant: AdminServant) => {
    const next = !servant.is_active;
    // optimistic
    setServants((prev) =>
      prev.map((s) => (s.id === servant.id ? { ...s, is_active: next } : s))
    );
    startTransition(async () => {
      try {
        const res = await updateServant(servant.id, { is_active: next });
        setServants((prev) =>
          prev.map((s) => (s.id === servant.id ? res.data : s))
        );
        setStatus({
          type: "success",
          message: next ? "Accès réactivé." : "Accès suspendu.",
        });
      } catch (err) {
        setServants((prev) =>
          prev.map((s) => (s.id === servant.id ? servant : s))
        );
        setStatus({
          type: "error",
          message: (err as Error).message || "Impossible de changer le statut.",
        });
      }
    });
  };

  const handleDelete = (servant: AdminServant) => {
    if (!confirm(`Supprimer définitivement le compte de « ${servant.name} » ?`)) {
      return;
    }
    setServants((prev) => prev.filter((s) => s.id !== servant.id));
    startTransition(async () => {
      try {
        await deleteServant(servant.id);
        setStatus({ type: "success", message: "Serviteur supprimé." });
      } catch (err) {
        setServants((prev) =>
          [...prev, servant].sort((a, b) => a.name.localeCompare(b.name))
        );
        setStatus({
          type: "error",
          message: (err as Error).message || "Suppression impossible.",
        });
      }
    });
  };

  const activeCount = servants.filter((s) => s.is_active).length;

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Serviteurs
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Comptes &amp; Accès
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {servants.length}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            {activeCount} actif{activeCount > 1 ? "s" : ""} · gérez les serviteurs et leurs
            départements.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-mid"
        >
          <Plus className="size-4" />
          Nouveau serviteur
        </button>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live"
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <p className="font-semibold">{status.message}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-indigo">
            <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase">
              <tr>
                <th className="px-6 py-4">Serviteur</th>
                <th className="px-6 py-4">Départements</th>
                <th className="px-6 py-4">Accès</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((servant) => {
                const isSelf = servant.id === currentUserId;
                return (
                  <tr key={servant.id} className="transition-colors hover:bg-cream/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-sm font-bold text-indigo">
                          {servant.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="flex items-center gap-1.5 font-semibold">
                            {servant.name}
                            {isSelf && (
                              <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-dark uppercase">
                                Vous
                              </span>
                            )}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] text-faint">
                            <Mail className="size-3" />
                            {servant.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {servant.roles.length === 0 && (
                          <span className="text-xs italic text-faint">Aucun</span>
                        )}
                        {servant.roles.map((role) => {
                          const style = groupStyle(role);
                          return (
                            <span
                              key={role}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
                                style.bg,
                                style.text,
                                style.ring
                              )}
                            >
                              {role === "Super Admin" && (
                                <ShieldCheck className="size-3" />
                              )}
                              <span className={cn("size-1.5 rounded-full", style.dot)} />
                              {role}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={servant.is_active}
                          disabled={isSelf || isPending}
                          onCheckedChange={() => handleToggleActive(servant)}
                          label={`Accès de ${servant.name}`}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-bold",
                            servant.is_active ? "text-online" : "text-faint"
                          )}
                        >
                          {servant.is_active ? "Actif" : "Suspendu"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(servant)}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-cream hover:text-indigo"
                          title="Modifier"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(servant)}
                          disabled={isSelf}
                          className="cursor-pointer rounded-lg p-2 text-faint transition hover:bg-live/10 hover:text-live disabled:cursor-not-allowed disabled:opacity-30"
                          title={isSelf ? "Vous ne pouvez pas vous supprimer" : "Supprimer"}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {servants.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <UsersIcon className="size-10 text-gold/40" />
                      <p className="text-sm font-semibold text-body-strong">
                        Aucun serviteur
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {sorted.length > 0 && (
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={sorted.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="serviteurs"
          />
        )}
      </div>

      {/* Add / edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          showCloseButton
          className="w-[95vw] max-w-lg rounded-2xl bg-white p-0 gap-0 border-0 outline-none max-h-[92vh] overflow-y-auto"
        >
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h2 className="font-display text-lg font-bold text-indigo italic">
              {editing ? "Modifier le serviteur" : "Nouveau serviteur"}
            </h2>
          </div>

          <div className="space-y-5 px-6 py-6">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Nom complet
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => patchForm({ name: e.target.value })}
                placeholder="Ex : Frère Jean Koffi"
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Adresse email
              </span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => patchForm({ email: e.target.value })}
                placeholder="serviteur@mfm-ficgayo.ci"
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Mot de passe{" "}
                {editing && (
                  <span className="font-normal normal-case text-faint">
                    (laisser vide pour conserver)
                  </span>
                )}
              </span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => patchForm({ password: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Départements
              </span>
              <MultiSelect
                options={roleNames}
                selected={form.roles}
                onChange={(roles) => patchForm({ roles })}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[rgba(40,25,80,0.1)] bg-cream/50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-indigo">Accès autorisé</p>
                <p className="text-xs text-body">
                  Désactivez pour suspendre la connexion de ce serviteur.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => patchForm({ is_active: v })}
                label="Accès autorisé"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
            <button
              onClick={() => setModalOpen(false)}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-body transition hover:bg-cream"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-2.5 text-xs font-bold text-indigo shadow-md transition hover:brightness-105 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {editing ? "Enregistrer" : "Créer le serviteur"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
