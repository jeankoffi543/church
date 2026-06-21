"use client";

import { useState } from "react";
import {
  ArrowRight,
  MapPin,
  Clock,
  Check,
  X,
  Loader2,
  Compass,
} from "lucide-react";

import { HOME_GROUPS, type HomeGroup } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";

type Selection = HomeGroup | "general" | null;

export function HomeGroups({ groups = HOME_GROUPS }: { groups?: HomeGroup[] }) {
  const [selection, setSelection] = useState<Selection>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const open = selection !== null;
  const group = selection && selection !== "general" ? selection : null;

  const onOpenChange = (next: boolean) => {
    if (!next) setSelection(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const label = group ? `la ${group.name}` : "un groupe de maison";
      setSelection(null);
      setToast(
        `Merci ! Ta demande pour rejoindre ${label} a bien été reçue. Un responsable te contactera très vite.`
      );
      setTimeout(() => setToast(null), 4500);
    }, 1400);
  };

  return (
    <>
      <div className="flex flex-wrap gap-[22px]">
        {/* List */}
        <div className="flex flex-[1_1_360px] flex-col gap-3">
          {groups.map((g) => (
            <button
              key={g.name}
              onClick={() => setSelection(g)}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-[14px] border border-[rgba(40,25,80,0.08)] border-l-4 border-l-gold-dark bg-white px-5 py-[18px] text-left transition-all duration-200 hover:translate-x-[3px] hover:shadow-[0_12px_30px_rgba(22,15,51,0.1)]"
            >
              <div>
                <h3 className="mb-[5px] text-base font-bold text-indigo">
                  {g.name}
                </h3>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-[13px] text-body">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" /> {g.area}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {g.when}
                  </span>
                </div>
                <div className="mt-1 text-[12.5px] text-faint">
                  Responsable · {g.leader}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-[13px] font-bold text-indigo-mid">
                Rejoindre <ArrowRight className="size-3.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="relative min-h-[440px] flex-[1_1_360px] overflow-hidden rounded-[20px] border border-[rgba(40,25,80,0.1)] bg-gradient-to-b from-lilac-200 to-lilac-300">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(58,42,110,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(58,42,110,.06) 1px,transparent 1px)",
              backgroundSize: "38px 38px",
            }}
          />
          <div className="absolute top-4 left-4 flex items-center gap-1 rounded-[10px] bg-white/90 px-3.5 py-2 text-[12.5px] font-bold text-indigo shadow-[0_4px_14px_rgba(22,15,51,0.1)]">
            <MapPin className="size-3.5 text-gold-dark" /> Abidjan · Yopougon &
            environs
          </div>
          {groups.map((g) => (
            <button
              key={g.name}
              onClick={() => setSelection(g)}
              aria-label={`Rejoindre ${g.name}`}
              className="absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-125"
              style={{ top: g.top, left: g.left }}
            >
              <span className="block size-[26px] rotate-[-45deg] rounded-[50%_50%_50%_0] border-2 border-white bg-gradient-to-br from-gold to-gold-dark shadow-[0_6px_16px_rgba(200,144,46,0.4)]" />
            </button>
          ))}
          <div className="absolute right-4 bottom-4 left-4">
            <button
              onClick={() => setSelection("general")}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo py-3.5 text-sm font-bold text-white transition hover:bg-indigo-mid"
            >
              <Compass className="size-4" /> Trouver un groupe près de chez moi
            </button>
          </div>
        </div>
      </div>

      {/* Join dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[90%] rounded-xl border border-white/10 bg-ink p-6 text-cream shadow-2xl sm:max-w-md">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-gold uppercase">
              Groupe de maison
            </span>
            <DialogTitle className="font-display text-2xl leading-tight font-bold text-cream italic">
              {group ? `Rejoindre : ${group.name}` : "Trouver mon groupe"}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-[#9a8fb5]">
              {group
                ? `${group.area} · ${group.when} · Responsable ${group.leader}.`
                : "Dis-nous où tu habites, nous t'orientons vers la cellule la plus proche de chez toi."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-left">
            <Field label="Nom complet">
              <Input
                required
                placeholder="Ex: Jean Koffi"
                className={DARK_FIELD}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Téléphone">
                <Input
                  type="tel"
                  required
                  placeholder="+225 07 00 00 00"
                  className={DARK_FIELD}
                />
              </Field>
              <Field label="Quartier">
                <Input
                  required
                  defaultValue={group?.area ?? ""}
                  placeholder="Ex: Yopougon"
                  className={DARK_FIELD}
                />
              </Field>
            </div>
            <Field label="Message (optionnel)">
              <Textarea
                rows={3}
                placeholder="Une précision pour le responsable…"
                className={`${DARK_FIELD} min-h-20 resize-none`}
              />
            </Field>

            <BrandButton
              type="submit"
              disabled={loading}
              variant="gold"
              size="full"
              className="h-12 text-sm font-extrabold"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Envoi en cours…
                </>
              ) : (
                <>
                  Envoyer ma demande <ArrowRight className="size-4" />
                </>
              )}
            </BrandButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed right-5 bottom-5 z-[100] w-full max-w-sm px-4 sm:px-0">
          <div className="flex gap-3 rounded-xl border border-gold/30 bg-ink p-4 shadow-[0_12px_40px_rgba(22,15,51,0.5)]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold">
              <Check className="size-4" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold leading-snug text-cream">
                Demande envoyée
              </p>
              <p className="mt-1 text-xs leading-normal text-[#9a8fb5]">
                {toast}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              aria-label="Fermer"
              className="cursor-pointer border-none bg-transparent p-0 text-[#9a8fb5] outline-none transition-colors hover:text-cream"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const DARK_FIELD =
  "h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-gold focus-visible:ring-3 focus-visible:ring-gold/30 transition-all";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold tracking-wider text-[#9a8fb5] uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}
