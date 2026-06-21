"use client";

import { useRef, useState, useEffect } from "react";
import { ShieldCheck, Send, Check, Download, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  INITIAL_CHAT,
  type ChatMessage,
} from "@/lib/data";
import type { SermonPoint } from "@/lib/api";

export type LiveTab = "chat" | "priere" | "notes" | "description";

const TABS: { id: LiveTab; label: string }[] = [
  { id: "chat", label: "Tchat" },
  { id: "priere", label: "Prière" },
  { id: "notes", label: "Notes" },
];

export function LivePanel({
  tab,
  onTabChange,
  chatEnabled = true,
  isLive = false,
  description = "",
  sermonTitle = "La grâce qui transforme",
  sermonReference = "Romains 5.1-11",
  sermonPoints = [],
}: {
  tab: LiveTab;
  onTabChange: (t: LiveTab) => void;
  chatEnabled?: boolean;
  isLive?: boolean;
  description?: string;
  sermonTitle?: string;
  sermonReference?: string;
  sermonPoints?: SermonPoint[];
}) {
  // If isLive is true, add Description tab after Notes
  const baseTabs = [...TABS];
  if (isLive) {
    baseTabs.push({ id: "description", label: "Description" });
  }
  const tabs = chatEnabled ? baseTabs : baseTabs.filter((t) => t.id !== "chat");

  return (
    <div className="flex max-h-[660px] min-h-[540px] flex-[1_1_340px] flex-col overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.04]">
      {/* Tab bar */}
      <div className="flex border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className="relative flex-1 cursor-pointer px-1.5 py-4 text-[13px] font-bold text-white transition-colors hover:bg-white/5"
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute right-1/5 bottom-0 left-1/5 h-[2.5px] rounded-sm bg-gold" />
            )}
          </button>
        ))}
      </div>

      {tab === "chat" && chatEnabled && <ChatTab />}
      {tab === "priere" && <PrayerTab />}
      {tab === "notes" && (
        <NotesTab
          sermonTitle={sermonTitle}
          sermonReference={sermonReference}
          sermonPoints={sermonPoints}
        />
      )}
      {tab === "description" && isLive && <DescriptionTab description={description} />}
    </div>
  );
}

