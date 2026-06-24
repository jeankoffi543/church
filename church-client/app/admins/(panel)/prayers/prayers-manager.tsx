"use client";

import { useState, useTransition, useCallback, useEffect, useMemo } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  SlidersHorizontal,
  Search,
  X,
  Save,
  Phone,
  Mail,
  User,
  BookHeart,
} from "lucide-react";
import type { AdminPrayerRequest, AdminUser, AdminListMeta } from "@/lib/admin-api";
import {
  updatePrayerStatus,
  assignPrayer,
  updatePrayer,
  deletePrayer,
  updateAdminSettings,
  getAdminPrayersPaginated,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Pagination } from "../_components/pagination";
import { useServerList } from "../_components/use-server-list";
import { QueryBuilder, serializeFiltersForQueryMaster } from "@/components/admin/query-builder";
import type { FilterField, ActiveFilter } from "@/components/admin/query-builder";

export const PRAYERS_PER_PAGE = 10;

/* ── Constants ───────────────────────────────────────────────────── */

type StatusFilter = "all" | "new" | "praying" | "answered" | "archived";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "new", label: "Nouvelles" },
  { key: "praying", label: "En prière" },
  { key: "answered", label: "Exaucées" },
  { key: "archived", label: "Archivées" },
];

const STATUS_CONFIG: Record<
  AdminPrayerRequest["status"],
  { label: string; dot: string; bg: string; text: string; pulse?: boolean }
> = {
  new: {
    label: "Nouvelle",
    dot: "bg-live",
    bg: "bg-live/10",
    text: "text-live",
    pulse: true,
  },
  praying: {
    label: "En prière",
    dot: "bg-gold",
    bg: "bg-gold/10",
    text: "text-gold-dark",
  },
  answered: {
    label: "Exaucée",
    dot: "bg-online",
    bg: "bg-online/10",
    text: "text-online",
  },
  archived: {
    label: "Archivée",
    dot: "bg-faint",
    bg: "bg-faint/10",
    text: "text-faint",
  },
};

const PLACEHOLDERS = [
  { tag: "{{name}}", label: "Nom du demandeur" },
  { tag: "{{email}}", label: "Email" },
  { tag: "{{message}}", label: "Nom du message" },
  { tag: "{{category}}", label: "Catégorie de prière" },
  { tag: "{{phone}}", label: "Téléphone du demandeur" },
  { tag: "{{pastor_name}}", label: "Nom du pasteur assigné" },
];

/* ── Component ───────────────────────────────────────────────────── */

