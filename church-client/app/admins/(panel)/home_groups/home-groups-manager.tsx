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
  AlertCircle,
  ChevronDown,
  Check
} from "lucide-react";
import { createHomeGroup, updateHomeGroup, deleteHomeGroup, type AdminUser } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type HomeGroup = {
  id: number;
  name: string;
  leader: string;
  leader_id: number | null;
  address: string;
  schedule: string | null;
  coordinates: { top?: string; left?: string; lat?: number; lng?: number } | null;
  sort_order: number;
  is_active: boolean;
};

export function HomeGroupsManager({
  initialHomeGroups,
  users = [],
}: {
  initialHomeGroups: HomeGroup[];
  users?: AdminUser[];
}) {
  const [homeGroups, setHomeGroups] = useState<HomeGroup[]>(initialHomeGroups);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomeGroup, setEditingHomeGroup] = useState<HomeGroup | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [leader, setLeader] = useState("");
  const [leaderId, setLeaderId] = useState<number | "">("");
  const [userSearch, setUserSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [schedule, setSchedule] = useState("");
  const [topPercent, setTopPercent] = useState("50%");
  const [leftPercent, setLeftPercent] = useState("50%");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingHomeGroup(null);
    setName("");
    setLeader("");
    setLeaderId("");
    setUserSearch("");
    setIsDropdownOpen(false);
    setAddress("");
    setSchedule("Mensuel · 1er dimanche");
    setTopPercent("50%");
    setLeftPercent("50%");
    setSortOrder(0);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (group: HomeGroup) => {
    setEditingHomeGroup(group);
    setName(group.name);
    setLeader(group.leader);
    setLeaderId(group.leader_id || "");
    setUserSearch("");
    setIsDropdownOpen(false);
    setAddress(group.address);
    setSchedule(group.schedule ?? "");
    setTopPercent(group.coordinates?.top ?? "50%");
    setLeftPercent(group.coordinates?.left ?? "50%");
    setSortOrder(group.sort_order);
    setIsActive(group.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHomeGroup(null);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le groupe de maison "${name}" ?`)) return;

    setStatus(null);
    startTransition(async () => {
      try {
        await deleteHomeGroup(id);
        setHomeGroups(homeGroups.filter((g) => g.id !== id));
        setStatus({ type: "success", message: `Le groupe "${name}" a été supprimé.` });
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Impossible de supprimer ce groupe." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leader.trim() || !address.trim()) return;

    setStatus(null);
    startTransition(async () => {
      try {
        // Enforce percentage symbol on map offsets
        const formatPercent = (val: string) => {
          const num = val.replace(/[^0-9.]/g, "");
          return num ? `${num}%` : "50%";
        };

        const payload = {
          name,
          leader,
          leader_id: leaderId ? Number(leaderId) : null,
          address,
          schedule: schedule || null,
          coordinates: {
            top: formatPercent(topPercent),
            left: formatPercent(leftPercent),
          },
          sort_order: Number(sortOrder),
          is_active: isActive,
        };

        if (editingHomeGroup) {
          const res = await updateHomeGroup(editingHomeGroup.id, payload);
          const updated = res.data as HomeGroup;
          setHomeGroups(homeGroups.map((g) => (g.id === updated.id ? updated : g)));
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été mis à jour.` });
        } else {
          const res = await createHomeGroup(payload);
          const created = res.data as HomeGroup;
          setHomeGroups([...homeGroups, created]);
          setStatus({ type: "success", message: `Le groupe de maison "${name}" a été créé.` });
        }
        closeModal();
      } catch (err) {
        const error = err as Error;
        setStatus({ type: "error", message: error.message || "Erreur de validation ou de connexion." });
      }
    });
  };

  // Filter users based on search
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Find currently selected user object
  const selectedUser = users.find((u) => u.id === leaderId);

  const filtered = homeGroups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.leader.toLowerCase().includes(search.toLowerCase()) ||
    g.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Ressources
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Gestion des Groupes de maison
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les cellules de prière et de communion fraternelle réparties dans les différents quartiers.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admins/home_groups/applications"
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-indigo/20 bg-white px-5 py-3 text-sm font-bold text-indigo transition hover:bg-cream"
          >
            Voir les Candidatures
          </Link>
          <button
            onClick={openCreateModal}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            <Plus className="size-4" /> Nouveau Groupe
          </button>
        </div>
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
          placeholder="Rechercher par nom, responsable ou quartier..."
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
                <th className="px-6 py-4">Nom du groupe</th>
                <th className="px-6 py-4">Responsable</th>
                <th className="px-6 py-4">Quartier / Adresse</th>
                <th className="px-6 py-4">Position Carte</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {filtered.map((group) => (
                <tr key={group.id} className="hover:bg-cream/40 transition-colors">
                  <td className="px-6 py-4 font-semibold">{group.name}</td>
                  <td className="px-6 py-4 font-medium">{group.leader}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-xs text-indigo">{group.address}</p>
                      {group.schedule && <p className="mt-0.5 text-[11px] text-body">{group.schedule}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-faint">
                    Top: {group.coordinates?.top ?? "50%"} · Left: {group.coordinates?.left ?? "50%"}
                  </td>
                  <td className="px-6 py-4">
                    {group.is_active ? (
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
                        onClick={() => openEditModal(group)}
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-[rgba(40,25,80,0.1)] text-indigo hover:border-gold hover:bg-gold/5 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id, group.name)}
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
                    Aucun groupe de maison trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent
          showCloseButton
          className="w-[95vw] md:max-w-3xl rounded-2xl bg-white p-0 gap-0 border-0 outline-none max-h-[92vh] overflow-y-auto"
        >
          <div className="border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
            <h2 className="font-display text-lg font-bold text-indigo italic">
              {editingHomeGroup ? "Modifier le groupe de maison" : "Créer un groupe de maison"}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 px-6 py-6">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Nom du groupe *</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Cellule Ficgayo Temple"
                  className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="flex flex-col gap-2 relative">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Responsable / Leader *</span>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center justify-between w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none text-left focus:border-gold"
                >
                  <span className="truncate">
                    {selectedUser ? selectedUser.name : (leader || "Sélectionner un chef de cellule...")}
                  </span>
                  <ChevronDown className="size-4 ml-2 text-faint shrink-0" />
                </button>

                {/* Dropdown Menu click-catcher */}
                {isDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                )}

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[rgba(40,25,80,0.08)] bg-white p-2 shadow-2xl animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    <div className="sticky top-0 bg-white pb-2 border-b border-[rgba(40,25,80,0.06)] mb-2 flex items-center px-2 z-10">
                      <Search className="size-3.5 text-faint mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Rechercher un chef..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full text-xs text-indigo outline-none py-1 placeholder:text-faint bg-white"
                        autoFocus
                      />
                      {userSearch && (
                        <button type="button" onClick={() => setUserSearch("")} className="text-faint hover:text-indigo">
                          <X className="size-3" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {filteredUsers.length === 0 ? (
                        <div className="px-3 py-4 text-center text-xs text-faint">
                          Aucun utilisateur trouvé
                        </div>
                      ) : (
                        filteredUsers.map((u) => {
                          const isCurrentlySelected = u.id === leaderId;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setLeaderId(u.id);
                                setLeader(u.name);
                                setIsDropdownOpen(false);
                                setUserSearch("");
                              }}
                              className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors",
                                isCurrentlySelected
                                  ? "bg-gold/15 font-semibold text-indigo"
                                  : "text-body hover:bg-cream/40 hover:text-indigo"
                              )}
                            >
                              <div className="truncate pr-4">
                                <p className="font-semibold">{u.name}</p>
                                <p className="text-[10px] text-faint truncate">{u.email}</p>
                              </div>
                              {isCurrentlySelected && <Check className="size-3.5 text-gold-dark shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Adresse complète (Quartier...) *</span>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ex: Yopougon, Cité Ficgayo, Rue des Bananiers"
                  className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Programme des réunions</span>
                <input
                  type="text"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="ex: Chaque mardi de 19:00 à 20:30"
                  className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide whitespace-nowrap">Position Carte (Top %)</span>
                  <input
                    type="text"
                    value={topPercent}
                    onChange={(e) => setTopPercent(e.target.value)}
                    placeholder="45%"
                    className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold font-mono"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide whitespace-nowrap">Position Carte (Left %)</span>
                  <input
                    type="text"
                    value={leftPercent}
                    onChange={(e) => setLeftPercent(e.target.value)}
                    placeholder="28%"
                    className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold font-mono"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Ordre de tri</span>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold"
                  />
                </label>

                <div className="flex flex-col gap-2.5 justify-center">
                  <span className="text-xs font-bold text-body-strong uppercase tracking-wide">Visibilité</span>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="size-4 accent-gold cursor-pointer"
                    />
                    <span className="text-[13px] font-semibold text-indigo">Afficher sur la carte</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4 bg-[#faf8f4]">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
