"use client";

import { useState } from "react";
import { Loader2, ArrowRight, Check, X } from "lucide-react";

import { type Ministry } from "@/lib/data";
import { MinistryCard } from "@/components/cards/ministry-card";
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

export function MinistryGrid({ ministries }: { ministries: Ministry[] }) {
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedMinistry(null);
      // Reset form
      setName("");
      setPhone("");
      setEmail("");
      setReason("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const ministryName = selectedMinistry?.name || "";
      setSelectedMinistry(null);
      
      // Reset form
      setName("");
      setPhone("");
      setEmail("");
      setReason("");

      // Trigger Toast
      setToastMessage(
        `Merci ! Votre demande pour rejoindre le ministère "${ministryName}" a bien été envoyée. Un responsable vous contactera sous peu.`
      );

      // Hide toast after 4s
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
    }, 1500);
  };

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[100] w-full max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300 px-4 sm:px-0">
          <div className="flex gap-3 rounded-xl border border-[#e2b85f]/30 bg-ink p-4 shadow-[0_12px_40px_rgba(22,15,51,0.5)]">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e2b85f]/20 text-[#e2b85f]">
              <Check className="size-4 animate-bounce" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[13.5px] font-semibold leading-snug text-cream">
                Demande envoyée
              </p>
              <p className="mt-1 text-xs leading-normal text-[#9a8fb5]">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#9a8fb5] hover:text-cream transition-colors bg-transparent border-none p-0 cursor-pointer outline-none"
              aria-label="Fermer la notification"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid of ministries */}
      <div className="mb-16 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
        {ministries.map((m) => (
          <MinistryCard
            key={m.name}
            ministry={m}
            variant="full"
            onJoin={setSelectedMinistry}
          />
        ))}
      </div>

      {/* Dialog Modal Form */}
      <Dialog open={selectedMinistry !== null} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-[90%] sm:max-w-md border border-white/10 bg-ink p-6 text-cream shadow-2xl rounded-xl">
          <DialogHeader className="gap-1 text-left">
            <span className="text-[10px] font-bold tracking-widest text-[#e2b85f] uppercase">
              Candidature / Adhésion
            </span>
            <DialogTitle className="font-display text-2xl font-bold text-cream italic leading-tight">
              Rejoindre : {selectedMinistry?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#9a8fb5] leading-relaxed">
              Veuillez remplir ce formulaire pour rejoindre l&apos;équipe de ce ministère. Un responsable reviendra vers vous rapidement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-2 space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="fullname" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                Nom complet
              </label>
              <Input
                id="fullname"
                required
                placeholder="Ex: Jean Koffi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                  Téléphone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="Ex: +225 07 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                  Adresse email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Ex: jean.koffi@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-white/15 bg-white/5 px-4 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reason" className="text-xs font-bold text-[#9a8fb5] uppercase tracking-wider">
                Pourquoi souhaitez-vous rejoindre ce ministère ?
              </label>
              <Textarea
                id="reason"
                required
                placeholder="Partagez vos motivations et vos talents..."
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-xl border-white/15 bg-white/5 p-3.5 text-sm text-cream placeholder:text-white/30 focus-visible:border-[#e2b85f] focus-visible:ring-[#e2b85f]/30 focus-visible:ring-3 transition-all resize-none min-h-24"
              />
            </div>

            <div className="pt-2">
              <BrandButton
                type="submit"
                disabled={loading}
                variant="gold"
                size="full"
                className="h-12 text-sm font-extrabold"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin animate-duration-1000" />
                    Envoi de votre demande...
                  </>
                ) : (
                  <>
                    Valider ma candidature <ArrowRight className="size-4" />
                  </>
                )}
              </BrandButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
