"use client";

import { useCallback, useState, useTransition } from "react";
import { Clock, Inbox, Mail, Phone, MessageCircle, ShieldCheck, Loader2, User, CheckCircle } from "lucide-react";

import type { AdminMe, AdminContactMessage, AdminListMeta } from "@/lib/admin-api";
import { updateContactStatus, archiveContact, replyContact, updateAdminSettings, getAdminContactsPaginated } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { hasAnyPermission, PERMISSIONS } from "@/lib/auth/permissions";
import type { FilterField } from "@/components/admin/query-builder";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { DataFilters } from "@/components/admin/data/data-filters";
import { DataTable } from "@/components/admin/data/data-table";
import { type Column } from "@/components/admin/data/use-data-table";
import { useServerDataTable } from "@/components/admin/data/use-server-data-table";

export const CONTACTS_PER_PAGE = 10;
import { Button } from "@/components/admin/ui/button";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>(null);

  const table = useServerDataTable<AdminContactMessage>({
    fetcher: getAdminContactsPaginated,
    initialData: initialMessages,
    initialMeta,
    initialPerPage: CONTACTS_PER_PAGE,
    extraFilters: statusFilter === "all" ? undefined : { status: statusFilter },
  });
  const messages = table.view;
  const setMessages = table.setItems;

  // The "pending" badge needs the global count, not just the visible page.
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const refreshPending = useCallback(() => {
    getAdminContactsPaginated({ filters: { status: "pending" }, perPage: 1 })
      .then((res) => setPendingCount(res.meta.total))
      .catch(() => {});
  }, []);

  const [activeTab, setActiveTab] = useState<"messages" | "subjects">("messages");
  const [subjects, setSubjects] = useState<string[]>(initialSubjects);
  const [newSubject, setNewSubject] = useState("");
  const [savingSubjects, setSavingSubjects] = useState(false);

  const canManage = hasAnyPermission(me, [PERMISSIONS.manageContacts]);

  const filterFields: FilterField[] = [
    { id: "name", label: "Nom", type: "text" },
    { id: "email", label: "Email", type: "text" },
    { id: "phone", label: "Téléphone", type: "text" },
    { id: "subject", label: "Sujet", type: "select", options: subjects.map((sub) => ({ value: sub, label: sub })) },
  ];

  const saveSubjects = async (updatedList: string[]) => {
    setSavingSubjects(true);
    setStatus(null);
    try {
      await updateAdminSettings([{ key: "contact_subjects", value: updatedList, group: "contact" }]);
      setStatus({ type: "success", message: "Sujets de contact enregistrés avec succès." });
    } catch (err) {
      setStatus({ type: "error", message: (err as Error).message || "Impossible de sauvegarder les sujets." });
    } finally {
      setSavingSubjects(false);
    }
  };

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

  const openMessage = (msg: AdminContactMessage) => {
    setSelectedId(msg.id);
    setStatus(null);
  };

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const replaceInList = (updated: AdminContactMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    table.refresh();
    refreshPending();
  };

  const handleStatusChange = (msg: AdminContactMessage, nextStatus: "pending" | "read" | "archived") => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await updateContactStatus(msg.id, nextStatus);
        replaceInList(res.data);
        setStatus({ type: "success", message: "Statut du message mis à jour avec succès." });
        setSelectedId(null);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  const handleArchive = (msg: AdminContactMessage) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await archiveContact(msg.id);
        replaceInList(res.data);
        setStatus({ type: "success", message: "Message archivé avec succès." });
        setSelectedId(null);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  const handleReplyAction = (msg: AdminContactMessage) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const res = await replyContact(msg.id);
        replaceInList(res.data);
        setStatus({ type: "success", message: "Statut marqué comme répondu." });
        setSelectedId(null);
        if (msg.phone) window.open(whatsappUrl(msg), "_blank");
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Action impossible." });
      }
    });
  };

  const whatsappUrl = (msg: AdminContactMessage) => {
    if (!msg.phone) return "";
    const phone = msg.phone.replace(/[^0-9]/g, "");
    const text = encodeURIComponent(`Bonjour ${msg.name}, suite à votre message concernant « ${msg.subject} » à MFM Ficgayo...`);
    return `https://wa.me/${phone}?text=${text}`;
  };

  const columns: Column<AdminContactMessage>[] = [
    {
      id: "name",
      header: "Nom",
      sortable: true,
      sortValue: (m) => m.name,
      cell: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
            {m.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{m.name}</p>
            <p className="max-w-[200px] truncate text-[11px] text-faint">{m.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "subject",
      header: "Sujet",
      sortable: true,
      sortValue: (m) => m.subject,
      cell: (m) => (
        <div className="max-w-[280px]">
          <p className="truncate font-semibold">{m.subject}</p>
          <p className="truncate text-xs text-faint">{m.message}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Statut",
      sortable: true,
      sortValue: (m) => m.status,
      cell: (m) => {
        const cfg = STATUS_CONFIG[m.status];
        return (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", cfg.bg, cfg.text)}>
            <span className={cn("size-1.5 rounded-full", cfg.dot, cfg.pulse && "animate-pulse")} />
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: "created_at",
      header: "Date",
      sortable: true,
      sortValue: (m) => m.created_at ?? "",
      className: "font-mono text-xs font-semibold text-faint",
      cell: (m) =>
        m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—",
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Secrétariat"
        title="Messages de contact"
        subtitle={`${table.total} message${table.total > 1 ? "s" : ""}${pendingCount > 0 ? ` · ${pendingCount} en attente` : ""} · consultez et traitez les demandes des visiteurs.`}
      />

      <StatusBanner status={status} className="mb-6" />

      {/* Tabs */}
      <div className="mb-6 flex gap-3 border-b border-[rgba(40,25,80,0.08)] pb-2">
        {(["messages", "subjects"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "cursor-pointer border-b-2 px-1 pb-2 text-sm font-bold transition",
              activeTab === tab ? "border-indigo text-indigo" : "border-transparent text-faint hover:text-indigo",
            )}
          >
            {tab === "messages" ? "Messages reçus" : "Sujets de contact"}
          </button>
        ))}
      </div>

      {activeTab === "messages" && (
        <>
          {/* Status filter pills */}
          <div className="mb-4 flex w-fit items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key);
                  table.setPage(1);
                }}
                className={cn(
                  "cursor-pointer rounded-[10px] px-3.5 py-2 text-xs font-bold transition",
                  statusFilter === f.key ? "bg-indigo text-white shadow-sm" : "text-body hover:bg-cream hover:text-indigo",
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

          <DataFilters
            search={table.search}
            onSearch={table.setSearch}
            placeholder="Rechercher par nom, email…"
            fields={filterFields}
            filters={table.filters}
            onFilters={table.setFilters}
            onReset={() => {
              table.resetFilters();
              setStatusFilter("all");
            }}
          />

          <DataTable
            columns={columns}
            rows={table.view}
            getKey={(m) => m.id}
            sortBy={table.sortBy}
            sortDir={table.sortDir}
            onSort={table.toggleSort}
            onRowClick={openMessage}
            rowClassName={(m) => (selectedId === m.id ? "bg-gold/5" : undefined)}
            empty={
              <div className="flex flex-col items-center gap-3 py-8">
                <Inbox className="size-10 text-gold/40" />
                <p className="text-sm font-semibold text-body-strong">Aucun message</p>
                <p className="max-w-xs text-xs text-body">Les nouveaux messages de contact apparaîtront ici.</p>
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
              itemLabel: "messages",
            }}
          />
        </>
      )}

      {activeTab === "subjects" && (
        <div className="max-w-xl animate-fade-up rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
          <h2 className="mb-2 font-display text-lg font-bold text-indigo">Gérer les sujets de contact</h2>
          <p className="mb-6 text-xs text-body">
            Ces sujets s&apos;afficheront dans la liste déroulante du formulaire public pour orienter le visiteur.
          </p>

          <div className="mb-6 flex gap-2">
            <input
              type="text"
              placeholder="Ajouter un sujet (ex: Demande de baptême)"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream px-4 text-xs text-indigo outline-none focus:border-gold"
            />
            <Button size="sm" loading={savingSubjects} disabled={!newSubject.trim()} onClick={handleAddSubject}>
              Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {subjects.map((sub) => (
              <div key={sub} className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(40,25,80,0.08)] bg-cream px-4 py-2.5">
                <span className="text-xs font-semibold text-indigo">{sub}</span>
                <button
                  onClick={() => handleDeleteSubject(sub)}
                  disabled={savingSubjects}
                  className="cursor-pointer text-xs font-bold text-live hover:underline disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            ))}
            {subjects.length === 0 && <p className="py-6 text-center text-xs text-faint">Aucun sujet configuré.</p>}
          </div>
        </div>
      )}

      {/* Detail Dialog (bespoke) */}
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        {selected && (
          <DialogContent
            showCloseButton
            className="w-[95vw] md:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-0 gap-0 border-0 outline-none animate-fade-up"
          >
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4">
              <div>
                <span className="text-[10px] font-bold tracking-[0.18em] text-gold-dark uppercase">Message · {selected.subject}</span>
                <h2 className="mt-0.5 font-display text-xl font-bold text-indigo italic">{selected.name}</h2>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_CONFIG[selected.status].bg, STATUS_CONFIG[selected.status].text)}>
                {selected.status === "pending" && <Clock className="size-3" />}
                {selected.status === "read" && <CheckCircle className="size-3" />}
                {STATUS_CONFIG[selected.status].label}
              </span>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <User className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Nom complet</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.name}</div>
                  </div>
                </div>

                <a href={`mailto:${selected.email}`} className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5 transition hover:border-gold hover:bg-cream">
                  <Mail className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Email</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.email}</div>
                  </div>
                </a>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <Phone className="size-4 text-faint" />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-faint uppercase">Téléphone</div>
                      {selected.phone ? (
                        <a href={`tel:${selected.phone}`} className="truncate text-sm font-semibold text-indigo hover:underline">
                          {selected.phone}
                        </a>
                      ) : (
                        <span className="truncate text-sm font-semibold text-indigo">Non renseigné</span>
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

                <div className="flex items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.1)] bg-muted/10 px-3.5 py-2.5">
                  <Inbox className="size-4 text-faint" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-faint uppercase">Sujet</div>
                    <div className="truncate text-sm font-semibold text-indigo">{selected.subject}</div>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">Message</h3>
                <p className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-line text-body-strong">{selected.message}</p>
              </section>

              {selected.replied_at && (
                <div className="flex gap-3 rounded-xl border border-indigo/10 bg-indigo/5 p-4 text-xs text-indigo">
                  <CheckCircle className="size-5 shrink-0 text-gold-dark" />
                  <div>
                    <p className="font-bold">Réponse apportée</p>
                    <p className="mt-1 leading-relaxed">
                      Traitée le : {new Date(selected.replied_at).toLocaleString("fr-FR")}.
                      {selected.replied_by_user && <span> Par : {selected.replied_by_user.name}</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
              {canManage ? (
                <div className="flex items-center justify-end gap-3">
                  {selected.phone && (
                    <button
                      onClick={() => handleReplyAction(selected)}
                      disabled={isPending}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
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
    </PageShell>
  );
}