export function PrayersManager({
  initialPrayers,
  initialMeta,
  initialNewCount,
  users,
  initialSuccessMessage,
  initialNotificationMessage,
  initialCategories,
}: {
  initialPrayers: AdminPrayerRequest[];
  initialMeta: AdminListMeta;
  initialNewCount: number;
  users: AdminUser[];
  initialSuccessMessage: string;
  initialNotificationMessage: string;
  initialCategories: string[];
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PRAYERS_PER_PAGE);
  const [sortBy, setSortBy] = useState<"name" | "category" | "message" | "status" | "assigned_to" | "created_at" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Server-side list (search / filters / sort / pagination via QueryMaster).
  const prayerFilters: Record<string, string> = { ...serializeFiltersForQueryMaster(activeFilters) };
  if (statusFilter !== "all") {
    prayerFilters.status = statusFilter;
  }
  if (categoryFilter !== "all") {
    prayerFilters.category = categoryFilter;
  }

  const {
    items: prayers,
    setItems: setPrayers,
    meta,
    isLoading,
    refresh,
  } = useServerList<AdminPrayerRequest>({
    fetcher: getAdminPrayersPaginated,
    params: {
      page,
      perPage,
      search,
      sort: sortBy && sortOrder ? { field: sortBy, dir: sortOrder } : null,
      filters: prayerFilters,
    },
    initialData: initialPrayers,
    initialMeta,
  });

  // The "new" badge needs the global count, not just the visible page.
  const [newCount, setNewCount] = useState(initialNewCount);
  const refreshNew = useCallback(() => {
    getAdminPrayersPaginated({ filters: { status: "new" }, perPage: 1 })
      .then((res) => setNewCount(res.meta.total))
      .catch(() => {});
  }, []);

  // Panel-local form state
  const [panelNotes, setPanelNotes] = useState("");

  // Configuration tab state
  const [activeTab, setActiveTab] = useState<"list" | "config">("list");
  const [successMessage, setSuccessMessage] = useState(initialSuccessMessage);
  const [notificationMessage, setNotificationMessage] = useState(initialNotificationMessage);
  const [categories, setCategories] = useState<string[]>(
    initialCategories.length > 0
      ? initialCategories
      : ["Délivrance", "Santé", "Finances", "Famille", "Destinée", "Autre"]
  );

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const isDuplicate = newCategoryName.trim() !== "" && categories.some(
    (c) => c.toLowerCase() === newCategoryName.trim().toLowerCase()
  );

  const isEditingDuplicate = editingCategoryIndex !== null && editingCategoryName.trim() !== "" && categories.some(
    (c, idx) => idx !== editingCategoryIndex && c.toLowerCase() === editingCategoryName.trim().toLowerCase()
  );

  const handleTabChange = (tab: "list" | "config") => {
    setActiveTab(tab);
    setStatus(null);
    setMentionSearch(null);
  };

  // Mentions / Placeholders Autocomplete state
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState<number | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const [cursorPos, setCursorPos] = useState<number>(0);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotificationMessage(value);
    setStatus(null);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);
    
    // Find the last "@" before the cursor that is either at start or after a space/newline
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    if (lastAtIdx !== -1 && (lastAtIdx === 0 || textBeforeCursor[lastAtIdx - 1] === " " || textBeforeCursor[lastAtIdx - 1] === "\n")) {
      const typedAfterAt = textBeforeCursor.substring(lastAtIdx + 1);
      // Ensure no spaces or newlines in the typed text after "@"
      if (!typedAfterAt.includes(" ") && !typedAfterAt.includes("\n")) {
        setMentionSearch(typedAfterAt.toLowerCase());
        setMentionTriggerIndex(lastAtIdx);
        setMentionSelectedIndex(0);
        return;
      }
    }
    
    setMentionSearch(null);
  };

  const handleCaretPosition = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    let start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    if (start === end) {
      // Find if the caret is inside any placeholder
      const parts = text.split(/(\{\{name\}\}|\{\{email\}\}|\{\{message\}\}|\{\{category\}\}|\{\{phone\}\}|\{\{pastor_name\}\})/g);
      let currentIdx = 0;
      
      for (const part of parts) {
        const startIdx = currentIdx;
        currentIdx += part.length;
        const endIdx = currentIdx;
        
        const isPlaceholder = PLACEHOLDERS.some(p => p.tag === part);
        if (isPlaceholder) {
          if (start > startIdx && start < endIdx) {
            const snapPos = (start - startIdx < endIdx - start) ? startIdx : endIdx;
            textarea.setSelectionRange(snapPos, snapPos);
            start = snapPos;
            break;
          }
        }
      }
    }
    setCursorPos(start);
  };

  const selectSuggestion = (
    placeholder: typeof PLACEHOLDERS[number]
  ) => {
    if (mentionTriggerIndex === null) return;
    const textareaEl = document.getElementById("prayer-notification-template") as HTMLTextAreaElement | null;
    if (!textareaEl) return;
    
    const cursorPosition = textareaEl.selectionStart;
    
    // Select the "@" and any typed search letters
    textareaEl.focus();
    textareaEl.setSelectionRange(mentionTriggerIndex, cursorPosition);
    
    // Natively replace selection to preserve Undo/Redo (Ctrl+Z)
    document.execCommand('insertText', false, placeholder.tag);
    
    setMentionSearch(null);
    setStatus(null);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Mentions autocomplete navigation
    if (mentionSearch !== null) {
      const filtered = PLACEHOLDERS.filter(p => 
        p.label.toLowerCase().includes(mentionSearch) || 
        p.tag.toLowerCase().includes(mentionSearch)
      );

      if (filtered.length > 0) {
        const currentIndex = mentionSelectedIndex >= filtered.length ? 0 : mentionSelectedIndex;

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionSelectedIndex((currentIndex + 1) % filtered.length);
          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionSelectedIndex((currentIndex - 1 + filtered.length) % filtered.length);
          return;
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          selectSuggestion(filtered[currentIndex]);
          return;
        }
      }
      
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionSearch(null);
        return;
      }
    }

    // 2. Atomic tag deletion and caret jumping
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    if (start === end) {
      if (e.key === "Backspace") {
        // Check if cursor is immediately after a tag
        const beforeCursor = text.substring(0, start);
        for (const p of PLACEHOLDERS) {
          if (beforeCursor.endsWith(p.tag)) {
            e.preventDefault();
            const tagLength = p.tag.length;
            // Select the tag range
            textarea.setSelectionRange(start - tagLength, start);
            // Natively delete to preserve Undo/Redo (Ctrl+Z)
            document.execCommand('delete', false);
            return;
          }
        }
      } else if (e.key === "Delete") {
        // Check if cursor is immediately before a tag
        const afterCursor = text.substring(end);
        for (const p of PLACEHOLDERS) {
          if (afterCursor.startsWith(p.tag)) {
            e.preventDefault();
            const tagLength = p.tag.length;
            // Select the tag range
            textarea.setSelectionRange(start, start + tagLength);
            // Natively delete to preserve Undo/Redo (Ctrl+Z)
            document.execCommand('delete', false);
            return;
          }
        }
      } else if (e.key === "ArrowLeft") {
        // Jump over tag if moving left into one
        const beforeCursor = text.substring(0, start);
        for (const p of PLACEHOLDERS) {
          if (beforeCursor.endsWith(p.tag)) {
            e.preventDefault();
            const newPos = start - p.tag.length;
            textarea.setSelectionRange(newPos, newPos);
            return;
          }
        }
      } else if (e.key === "ArrowRight") {
        // Jump over tag if moving right into one
        const afterCursor = text.substring(end);
        for (const p of PLACEHOLDERS) {
          if (afterCursor.startsWith(p.tag)) {
            e.preventDefault();
            const newPos = end + p.tag.length;
            textarea.setSelectionRange(newPos, newPos);
            return;
          }
        }
      }
    }
  };

  const insertPlaceholder = (tag: string, textareaEl: HTMLTextAreaElement) => {
    textareaEl.focus();
    // Natively insert text to preserve Undo/Redo (Ctrl+Z)
    document.execCommand('insertText', false, tag);
    setStatus(null);
  };

  const renderHighlightedText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\{\{name\}\}|\{\{email\}\}|\{\{message\}\}|\{\{category\}\}|\{\{phone\}\}|\{\{pastor_name\}\})/g);
    let currentIdx = 0;
    
    return parts.map((part, idx) => {
      const startIdx = currentIdx;
      currentIdx += part.length;
      const endIdx = currentIdx;
      
      const isPlaceholder = PLACEHOLDERS.some(p => p.tag === part);
      if (isPlaceholder) {
        // Check if cursor is touching the placeholder (either at start or end of it)
        const isCursorTouching = cursorPos >= startIdx && cursorPos <= endIdx;
        
        return (
          <span
            key={idx}
            className={cn(
              "inline rounded-[3px] select-none transition-all duration-150",
              isCursorTouching
                ? "bg-[#e2b85f]/35 outline outline-1 outline-[#e2b85f] shadow-[0_1px_3px_rgba(226,184,95,0.2)]"
                : "bg-[#e2b85f]/15 outline outline-1 outline-[#e2b85f]/25"
            )}
            style={{
              color: 'transparent',
              padding: '0',
              margin: '0',
              outlineOffset: '-1px',
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={idx} style={{ color: 'transparent' }}>{part}</span>;
    });
  };

  useEffect(() => {
    const textarea = document.getElementById("prayer-notification-template") as HTMLTextAreaElement | null;
    const mirror = document.getElementById("prayer-template-mirror");
    if (textarea && mirror) {
      mirror.scrollTop = textarea.scrollTop;
    }
  }, [notificationMessage]);

  const selected = prayers.find((p) => p.id === selectedId) ?? null;

  /* helpers */
  const openPanel = useCallback(
    (prayer: AdminPrayerRequest) => {
      setSelectedId(prayer.id);
      setPanelNotes(prayer.pastoral_notes ?? "");
      setStatus(null);
    },
    [],
  );

  const closePanel = useCallback(() => {
    setSelectedId(null);
  }, []);

  const replaceInList = useCallback(
    (updated: AdminPrayerRequest) =>
      setPrayers((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p)),
      ),
    [setPrayers],
  );

  /* ── Actions ──────────────────────────────────────────────── */

  const handleStatusChange = (
    prayer: AdminPrayerRequest,
    newStatus: AdminPrayerRequest["status"],
  ) => {
    // optimistic
    replaceInList({ ...prayer, status: newStatus });
    startTransition(async () => {
      try {
        const res = await updatePrayerStatus(prayer.id, newStatus);
        replaceInList(res.data);
        refresh();
        refreshNew();
        setStatus({ type: "success", message: "Statut mis à jour." });
      } catch (err) {
        replaceInList(prayer); // rollback
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible de changer le statut.",
        });
      }
    });
  };

  const handleAssign = (
    prayer: AdminPrayerRequest,
    userId: number | null,
  ) => {
    const assignee = userId
      ? users.find((u) => u.id === userId) ?? null
      : null;
    replaceInList({
      ...prayer,
      assigned_to: userId,
      assignee: assignee
        ? { id: assignee.id, name: assignee.name, email: assignee.email }
        : null,
    });
    startTransition(async () => {
      try {
        const res = await assignPrayer(prayer.id, userId);
        replaceInList(res.data);
        refresh();
        setStatus({ type: "success", message: "Intercesseur assigné." });
      } catch (err) {
        replaceInList(prayer);
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible d\u2019assigner.",
        });
      }
    });
  };

  const handleSaveNotes = (prayer: AdminPrayerRequest) => {
    startTransition(async () => {
      try {
        const res = await updatePrayer(prayer.id, {
          pastoral_notes: panelNotes || null,
        });
        replaceInList(res.data);
        setStatus({
          type: "success",
          message: "Notes pastorales enregistrées.",
        });
      } catch (err) {
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Erreur lors de la sauvegarde.",
        });
      }
    });
  };

  const handleMarkAnswered = async (prayer: AdminPrayerRequest) => {
    // Copy the prayer text + testimony to clipboard
    const text = `Témoignage – ${prayer.name ?? "Anonyme"}\nCatégorie : ${prayer.category}\n\n${prayer.message}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard may fail silently
    }
    handleStatusChange(prayer, "answered");
  };

  const handleDelete = (prayer: AdminPrayerRequest) => {
    const displayName = prayer.name ?? "Anonyme";
    if (
      !confirm(
        `Voulez-vous vraiment supprimer la requête de "${displayName}" ?`,
      )
    )
      return;

    setPrayers((prev) => prev.filter((p) => p.id !== prayer.id));
    closePanel();
    startTransition(async () => {
      try {
        await deletePrayer(prayer.id);
        refresh();
        refreshNew();
        setStatus({ type: "success", message: "Requête supprimée." });
      } catch (err) {
        // rollback
        setPrayers((prev) =>
          [...prev, prayer].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          ),
        );
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible de supprimer.",
        });
      }
    });
  };

  const handleSaveConfig = () => {
    startTransition(async () => {
      try {
        const payload = [
          { key: "prayer_success_ui_message", value: successMessage, group: "prayers" },
          { key: "prayer_automated_notification_message", value: notificationMessage, group: "prayers" },
          { key: "prayer_categories", value: categories, group: "prayers" },
        ];
        await updateAdminSettings(payload);
        setStatus({ type: "success", message: "Configuration des réponses et catégories enregistrée." });
      } catch (err) {
        const error = err as Error;
        setStatus({
          type: "error",
          message: error.message || "Impossible d'enregistrer la configuration.",
        });
      }
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setCategories((prev) => [...prev, trimmed]);
    setNewCategoryName("");
    setStatus(null);
  };

  const handleStartEditCategory = (index: number, name: string) => {
    setEditingCategoryIndex(index);
    setEditingCategoryName(name);
  };

  const handleSaveEditCategory = () => {
    if (editingCategoryIndex === null) return;
    const trimmed = editingCategoryName.trim();
    if (!trimmed) return;
    if (categories.some((c, idx) => idx !== editingCategoryIndex && c.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setCategories((prev) =>
      prev.map((c, idx) => (idx === editingCategoryIndex ? trimmed : c))
    );
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
    setStatus(null);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryIndex(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = (index: number) => {
    const categoryName = categories[index];
    if (
      !confirm(
        `Voulez-vous vraiment supprimer la catégorie "${categoryName}" ?`
      )
    )
      return;
    setCategories((prev) => prev.filter((_, idx) => idx !== index));
    setStatus(null);
  };

  /* ── Derived ──────────────────────────────────────────────── */

  const filterFields: FilterField[] = useMemo(() => [
    { id: "name", label: "Nom", type: "text" },
    { id: "email", label: "Email", type: "text" },
    { id: "phone", label: "Téléphone", type: "text" },
    { id: "message", label: "Message", type: "text" },
    { 
      id: "category", 
      label: "Catégorie", 
      type: "select", 
      options: categories.map((cat) => ({ value: cat, label: cat }))
    }
  ], [categories]);

  const clearAllFilters = () => {
    setActiveFilters([]);
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  const handleSort = (column: "name" | "category" | "message" | "status" | "assigned_to" | "created_at") => {
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

  const renderSortChevron = (column: "name" | "category" | "message" | "status" | "assigned_to" | "created_at") => {
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
  const filtered = prayers;
  const total = meta.total;
  const pageCount = Math.max(1, meta.last_page);
  const currentPage = meta.current_page;

  const whatsappUrl = (prayer: AdminPrayerRequest) => {
    const phone = prayer.phone.replace(/^\+/, "");
    const name = encodeURIComponent(prayer.name ?? "frère/sœur");
    return `https://wa.me/${phone}?text=Bonjour%20${name}%2C%20l'%C3%A9quipe%20d'intercession%20de%20MFM%20Ficgayo%20a%20bien%20re%C3%A7u%20votre%20demande%20de%20pri%C3%A8re.%20Nous%20prions%20pour%20vous.`;
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div className="relative mx-auto max-w-[1100px] animate-fade-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Intercession
          </span>
          <h1 className="mt-1 flex items-center gap-3 font-display text-[34px] font-semibold text-indigo italic">
            Requêtes de Prière
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/10 px-3 py-1 text-[13px] font-bold not-italic text-indigo">
              {total}
              {newCount > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-live text-[10px] font-black text-white animate-pulse">
                  {newCount}
                </span>
              )}
            </span>
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez les demandes de prière, assignez les intercesseurs et suivez les exaucements.
          </p>
        </div>
      </header>

      {/* ── Status feedback ─────────────────────────────────── */}
      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm",
            status.type === "success"
              ? "border-online/20 bg-online/5 text-body-strong"
              : "border-live/20 bg-live/5 text-live",
          )}
        >
          {status.type === "success" ? (
            <CheckCircle className="size-5 shrink-0 text-online" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-live" />
          )}
          <div>
            <p className="font-bold">
              {status.type === "success" ? "Succès" : "Erreur"}
            </p>
            <p className="mt-0.5 text-xs text-body">{status.message}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-[rgba(40,25,80,0.08)] pb-px">
        <button
          onClick={() => handleTabChange("list")}
          className={cn(
            "cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
            activeTab === "list"
              ? "border-indigo text-indigo"
              : "border-transparent text-body hover:text-indigo"
          )}
        >
          Liste des Requêtes
        </button>
        <button
          onClick={() => handleTabChange("config")}
          className={cn(
            "cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-all",
            activeTab === "config"
              ? "border-indigo text-indigo"
              : "border-transparent text-body hover:text-indigo"
          )}
        >
          Configuration des Réponses
        </button>
      </div>

      {activeTab === "list" ? (
        <>
          {/* ── Filter bar ──────────────────────────────────────── */}
          {/* ── Filter bar ──────────────────────────────────────── */}
          <div className="mb-6 flex flex-wrap items-center gap-3 z-20 relative">
            {/* Status pills */}
            <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.1)] bg-white p-1 shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
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
                      : "text-body hover:bg-cream hover:text-indigo",
                  )}
                >
                  {f.label}
                  {f.key === "new" && newCount > 0 && (
                    <span className="ml-1.5 inline-flex size-4 items-center justify-center rounded-full bg-live text-[9px] font-black text-white">
                      {newCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Category dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.1)] bg-white py-2.5 pr-9 pl-3.5 text-xs font-bold text-indigo shadow-[0_1px_3px_rgba(22,15,51,0.02)] outline-none transition hover:border-gold focus:border-gold"
              >
                <option value="all">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-faint" />
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

          {/* ── Data table ──────────────────────────────────────── */}
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
                        <span>Demandeur</span>
                        {renderSortChevron("name")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                      onClick={() => handleSort("category")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Catégorie</span>
                        {renderSortChevron("category")}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer transition hover:text-gold-dark"
                      onClick={() => handleSort("message")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Message</span>
                        {renderSortChevron("message")}
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
                      onClick={() => handleSort("assigned_to")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Assigné à</span>
                        {renderSortChevron("assigned_to")}
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
                  {filtered.map((prayer) => {
                    const cfg = STATUS_CONFIG[prayer.status];
                    return (
                      <tr
                        key={prayer.id}
                        onClick={() => openPanel(prayer)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-cream/40",
                          selectedId === prayer.id && "bg-gold/5",
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo/5 text-xs font-bold text-indigo">
                              {(prayer.name ?? "A")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">
                                {prayer.name ?? "Anonyme"}
                              </p>
                              {prayer.phone && (
                                <p className="text-[11px] text-faint">
                                  {prayer.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-indigo/5 px-2.5 py-1 text-[11px] font-bold text-indigo">
                            {prayer.category}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-6 py-4">
                          <p className="truncate text-xs text-body">
                            {prayer.message}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                              cfg.bg,
                              cfg.text,
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                cfg.dot,
                                cfg.pulse && "animate-pulse",
                              )}
                            />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-body">
                          {prayer.assignee?.name ?? (
                            <span className="italic text-faint">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-faint">
                          {new Date(prayer.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Empty state ──────────────────────────────── */}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <BookHeart className="size-10 text-gold/40" />
                          <p className="text-sm font-semibold text-body-strong">
                            Aucune requête trouvée
                          </p>
                          <p className="max-w-xs text-xs text-body">
                            Il n&apos;y a pas de demandes de prière correspondant
                            aux filtres sélectionnés.
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
                onPageChange={(page) => {
                  setPage(page);
                  setStatus(null);
                }}
                onPerPageChange={(newPerPage) => {
                  setPerPage(newPerPage);
                  setPage(1);
                  setStatus(null);
                }}
                itemLabel="requêtes"
              />
            )}
          </div>
        </>
      ) : (
        <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)] animate-fade-up">
          <h2 className="font-display text-lg font-bold text-indigo italic mb-4">
            Configuration des réponses
          </h2>
          
          <div className="space-y-6">
            {/* success message */}
            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Message de succès (Sur le site web)
              </span>
              <span className="text-xs text-faint">
                Ce message s&apos;affichera à l&apos;écran du demandeur après soumission de sa requête de prière.
              </span>
              <textarea
                value={successMessage}
                onChange={(e) => {
                  setSuccessMessage(e.target.value);
                  setStatus(null);
                }}
                rows={3}
                placeholder="Merci ! Votre requête est entrée dans la chaîne d'intercession..."
                className="w-full rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 py-3 text-sm text-indigo outline-none focus:border-gold resize-none leading-relaxed"
              />
            </label>

            {/* notification template */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide">
                Modèle de notification automatique (SMS/Email/WhatsApp)
              </span>
              <span className="text-xs text-faint">
                Modèle utilisé pour envoyer une confirmation. Tapez <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-[11px] font-bold text-gold-dark">@</code> pour insérer des variables dynamiques ou cliquez sur les badges ci-dessous.
              </span>

              {/* Suggestions cliquables (Boutons de suggestions rapides) */}
              <div className="flex flex-wrap gap-1.5 py-1">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.tag}
                    type="button"
                    onClick={() => {
                      const textareaEl = document.getElementById("prayer-notification-template") as HTMLTextAreaElement | null;
                      if (textareaEl) {
                        insertPlaceholder(p.tag, textareaEl);
                      }
                    }}
                    className="cursor-pointer rounded-lg border border-[rgba(40,25,80,0.08)] bg-cream px-2.5 py-1 text-xs font-semibold text-indigo transition hover:bg-gold/10 hover:text-gold-dark hover:border-gold/30"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>

              {/* Textarea container avec menu flottant et surbrillance */}
              <div className="relative">
                <div className="relative rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] focus-within:border-gold transition-all overflow-hidden">
                  {/* Div miroir en dessous pour la surbrillance des tags */}
                  <div
                    id="prayer-template-mirror"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-transparent select-none"
                    style={{
                      fontFamily: 'inherit',
                      height: '135px',
                      width: '100%',
                      border: '0',
                      margin: '0',
                      padding: '12px 16px',
                    }}
                  >
                    {renderHighlightedText(notificationMessage)}
                  </div>

                  {/* Textarea au-dessus avec fond transparent */}
                  <textarea
                    id="prayer-notification-template"
                    value={notificationMessage}
                    onChange={(e) => {
                      handleTextareaChange(e);
                      handleCaretPosition(e);
                    }}
                    onKeyDown={handleTextareaKeyDown}
                    onKeyUp={handleCaretPosition}
                    onMouseUp={handleCaretPosition}
                    onFocus={handleCaretPosition}
                    onClick={handleCaretPosition}
                    onScroll={(e) => {
                      const mirror = document.getElementById("prayer-template-mirror");
                      if (mirror) {
                        mirror.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                    rows={5}
                    placeholder="Bonjour {{name}}, votre demande..."
                    className="w-full bg-transparent text-sm text-indigo outline-none resize-none leading-relaxed block relative z-10 border-0 focus:ring-0"
                    style={{
                      height: '135px',
                      margin: '0',
                      padding: '12px 16px',
                    }}
                  />
                </div>

                {/* Pop-over de mentions flottante */}
                {mentionSearch !== null && (
                  (() => {
                    const filtered = PLACEHOLDERS.filter(p => 
                      p.label.toLowerCase().includes(mentionSearch) || 
                      p.tag.toLowerCase().includes(mentionSearch)
                    );
                    if (filtered.length === 0) return null;
                    const activeIndex = mentionSelectedIndex >= filtered.length ? 0 : mentionSelectedIndex;
                    return (
                      <div className="absolute left-0 top-full z-50 mt-1.5 max-h-56 w-72 overflow-y-auto overflow-x-hidden rounded-xl border border-[#e2b85f]/30 bg-gradient-to-b from-[#1c1830] to-[#120e24] p-1.5 shadow-2xl animate-fade-up backdrop-blur-md flex flex-col gap-0.5">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-faint/60 uppercase tracking-wider border-b border-white/5 mb-1 flex items-center justify-between">
                          <span>Suggestions</span>
                          <span className="font-normal text-[9px] lowercase italic text-faint/40">↑↓ naviguer, ↵ valider</span>
                        </div>
                        {filtered.map((p, idx) => (
                          <button
                            key={p.tag}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); // évite de perdre le focus sur le textarea
                            }}
                            onClick={() => selectSuggestion(p)}
                            onMouseEnter={() => setMentionSelectedIndex(idx)}
                            className={cn(
                              "m-0 flex w-full box-border cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition-all duration-150 border-0 outline-none select-none",
                              activeIndex === idx
                                ? "bg-[#e2b85f]/15 text-[#e2b85f]"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                            )}
                          >
                            <span>{p.label}</span>
                            <span className="font-mono text-[10px] text-gold/60">{p.tag}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* categories management */}
            <div className="border-t border-[rgba(40,25,80,0.08)] pt-6">
              <span className="text-xs font-bold text-body-strong uppercase tracking-wide block mb-2">
                Catégories de demandes de prière
              </span>
              <span className="text-xs text-faint block mb-4">
                Ajoutez, modifiez ou supprimez les catégories disponibles dans le formulaire de prière.
              </span>
              
              {/* list of categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-full border border-indigo/10 bg-cream pl-3 pr-2 py-1 text-xs font-bold text-indigo"
                  >
                    {editingCategoryIndex === idx ? (
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={(e) => {
                          setEditingCategoryName(e.target.value);
                          setStatus(null);
                        }}
                        className={cn(
                          "bg-white border rounded px-1.5 py-0.5 text-xs text-indigo outline-none w-[120px] transition-all",
                          isEditingDuplicate
                            ? "border-live focus:border-live"
                            : "border-[rgba(40,25,80,0.15)] focus:border-gold"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!isEditingDuplicate) {
                              handleSaveEditCategory();
                            }
                          }
                          if (e.key === "Escape") handleCancelEditCategory();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span>{cat}</span>
                    )}

                    <div className="flex items-center gap-0.5 ml-1">
                      {editingCategoryIndex === idx ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEditCategory}
                            disabled={isEditingDuplicate || !editingCategoryName.trim()}
                            className="cursor-pointer text-online hover:opacity-85 font-black p-0.5 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditCategory}
                            className="cursor-pointer text-live hover:opacity-85 font-black p-0.5"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(idx, cat)}
                            className="cursor-pointer text-gold-dark hover:brightness-110 p-0.5"
                            title="Modifier"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(idx)}
                            className="cursor-pointer text-live hover:opacity-85 p-0.5"
                            title="Supprimer"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* add category input */}
              <div className="flex flex-col gap-1.5 max-w-sm">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nouvelle catégorie (ex: Professionnel)"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setStatus(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!isDuplicate) {
                          handleAddCategory();
                        }
                      }
                    }}
                    className={cn(
                      "flex-1 rounded-xl border bg-[#faf8f4] px-3.5 py-2 text-xs text-indigo outline-none transition-all",
                      isDuplicate
                        ? "border-live focus:border-live"
                        : "border-[rgba(40,25,80,0.12)] focus:border-gold"
                    )}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    disabled={isDuplicate || !newCategoryName.trim()}
                    className="cursor-pointer rounded-xl bg-indigo px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-mid disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Ajouter
                  </button>
                </div>
                {isDuplicate && (
                  <span className="text-[11px] font-semibold text-live pl-1">
                    Cette catégorie existe déjà.
                  </span>
                )}
              </div>
            </div>

            {/* save button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={isPending}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-5 py-3 text-xs font-bold text-indigo shadow-md transition hover:brightness-105 disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Enregistrer la configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────── */}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) closePanel(); }}>
        {selected && (
          <DialogContent showCloseButton={true} className="w-[95vw] md:w-full md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col p-0 gap-0 border-0 outline-none animate-fade-up">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.08)] px-6 py-4 shrink-0">
              <h2 className="font-display text-lg font-bold text-indigo italic">
                Détails de la requête
              </h2>
            </div>

              {/* two-column body */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* ── LEFT COLUMN: Demandeur info ─────────────── */}
                  <div className="space-y-5 border-b md:border-b-0 md:border-r border-[rgba(40,25,80,0.08)] px-6 py-6">
                    {/* identity */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Demandeur
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5 text-sm text-indigo">
                          <User className="size-4 text-faint" />
                          <span className="font-semibold">
                            {selected.name ?? "Anonyme"}
                          </span>
                        </div>
                        {selected.phone && (
                          <div className="flex items-center gap-2.5 text-sm text-body">
                            <Phone className="size-4 text-faint" />
                            <span>{selected.phone}</span>
                          </div>
                        )}
                        {selected.email && (
                          <div className="flex items-center gap-2.5 text-sm text-body">
                            <Mail className="size-4 text-faint" />
                            <span>{selected.email}</span>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* contact buttons */}
                    {selected.phone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${selected.phone}`}
                          className="flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(40,25,80,0.12)] px-3 py-2 text-xs font-bold text-indigo transition hover:bg-cream"
                        >
                          <Phone className="size-3.5" />
                          Appeler
                        </a>
                        <a
                          href={whatsappUrl(selected)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
                        >
                          <MessageCircle className="size-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    )}

                    {/* category */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Catégorie
                      </h3>
                      <span className="inline-block rounded-full bg-indigo/5 px-3 py-1 text-xs font-bold text-indigo">
                        {selected.category}
                      </span>
                    </section>

                    {/* message */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Message
                      </h3>
                      <p className="rounded-xl bg-cream p-4 text-sm leading-relaxed text-body-strong">
                        {selected.message}
                      </p>
                    </section>
                  </div>

                  {/* ── RIGHT COLUMN: Treatment form ────────────── */}
                  <div className="space-y-5 px-6 py-6">
                    {/* status */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Statut
                      </h3>
                      <div className="relative">
                        <select
                          value={selected.status}
                          onChange={(e) =>
                            handleStatusChange(
                              selected,
                              e.target.value as AdminPrayerRequest["status"],
                            )
                          }
                          disabled={isPending}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-semibold text-indigo outline-none transition focus:border-gold disabled:opacity-50"
                        >
                          <option value="new">🔴 Nouvelle</option>
                          <option value="praying">🟡 En prière</option>
                          <option value="answered">🟢 Exaucée</option>
                          <option value="archived">⚫ Archivée</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
                      </div>
                    </section>

                    {/* assignee */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Assigné à
                      </h3>
                      <div className="relative">
                        <select
                          value={selected.assigned_to ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleAssign(
                              selected,
                              val ? Number(val) : null,
                            );
                          }}
                          disabled={isPending}
                          className="w-full cursor-pointer appearance-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm font-semibold text-indigo outline-none transition focus:border-gold disabled:opacity-50"
                        >
                          <option value="">— Non assigné —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-faint" />
                      </div>
                    </section>

                    {/* pastoral notes */}
                    <section className="space-y-3">
                      <h3 className="text-[11px] font-bold tracking-[0.15em] text-gold-dark uppercase">
                        Notes pastorales
                      </h3>
                      <textarea
                        value={panelNotes}
                        onChange={(e) => {
                          setPanelNotes(e.target.value);
                          setStatus(null);
                        }}
                        rows={4}
                        placeholder="Ajoutez des notes internes sur cette requête..."
                        className="w-full resize-none rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2.5 text-sm leading-relaxed text-indigo outline-none transition placeholder:text-faint focus:border-gold"
                      />
                      <button
                        onClick={() => handleSaveNotes(selected)}
                        disabled={isPending}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-4 py-2.5 text-xs font-bold text-indigo shadow-sm transition hover:brightness-105 disabled:opacity-50"
                      >
                        {isPending ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        Enregistrer les notes
                      </button>
                    </section>
                  </div>
                </div>
              </div>

              {/* modal footer */}
              <div className="flex items-center gap-3 border-t border-[rgba(40,25,80,0.08)] px-6 py-4">
                <button
                  onClick={() => handleMarkAnswered(selected)}
                  disabled={isPending || selected.status === "answered"}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-online/10 px-4 py-3 text-xs font-bold text-online transition hover:bg-online/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle className="size-4" />
                  Marquer comme Exaucé
                </button>
                <button
                  onClick={() => handleDelete(selected)}
                  disabled={isPending}
                  className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-live/20 px-4 py-3 text-xs font-bold text-live transition hover:bg-live/10 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Supprimer
                </button>
              </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
