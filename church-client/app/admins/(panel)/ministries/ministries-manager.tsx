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
import { createMinistry, updateMinistry, deleteMinistry } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type Ministry = {
  id: number;
  name: string;
  description: string | null;
  schedule: string | null;
  sort_order: number;
  is_active: boolean;
};

export function MinistriesManager({
  initialMinistries,
}: {
  initialMinistries: Ministry[];
}) {
  const [ministries, setMinistries] = useState<Ministry[]>(initialMinistries);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingMinistry(null);
    setName("");
    setDescription("");
    setSchedule("");
    setSortOrder(0);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setName(ministry.name);
    setDescription(ministry.description ?? "");
    setSchedule(ministry.schedule ?? "");
    setSortOrder(ministry.sort_order);
    setIsActive(ministry.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMinistry(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le ministère "${name}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteMinistry(id);
        setMinistries(ministries.filter((m) => m.id !== id));
        setStatus({ type: "success", message: `Le ministère "${name}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer ce ministère." });
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
          sort_order: Number(sortOrder),
          is_active: isActive,
        };

        if (editingMinistry) {
          const res = await updateMinistry(editingMinistry.id, payload);
          const updated = res.data as Ministry;
          setMinistries(ministries.map((m) => (m.id === updated.id ? updated : m)));
          setStatus({ type: "success", message: `Le ministère "${name}" a été mis à jour.` });
        } else {
          const res = await createMinistry(payload);
          const created = res.data as Ministry;
          setMinistries([...ministries, created]);
          setStatus({ type: "success", message: `Le ministère "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  const filtered = ministries.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion des Ministères
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez la liste des départements, services et pôles d’activité de la Maison.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <Plus className="size-4" /> Nouveau Ministère
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
          placeholder="Rechercher un ministère..."
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
                <th className="px-6 py-4">Ordre</th>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Programme / Horaires</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((ministry) => (
                <tr key={ministry.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">{ministry.sort_order}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold">{ministry.name}</p>
                      {ministry.description && (
                        <p className="mt-0.5 text-xs text-body line-clamp-1">{ministry.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-body-soft">
                    {ministry.schedule ?? "—"}
                  </td>
                  <td className="px-6 py-4">
                    {ministry.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-online/10 px-2.5 py-1 text-xs font-bold text-online">
                        <Eye className="size-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/10 px-2.5 py-1 text-xs font-bold text-live">
                        <EyeOff className="size-3" /> Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(ministry)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ministry.id, ministry.name)}
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
                    Aucun ministère trouvé.
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
          <div className="w-full max-w-[500px] overflow-hidden rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-2xl animate-fade-up">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-indigo italic">
                {editingMinistry ? "Modifier le ministère" : "Créer un ministère"}
              </h3>
              <button onClick={closeModal} className="text-faint hover:text-indigo">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Nom du ministère *</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Département Jeunesse"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Programme / Horaires</span>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="ex: Samedi 16:00 · Salle Polyvalente"
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Ordre d’affichage</span>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold"
                  />
                </label>

                <div className="flex flex-col gap-2.5 justify-center">
                  <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Visibilité public</span>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4 accent-gold cursor-pointer"
                    />
                    <span className="text-[13px] font-semibold text-indigo">Afficher sur le site</span>
                  </label>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold tracking-wide text-body-strong uppercase">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Objectif et activités du ministère..."
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-[14px] text-indigo outline-none focus:border-gold resize-none leading-relaxed"
                />
              </label>

              <div className="mt-2 flex justify-end gap-3">
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