/* ── Tchat ────────────────────────────────────────────────── */
function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { name: "Vous", you: true, text }]);
    setDraft("");
    requestAnimationFrame(() => {
      if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-4 py-2.5 text-[11.5px] text-white/45">
        <ShieldCheck className="size-3.5" /> Tchat modéré — restons bienveillants
      </div>
      <div
        ref={boxRef}
        className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4"
      >
        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            <span
              className={cn(
                "flex items-center gap-1.5 text-[11.5px] font-bold",
                msg.you ? "text-white/80" : "text-gold"
              )}
            >
              {msg.name}
              {msg.mod && (
                <span className="rounded-[5px] bg-gold/20 px-1.5 py-px text-[9px] tracking-wide text-gold">
                  MODÉRATEUR
                </span>
              )}
            </span>
            <span className="text-sm leading-snug text-white/85">{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Écris un message…"
          className="flex-1 rounded-[10px] border border-white/15 bg-white/10 px-3 py-[11px] text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          onClick={send}
          aria-label="Envoyer"
          className="flex w-11 items-center justify-center rounded-[10px] bg-gradient-to-br from-gold to-gold-dark text-indigo transition hover:brightness-105"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Prière ───────────────────────────────────────────────── */

function PrayerTab() {
  const [sent, setSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<string[]>([
    "Délivrance",
    "Santé",
    "Finances",
    "Famille",
    "Destinée",
    "Autre",
  ]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${apiUrl}/public/settings?group=prayers`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const data = json.data;
          if (data && Array.isArray(data.prayer_categories)) {
            setCategories(data.prayer_categories);
          }
        }
      } catch (err) {
        console.error("Failed to fetch prayer categories client-side:", err);
      }
    };
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCategory("");
    setMessage("");
    setError(null);
  };

  const handleFieldChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!phone.trim() || !email.trim() || !category || !message.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/public/prayer-requests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Anonyme",
            phone: phone.trim(),
            email: email.trim(),
            category,
            message: message.trim(),
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || `Erreur ${res.status}`
        );
      }

      const data = await res.json();
      setSuccessMessage(data.message || "");
      setSent(true);
      resetForm();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-1 animate-fade-up flex-col items-center justify-center gap-4 px-5 py-5 text-center">
        <div className="flex size-[72px] items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-[34px] text-indigo">
          <Check className="size-9" />
        </div>
        <h3 className="font-display text-[26px] text-white italic">
          Nous prions pour toi
        </h3>
        <p className="max-w-[260px] text-sm leading-relaxed text-white/65">
          {successMessage || "Ta demande a été transmise. Tu n'es pas seul(e) \u2014 la Maison se tient avec toi dans la prière."}
        </p>
        <button
          onClick={() => setSent(false)}
          className="cursor-pointer rounded-[10px] border border-white/20 bg-white/10 px-[22px] py-[11px] text-[13px] font-semibold text-white transition hover:bg-white/15"
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/40 focus:border-gold/50";

  return (
    <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
      <div>
        <h3 className="mb-1 font-display text-xl text-white italic">
          Demande de prière
        </h3>
        <p className="text-[12.5px] leading-snug text-white/60">
          Tu traverses une épreuve ? L&apos;équipe d&apos;intercession prie avec
          toi, en toute confidentialité.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/15 px-3 py-2 text-[12.5px] text-red-300">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="mb-0.5 block text-[11.5px] font-semibold text-white/70">
          Nom (facultatif)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleFieldChange(setName, e.target.value)}
          placeholder="Anonyme"
          className={inputClass}
        />
      </div>

      {/* Phone & Email row */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-0.5 block text-[11.5px] font-semibold text-white/70">
            Téléphone <span className="text-gold">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => handleFieldChange(setPhone, e.target.value)}
            placeholder="+225 07 00 00 00"
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className="mb-0.5 block text-[11.5px] font-semibold text-white/70">
            Email <span className="text-gold">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => handleFieldChange(setEmail, e.target.value)}
            placeholder="email@exemple.com"
            className={inputClass}
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="mb-0.5 block text-[11.5px] font-semibold text-white/70">
          Catégorie <span className="text-gold">*</span>
        </label>
        <select
          value={category}
          onChange={(e) => handleFieldChange(setCategory, e.target.value)}
          className={cn(inputClass, !category && "text-white/40")}
        >
          <option value="" disabled>
            Choisir une catégorie
          </option>
          {categories.map((cat) => (
            <option key={cat} value={cat} className="bg-[#160f33] text-white">
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div className="flex flex-1 flex-col">
        <label className="mb-0.5 block text-[11.5px] font-semibold text-white/70">
          Votre sujet de prière <span className="text-gold">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => handleFieldChange(setMessage, e.target.value)}
          placeholder="Partage ton sujet de prière…"
          className={cn(inputClass, "min-h-[80px] flex-1 resize-none leading-relaxed")}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="cursor-pointer rounded-lg bg-gradient-to-br from-gold to-gold-dark py-2.5 text-[14px] font-bold text-indigo transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>

      <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-white/45">
        <Lock className="size-3" /> Confidentiel · transmis à l&apos;équipe
        d&apos;intercession
      </div>
    </div>
  );
}

/* ── Notes ────────────────────────────────────────────────── */
function NotesTab({
  sermonTitle,
  sermonReference,
  sermonPoints,
}: {
  sermonTitle: string;
  sermonReference: string;
  sermonPoints: SermonPoint[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${sermonTitle}\n${sermonReference}\n\n` + 
      sermonPoints.map(p => `${p.id}. ${p.text} (${p.verse})`).join("\n");
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 animate-fade-up">
      <span className="text-[11px] font-bold tracking-[0.12em] text-gold uppercase">
        Notes du sermon
      </span>
      <h3 className="mt-1.5 mb-1 font-serif text-2xl text-[#e2b85f] italic">
        {sermonTitle}
      </h3>
      <div className="mb-5 text-[13.5px] font-serif text-[#e2b85f]/80 italic">
        {sermonReference}
      </div>
      <div className="flex flex-col gap-3.5">
        {sermonPoints.map((p) => (
          <div key={p.id} className="flex items-start gap-4">
            <span className="w-6 shrink-0 font-display text-lg font-bold text-[#e2b85f]/60 italic">
              {p.id}
            </span>
            <div>
              <div className="text-[14.5px] font-semibold leading-tight text-[#faf8f4]">
                {p.text}
              </div>
              <div className="mt-0.5 text-[12.5px] text-[#9a8fb5]">{p.verse}</div>
            </div>
          </div>
        ))}
      </div>
      <button 
        onClick={handleCopy}
        className="mt-[22px] flex w-full items-center justify-center gap-1.5 rounded-[11px] border border-white/15 bg-white/10 py-3 text-[13px] font-semibold text-white transition hover:bg-white/15 cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="size-4 text-gold animate-scale-up" /> Notes copiées !
          </>
        ) : (
          <>
            <Download className="size-4" /> Copier les notes
          </>
        )}
      </button>
    </div>
  );
}

/* ── Description ──────────────────────────────────────────── */
function DescriptionTab({ description }: { description: string }) {
  return (
    <div className="flex-1 overflow-y-auto p-5 animate-fade-up">
      <span className="text-[11px] font-bold tracking-[0.12em] text-gold uppercase">
        À propos de la diffusion
      </span>
      <h3 className="mt-1.5 mb-3 font-display text-2xl text-white italic">
        Description du Direct
      </h3>
      <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
        {description || "Aucune description fournie pour ce direct."}
      </p>
    </div>
  );
}
