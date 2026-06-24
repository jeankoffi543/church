"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import {
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Inbox,
  Mail,
  Phone,
  MessageCircle,
  ShieldCheck,
  Loader2,
  User,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  X,
} from "lucide-react";

import type { AdminMe, AdminContactMessage, AdminListMeta } from "@/lib/admin-api";
import {
  updateContactStatus,
  archiveContact,
  replyContact,
  updateAdminSettings,
  getAdminContactsPaginated,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

export const CONTACTS_PER_PAGE = 10;

type StatusFilter = "all" | "pending" | "read" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "pending", label: "En attente" },
  { key: "read", label: "Lus" },
  { key: "archived", label: "Archivés" },
];

const STATUS_CONFIG: Record<
  AdminContactMessage["status"],
  { label: string; bg: string; text: string; dot: string; pulse?: boolean }
> = {
  pending: { label: "En attente", bg: "bg-gold/10", text: "text-gold-dark", dot: "bg-gold", pulse: true },
  read: { label: "Lu", bg: "bg-indigo/10", text: "text-indigo", dot: "bg-indigo" },
  archived: { label: "Archivé", bg: "bg-faint/10", text: "text-faint", dot: "bg-faint" },
};

export function ContactsManager({
  initialMessages,
  initialMeta,
  initialPendingCount,
  initialSubjects,
  me,
}: {
  initialMessages: AdminContactMessage[];
  initialMeta: AdminListMeta;
  initialPendingCount: number;
  initialSubjects: string[];
  me: AdminMe;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Table sorting and filtering states
  const [sortBy, setSortBy] = useState<"name" | "subject" | "status" | "phone" | "created_at" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(CONTACTS_PER_PAGE);

  const [activeTab, setActiveTab] = useState<"messages" | "subjects">("messages");
  const [subjects, setSubjects] = useState<string[]>(initialSubjects);
  const [newSubject, setNewSubject] = useState("");
  const [savingSubjects, setSavingSubjects] = useState(false);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const filterParams: Record<string, string> = { ...serializeFiltersForQueryMaster(activeFilters) };
  if (statusFilter !== "all") {
    filterParams.status = statusFilter;
  }

  const {
    items: messages,
    setItems: setMessages,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminContactMessage>({
    fetcher: getAdminContactsPaginated,
    params: {
      page,
      perPage,
      search,
      sort: sortBy && sortOrder ? { field: sortBy, dir: sortOrder } : null,
      filters: filterParams,
    },
    initialData: initialMessages,
    initialMeta,
  });

  // The "pending" badge needs the global count, not just the visible page.
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const refreshPending = useCallback(() => {
    getAdminContactsPaginated({ filters: { status: "pending" }, perPage: 1 })
      .then((res) => setPendingCount(res.meta.total))
      .catch(() => {});
  }, []);

  const handleAddSubject = () => {
    const val = newSubject.trim();
    if (!val) return;
    if (subjects.includes(val)) {
      setStatus({ type: "error", message: "Ce sujet existe déjà." });
      return;
    }
    const updated = [...subjects, val];
    setSubjects(updated);
    setNewSubject("");
    saveSubjects(updated);
  };

  const handleDeleteSubject = (subToDelete: string) => {
    const updated = subjects.filter((s) => s !== subToDelete);
    setSubjects(updated);
    saveSubjects(updated);
  };

  const saveSubjects = async (updatedList: string[]) => {
    setSavingSubjects(true);
    setStatus(null);
    try {
      await updateAdminSettings([
        { key: "contact_subjects", value: updatedList, group: "contact" }
      ]);
      setStatus({ type: "success", message: "Sujets de contact enregistrés avec succès." });
    } catch (err) {
      setStatus({
        type: "error",
        message: (err as Error).message || "Impossible de sauvegarder les sujets.",
      });
    } finally {
      setSavingSubjects(false);
    }
  };

  const canManage = hasAnyPermission(me, [PERMISSIONS.manageContacts]);

  const openMessage = (msg: AdminContactMessage) => {
    setSelectedId(msg.id);
    setStatus(null);
  };

  const filterFields: FilterField[] = useMemo(() => [
    { id: "name", label: "Nom", type: "text" },
    { id: "email", label: "Email", type: "text" },
    { id: "phone", label: "Téléphone", type: "text" },
    { 
      id: "subject", 
      label: "Sujet", 
      type: "select", 
      options: subjects.map((sub) => ({ value: sub, label: sub }))
    }
  ], [subjects]);

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleSort = (column: "name" | "subject" | "status" | "phone" | "created_at") => {
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

  const renderSortChevron = (column: "name" | "subject" | "status" | "phone" | "created_at") => {
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
  const paged = messages;
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  /** Optimistically patch the visible row, then resync the page + badge. */
  const replaceInList = (updated: AdminContactMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    refresh();
    refreshPending();
  };

  const handleStatusChange = (msg: AdminContactMessage, nextStatus: "pending" | "read" | "archived") => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await updateContactStatus(msg.id, nextStatus);
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: "Statut du message mis à jour avec succès.",
        });
        setSelectedId(null);
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Action impossible.",
        });
      }
    });
  };

  const handleArchive = (msg: AdminContactMessage) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await archiveContact(msg.id);
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: "Message archivé avec succès.",
        });
        setSelectedId(null);
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Action impossible.",
        });
      }
    });
  };

  const handleReplyAction = (msg: AdminContactMessage) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await replyContact(msg.id);
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: "Statut marqué comme répondu.",
        });
        setSelectedId(null);

        // Open WhatsApp in a new tab if phone is available
        if (msg.phone) {
          const url = whatsappUrl(msg);
          window.open(url, "_blank");
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: (err as Error).message || "Action impossible.",
        });
      }
    });
  };

  const whatsappUrl = (msg: AdminContactMessage) => {
    if (!msg.phone) return "";
    const phone = msg.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(
      `Bonjour ${msg.name}, suite à votre message concernant « ${msg.subject} » à MFM Ficgayo...`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  return (
    <div className="mx-auto max-w-[1100px] animate-fade-up">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Secrétariat
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Messages de contact
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {total}
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-gold text-[10px] font-black text-indigo">
                  {pendingCount}
                </span>
              )}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Consultez et traitez les demandes des visiteurs du site de l&apos;église.
          </p>
        </div>
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

      {/* Tabs */}
      <div className="mb-6 flex gap-3 border-b border-[rgba(40,25,80,0.08)] pb-2">
        <button
          onClick={() => setActiveTab("messages")}
          className={cn(
            "cursor-pointer pb-2 text-sm font-bold transition border-b-2 px-1",
            activeTab === "messages"
              ? "border-indigo text-indigo"
              : "border-transparent text-faint hover:text-indigo"
          )}
        >
          Messages reçus
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={cn(
            "cursor-pointer pb-2 text-sm font-bold transition border-b-2 px-1",
            activeTab === "subjects"
              ? "border-indigo text-indigo"
              : "border-transparent text-faint hover:text-indigo"
          )}
        >
          Sujets de contact
        </button>
      </div>

      {activeTab === "messages" && (
        <>

      {/* Filter and search bar row (Set z-20 relative for correct stacking context) */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap z-20 relative">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {/* Status filters */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)] w-fit">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key);
                  setPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-bold transition",
                  statusFilter === f.key
                    ? "bg-indigo text-white shadow-sm"
                    : "text-body hover:bg-cream hover:text-indigo"
                )}
              >
                {f.label}
                {f.key === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-gold text-[9px] font-black text-indigo">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main search bar */}
          <div className="flex flex-1 min-w-[220px] max-w-xs items-center gap-2.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white px-3.5 py-2.5 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
            <Search className="size-4 text-faint" />
            <input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

        {activeFilters.length > 0 && (
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
            <thead className="border-b border-[rgba(40,25,80,0.08)] bg-cream text-xs font-bold tracking-wider text-body uppercase select-none">
              <tr>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nom</span>
                    {renderSortChevron("name")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("subject")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Sujet</span>
                    {renderSortChevron("subject")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Statut</span>
                    {renderSortChevron("status")}
                  </div>
                </th>
                <th 
                  className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {renderSortChevron("created_at")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(40,25,80,0.06)]">
              {paged.map((msg) => {
                const cfg = STATUS_CONFIG[msg.status];
                return (
                  <tr
                    key={msg.id}
                    onClick={() => openMessage(msg)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-cream/40",
                      selectedId === msg.id && "bg-gold/5"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
                          {msg.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{msg.name}</p>
                          <p className="text-[11px] text-faint truncate max-w-[200px]">{msg.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[280px]">
                        <p className="font-semibold truncate">{msg.subject}</p>
                        <p className="text-xs text-faint truncate">{msg.message}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                          cfg.bg,
                          cfg.text
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                );
              })}

              {paged.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="size-10 text-gold/40" />
                      <p className="text-sm font-semibold text-body-strong">Aucun message</p>
                      <p className="max-w-xs text-xs text-body">
                        Les nouveaux messages de contact apparaîtront ici.
                      </p>
                    </div>
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
            onPageChange={setPage}
            onPerPageChange={(n: number) => {
              setPerPage(n);
              setPage(1);
            }}
            itemLabel="messages"
          />
        )}
      </div>
      </>
      )}

      {activeTab === "subjects" && (
        <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)] max-w-xl animate-fade-up">
          <h2 className="font-display text-lg font-bold text-indigo mb-2">Gérer les sujets de contact</h2>
          <p className="text-xs text-body mb-6">
            Ces sujets s&apos;afficheront dans la liste déroulante du formulaire public pour orienter le visiteur.
          </p>

          {/* Add Form */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Ajouter un sujet (ex: Demande de baptême)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="flex-1 h-10 rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-xs text-indigo outline-none focus:border-gold"
            />
            <button
              onClick={handleAddSubject}
              disabled={savingSubjects || !newSubject.trim()}
              className="cursor-pointer h-10 rounded-xl bg-indigo text-white text-xs font-bold px-4 hover:brightness-110 transition disabled:opacity-40"
            >
              {savingSubjects ? <Loader2 className="size-4 animate-spin" /> : "Ajouter"}
            </button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {subjects.map((sub) => (
              <div
                key={sub}
                className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(40,25,80,0.08)] bg-[#faf8f4] px-4 py-2.5"
              >
                <span className="text-xs font-semibold text-indigo">{sub}</span>
                <button
                  onClick={() => handleDeleteSubject(sub)}
                  disabled={savingSubjects}
                  className="cursor-pointer text-live hover:underline text-xs font-bold disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            ))}

            {subjects.length === 0 && (
              <p className="text-xs text-faint text-center py-6">Aucun sujet configuré.</p>
            )}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <DialogContent
            showCloseButton
            className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">
                  Message · {selected.subject}
                </span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">
                  {selected.name}
                </h2>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                  STATUS_CONFIG[selected.status].bg,
                  STATUS_CONFIG[selected.status].text
                )}
              >
                {selected.status === "pending" && <Clock className="size-3" />}
                {selected.status === "read" && <CheckCircle className="size-3" />}
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nom complet */}
                <div className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10">
                  <User className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="text-sm font-semibold text-indigo truncate">{selected.name}</div>
                  </div>
                </div>

                {/* Email */}
                <a
                  href={`mailto:${selected.email}`}
                  className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10 transition hover:border-gold hover:bg-cream"
                >
                  <Mail className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Email</div>
                    <div className="text-sm font-semibold text-indigo truncate">{selected.email}</div>
                  </div>
                </a>

                {/* Téléphone et WhatsApp */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2 bg-muted/10">
                  <div className="flex gap-3 items-center min-w-0">
                    <Phone className="size-4 text-faint" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                      {selected.phone ? (
                        <a
                          href={`tel:${selected.phone}`}
                          className="text-sm font-semibold text-indigo hover:underline truncate"
                        >
                          {selected.phone}
                        </a>
                      ) : (
                        <span className="text-sm font-semibold text-indigo truncate">Non renseigné</span>
                      )}
                    </div>
                  </div>
                  {selected.phone && (
                    <a
                      href={whatsappUrl(selected)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white shadow-sm transition hover:brightness-110"
                      title="Contacter sur WhatsApp"
                    >
                      <MessageCircle className="size-4" />
                    </a>
                  )}
                </div>

                {/* Sujet */}
                <div className="flex gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.1)] px-3.5 py-2.5 bg-muted/10">
                  <Inbox className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Sujet</div>
                    <div className="text-sm font-semibold text-indigo truncate">
                      {selected.subject}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc Message */}
              <section className="space-y-2">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Message</h3>
                <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed text-body-strong whitespace-pre-line">
                  {selected.message}
                </p>
              </section>

              {/* Traitement info (if replied) */}
              {selected.replied_at && (
                <div className="flex gap-3 rounded-xl border border-indigo/10 bg-indigo/5 p-4 text-xs text-indigo">
                  <CheckCircle className="size-5 shrink-0 text-gold-dark" />
                  <div>
                    <p className="font-bold">Réponse apportée</p>
                    <p className="mt-1 leading-relaxed">
                      Traitée le : {new Date(selected.replied_at).toLocaleString("fr-FR")}.
                      {selected.replied_by_user && (
                        <span> Par : {selected.replied_by_user.name}</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canManage ? (
                <div className="flex items-center gap-3 justify-end">
                  {selected.phone && (
                    <button
                      onClick={() => handleReplyAction(selected)}
                      disabled={isPending}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-bold text-white transition disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
                      Répondre via WhatsApp
                    </button>
                  )}
                  {selected.status !== "read" && (
                    <button
                      onClick={() => handleStatusChange(selected, "read")}
                      disabled={isPending}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-online/10 px-4 py-3 text-xs font-bold text-online transition hover:bg-online/20 disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                      Marquer comme lu
                    </button>
                  )}
                  {selected.status !== "archived" && (
                    <button
                      onClick={() => handleArchive(selected)}
                      disabled={isPending}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-live/20 px-4 py-3 text-xs font-bold text-live transition hover:bg-live/10 disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Inbox className="size-4" />}
                      Archiver
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-cream/60 px-4 py-3 text-xs font-semibold text-body">
                  <ShieldCheck className="size-4 text-faint" />
                  Seul le secrétariat ou un administrateur peut traiter ce message.
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
