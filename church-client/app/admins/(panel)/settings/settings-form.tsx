"use client";

import { useState, useTransition } from "react";
import { 
  Plus, 
  Trash, 
  Save, 
  Loader2, 
  Globe, 
  Clock, 
  HeartHandshake, 
  PhoneCall, 
  Tv, 
  CheckCircle,
  AlertCircle,
  type LucideIcon
} from "lucide-react";
import { updateAdminSettings } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

type TabType = "general" | "schedule" | "offerings" | "contact" | "live";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, Record<string, unknown>>;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // General state
  const [churchName, setChurchName] = useState((initialSettings.general?.church_name as string) ?? "");
  const [heroTitle, setHeroTitle] = useState((initialSettings.general?.hero_title as string) ?? "");
  const [heroDescription, setHeroDescription] = useState((initialSettings.general?.hero_description as string) ?? "");

  // Schedule state
  const [weeklySchedule, setWeeklySchedule] = useState<Array<{ day: string; time: string; label: string }>>(
    (initialSettings.schedule?.weekly_schedule as Array<{ day: string; time: string; label: string }>) ?? []
  );

  // Offerings state
  const [offeringMethods, setOfferingMethods] = useState<string[]>(
    (initialSettings.offerings?.offering_methods as string[]) ?? []
  );
  const [offeringTypes, setOfferingTypes] = useState<Array<{ key: string; label: string }>>(
    (initialSettings.offerings?.offering_types as Array<{ key: string; label: string }>) ?? []
  );
  const [offeringPresets, setOfferingPresets] = useState<number[]>(
    (initialSettings.offerings?.offering_presets as number[]) ?? []
  );

  const customLimits = initialSettings.offerings?.offering_custom_limits as { min?: number; max?: number } | undefined;
  const [customMin, setCustomMin] = useState<number>(
    customLimits?.min ?? 500
  );
  const [customMax, setCustomMax] = useState<number>(
    customLimits?.max ?? 5000000
  );
  const [offeringCurrency, setOfferingCurrency] = useState<string>(
    (initialSettings.offerings?.offering_currency as string) ?? "FCFA"
  );

  // Contact state
  const [socials, setSocials] = useState<Array<{ label: string; url: string }>>(
    (initialSettings.contact?.socials as Array<{ label: string; url: string }>) ?? []
  );
  const [addresses, setAddresses] = useState<string[]>(
    (initialSettings.contact?.address as string[]) ?? []
  );
  const [phones, setPhones] = useState<string[]>(
    (initialSettings.contact?.phones as string[]) ?? []
  );
  const [emails, setEmails] = useState<string[]>(
    (initialSettings.contact?.emails as string[]) ?? []
  );
  const [mapHint, setMapHint] = useState((initialSettings.contact?.map_hint as string) ?? "");
  const [legalMentions, setLegalMentions] = useState((initialSettings.contact?.legal_mentions as string) ?? "");

  // Live state
  const [liveEmbedUrl, setLiveEmbedUrl] = useState((initialSettings.live?.live_embed_url as string) ?? "");
  const [liveStatus, setLiveStatus] = useState<boolean>(
    Boolean(initialSettings.live?.live_status)
  );
  const [liveChatEnabled, setLiveChatEnabled] = useState<boolean>(
    initialSettings.live?.live_chat_enabled !== false
  );
  const [liveTitle, setLiveTitle] = useState((initialSettings.live?.live_title as string) ?? "");

  // Dynamic list modifiers
  const addSchedule = () => {
    setWeeklySchedule([...weeklySchedule, { day: "DIMANCHE", time: "09:00", label: "Nouveau Culte" }]);
  };

  const removeSchedule = (index: number) => {
    setWeeklySchedule(weeklySchedule.filter((_, i) => i !== index));
  };

  const updateScheduleField = (index: number, field: "day" | "time" | "label", value: string) => {
    setWeeklySchedule(
      weeklySchedule.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addOfferingMethod = () => {
    setOfferingMethods([...offeringMethods, ""]);
  };

  const removeOfferingMethod = (index: number) => {
    setOfferingMethods(offeringMethods.filter((_, i) => i !== index));
  };

  const updateOfferingMethod = (index: number, value: string) => {
    setOfferingMethods(offeringMethods.map((m, i) => (i === index ? value : m)));
  };

  const addOfferingType = () => {
    setOfferingTypes([...offeringTypes, { key: "nouveau", label: "Nouveau Type" }]);
  };

  const removeOfferingType = (index: number) => {
    setOfferingTypes(offeringTypes.filter((_, i) => i !== index));
  };

  const updateOfferingTypeField = (index: number, field: "key" | "label", value: string) => {
    setOfferingTypes(
      offeringTypes.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addPreset = () => {
    setOfferingPresets([...offeringPresets, 1000]);
  };

  const removePreset = (index: number) => {
    setOfferingPresets(offeringPresets.filter((_, i) => i !== index));
  };

  const updatePreset = (index: number, value: number) => {
    setOfferingPresets(offeringPresets.map((p, i) => (i === index ? value : p)));
  };

  const addAddress = () => setAddresses([...addresses, ""]);
  const removeAddress = (index: number) => setAddresses(addresses.filter((_, i) => i !== index));
  const updateAddress = (index: number, value: string) => setAddresses(addresses.map((a, i) => i === index ? value : a));

  const addPhone = () => setPhones([...phones, ""]);
  const removePhone = (index: number) => setPhones(phones.filter((_, i) => i !== index));
  const updatePhone = (index: number, value: string) => setPhones(phones.map((p, i) => i === index ? value : p));

  const addEmail = () => setEmails([...emails, ""]);
  const removeEmail = (index: number) => setEmails(emails.filter((_, i) => i !== index));
  const updateEmail = (index: number, value: string) => setEmails(emails.map((e, i) => i === index ? value : e));

  const addSocial = () => {
    setSocials([...socials, { label: "Nouveau", url: "https://" }]);
  };

  const removeSocial = (index: number) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  const updateSocialField = (index: number, field: "label" | "url", value: string) => {
    setSocials(
      socials.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    setStatus(null);
    startTransition(async () => {
      try {
        const payload = [
          // General
          { key: "church_name", value: churchName, group: "general" },
          { key: "hero_title", value: heroTitle, group: "general" },
          { key: "hero_description", value: heroDescription, group: "general" },
          
          // Schedule
          { key: "weekly_schedule", value: weeklySchedule, group: "schedule" },
          
          // Offerings
          { key: "offering_methods", value: offeringMethods.filter(Boolean), group: "offerings" },
          { key: "offering_types", value: offeringTypes, group: "offerings" },
          { key: "offering_presets", value: offeringPresets.map(Number).filter((n) => !isNaN(n)), group: "offerings" },
          { key: "offering_custom_limits", value: { min: Number(customMin), max: Number(customMax) }, group: "offerings" },
          { key: "offering_currency", value: offeringCurrency, group: "offerings" },
          
          // Contact
          { key: "socials", value: socials, group: "contact" },
          { key: "address", value: addresses.filter(Boolean), group: "contact" },
          { key: "phones", value: phones.filter(Boolean), group: "contact" },
          { key: "emails", value: emails.filter(Boolean), group: "contact" },
          { key: "map_hint", value: mapHint, group: "contact" },
          { key: "legal_mentions", value: legalMentions, group: "contact" },
          
          // Live
          { key: "live_embed_url", value: liveEmbedUrl, group: "live" },
          { key: "live_status", value: liveStatus, group: "live" },
          { key: "live_chat_enabled", value: liveChatEnabled, group: "live" },
          { key: "live_title", value: liveTitle, group: "live" },
        ];

        await updateAdminSettings(payload);
        setStatus({ type: "success", message: "Paramètres mis à jour avec succès !" });
      } catch (err) {
        const error = err as Error;
        console.error(error);
        setStatus({ type: "error", message: error.message || "Une erreur est survenue lors de l'enregistrement." });
      }
    });
  };

  const tabs: { id: TabType; label: string; icon: LucideIcon }[] = [
    { id: "general", label: "Général", icon: Globe },
    { id: "schedule", label: "Horaires", icon: Clock },
    { id: "offerings", label: "Dons & Offrandes", icon: HeartHandshake },
    { id: "contact", label: "Contact & Réseaux", icon: PhoneCall },
    { id: "live", label: "Direct (Live)", icon: Tv },
  ];

  return (
    <div className="mx-auto max-w-[900px]">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
            Configuration
          </span>
          <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
            Paramètres du site
          </h1>
          <p className="mt-1 text-sm text-body">
            Gérez l’intégralité des textes et des configurations de votre site web.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-gold to-gold-dark px-6 py-3.5 text-sm font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.25)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Enregistrer les modifications
        </button>
      </header>

      {status && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm animate-fade-up",
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
          <div>
            <p className="font-bold">{status.type === "success" ? "Succès" : "Erreur"}</p>
            <p className="mt-0.5 text-xs text-body">{status.message}</p>
          </div>
        </div>
      )}

      {/* Tabs list */}
      <div className="mb-6 flex flex-wrap border-b border-[rgba(40,25,80,0.08)] bg-white p-1 rounded-xl shadow-[0_1px_3px_rgba(22,15,51,0.02)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer rounded-lg px-4 py-3 text-xs font-bold transition-all",
                active
                  ? "bg-indigo text-white shadow-[0_4px_12px_rgba(33,22,72,0.15)]"
                  : "text-body hover:bg-lilac/30 hover:text-indigo"
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Forms Content */}
      <div className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)] md:p-8">
        
        {/* Tab 1: General */}
        {activeTab === "general" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-indigo">Informations générales</h2>
              <p className="text-[13px] text-body">Configurez l’identité de l’église et l’accueil de votre page d’accueil.</p>
            </div>
            
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Nom de l’église</span>
              <input
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                placeholder="ex: ✦ Église MFM Ficgayo ✦"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Titre de la section d’accueil</span>
              <input
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                placeholder="ex: Bienvenue à la Maison"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Description de bienvenue</span>
              <textarea
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                rows={4}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold resize-none leading-relaxed"
                placeholder="ex: Un lieu de grâce, de feu et de miracles..."
              />
            </label>
          </div>
        )}

        {/* Tab 2: Schedule */}
        {activeTab === "schedule" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-indigo">Programme hebdomadaire</h2>
                <p className="text-[13px] text-body">Gérez les créneaux et horaires des cultes hebdomadaires.</p>
              </div>
              <button
                type="button"
                onClick={addSchedule}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-bold tracking-wider text-indigo border border-indigo/20 hover:border-indigo px-3 py-2 rounded-lg bg-lilac/30 transition-colors uppercase"
              >
                <Plus className="size-3.5" /> Ajouter un créneau
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {weeklySchedule.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(40,25,80,0.06)] bg-cream p-3">
                  <select
                    value={item.day}
                    onChange={(e) => updateScheduleField(idx, "day", e.target.value)}
                    className="flex-1 min-w-[120px] rounded-lg border border-[rgba(40,25,80,0.1)] bg-white px-3 py-2 text-[14px] text-indigo outline-none"
                  >
                    {["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={item.time}
                    onChange={(e) => updateScheduleField(idx, "time", e.target.value)}
                    placeholder="18:30"
                    className="w-[80px] rounded-lg border border-[rgba(40,25,80,0.1)] bg-white px-3 py-2 text-[14px] text-indigo text-center outline-none"
                  />

                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateScheduleField(idx, "label", e.target.value)}
                    placeholder="Nom du culte / de la réunion"
                    className="flex-[2_1_180px] rounded-lg border border-[rgba(40,25,80,0.1)] bg-white px-3 py-2 text-[14px] text-indigo outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => removeSchedule(idx)}
                    className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-live/10 text-live bg-live/5 hover:bg-live/15 transition-colors"
                  >
                    <Trash className="size-4" />
                  </button>
                </div>
              ))}
              
              {weeklySchedule.length === 0 && (
                <div className="text-center py-8 text-xs text-body border border-dashed border-[rgba(40,25,80,0.15)] rounded-xl bg-cream/40">
                  Aucun créneau d’horaire défini.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Offerings */}
        {activeTab === "offerings" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-indigo">Module d’offrandes & dons</h2>
              <p className="text-[13px] text-body">Gérez les montants, les types d’offrandes et les modes de paiement.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Currency & Limits */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Devise</span>
                <input
                  value={offeringCurrency}
                  onChange={(e) => setOfferingCurrency(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                  placeholder="ex: FCFA"
                />
              </label>

              <div className="flex gap-3">
                <label className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Montant Min</span>
                  <input
                    type="number"
                    value={customMin}
                    onChange={(e) => setCustomMin(Number(e.target.value))}
                    className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                  />
                </label>
                <label className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Montant Max</span>
                  <input
                    type="number"
                    value={customMax}
                    onChange={(e) => setCustomMax(Number(e.target.value))}
                    className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                  />
                </label>
              </div>
            </div>

            {/* Presets */}
            <div className="border-t border-[rgba(40,25,80,0.06)] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Montants prédéfinis (FCFA)</span>
                <button
                  type="button"
                  onClick={addPreset}
                  className="flex cursor-pointer items-center gap-0.5 text-[10px] font-bold tracking-wide text-indigo border border-indigo/20 px-2.5 py-1 rounded bg-lilac/30"
                >
                  <Plus className="size-3" /> Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {offeringPresets.map((preset, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-cream border border-[rgba(40,25,80,0.1)] rounded-lg p-1">
                    <input
                      type="number"
                      value={preset}
                      onChange={(e) => updatePreset(idx, Number(e.target.value))}
                      className="w-16 bg-transparent px-1.5 py-0.5 text-center text-xs font-bold text-indigo outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removePreset(idx)}
                      className="text-live/60 hover:text-live p-1"
                    >
                      <Trash className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Types of offerings */}
            <div className="border-t border-[rgba(40,25,80,0.06)] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Types d’offrandes</span>
                <button
                  type="button"
                  onClick={addOfferingType}
                  className="flex cursor-pointer items-center gap-0.5 text-[10px] font-bold tracking-wide text-indigo border border-indigo/20 px-2.5 py-1 rounded bg-lilac/30"
                >
                  <Plus className="size-3" /> Ajouter un type
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {offeringTypes.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-[rgba(40,25,80,0.06)] bg-cream p-2">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => updateOfferingTypeField(idx, "key", e.target.value)}
                      placeholder="Identifiant"
                      className="w-[100px] rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none font-bold"
                    />
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateOfferingTypeField(idx, "label", e.target.value)}
                      placeholder="Libellé affiché"
                      className="flex-1 rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeOfferingType(idx)}
                      className="text-live hover:bg-live/10 p-1.5 rounded transition-colors"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Methods */}
            <div className="border-t border-[rgba(40,25,80,0.06)] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Moyens de paiement supportés</span>
                <button
                  type="button"
                  onClick={addOfferingMethod}
                  className="flex cursor-pointer items-center gap-0.5 text-[10px] font-bold tracking-wide text-indigo border border-indigo/20 px-2.5 py-1 rounded bg-lilac/30"
                >
                  <Plus className="size-3" /> Ajouter
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {offeringMethods.map((method, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-cream border border-[rgba(40,25,80,0.1)] rounded-lg p-1">
                    <input
                      type="text"
                      value={method}
                      onChange={(e) => updateOfferingMethod(idx, e.target.value)}
                      className="w-24 bg-transparent px-1.5 py-0.5 text-center text-xs font-bold text-indigo outline-none"
                      placeholder="Wave..."
                    />
                    <button
                      type="button"
                      onClick={() => removeOfferingMethod(idx)}
                      className="text-live/60 hover:text-live p-1"
                    >
                      <Trash className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Contact & socials */}
        {activeTab === "contact" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-indigo">Contact & Réseaux sociaux</h2>
              <p className="text-[13px] text-body">Gérez vos adresses de contact, numéros, réseaux sociaux et footer.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Addresses */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Adresses physiques</span>
                  <button type="button" onClick={addAddress} className="text-[10px] font-bold text-indigo border border-indigo/20 px-2 py-0.5 rounded bg-lilac/30">Ajouter</button>
                </div>
                {addresses.map((addr, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={addr}
                      onChange={(e) => updateAddress(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-[14px] text-indigo outline-none focus:border-gold"
                    />
                    <button type="button" onClick={() => removeAddress(idx)} className="text-live hover:bg-live/10 p-2 rounded"><Trash className="size-4" /></button>
                  </div>
                ))}
              </div>

              {/* Phones */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Téléphones</span>
                  <button type="button" onClick={addPhone} className="text-[10px] font-bold text-indigo border border-indigo/20 px-2 py-0.5 rounded bg-lilac/30">Ajouter</button>
                </div>
                {phones.map((phone, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      value={phone}
                      onChange={(e) => updatePhone(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-[14px] text-indigo outline-none focus:border-gold"
                    />
                    <button type="button" onClick={() => removePhone(idx)} className="text-live hover:bg-live/10 p-2 rounded"><Trash className="size-4" /></button>
                  </div>
                ))}
              </div>

              {/* Emails */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">E-mails de contact</span>
                  <button type="button" onClick={addEmail} className="text-[10px] font-bold text-indigo border border-indigo/20 px-2 py-0.5 rounded bg-lilac/30">Ajouter</button>
                </div>
                {emails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-[14px] text-indigo outline-none focus:border-gold"
                    />
                    <button type="button" onClick={() => removeEmail(idx)} className="text-live hover:bg-live/10 p-2 rounded"><Trash className="size-4" /></button>
                  </div>
                ))}
              </div>

              {/* Map Hint */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Indication géographique</span>
                <input
                  value={mapHint}
                  onChange={(e) => setMapHint(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-2 text-[14px] text-indigo outline-none focus:border-gold"
                  placeholder="ex: Abidjan · Yopougon & environs"
                />
              </label>
            </div>

            {/* Social Networks */}
            <div className="border-t border-[rgba(40,25,80,0.06)] pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Réseaux sociaux</span>
                <button
                  type="button"
                  onClick={addSocial}
                  className="flex cursor-pointer items-center gap-0.5 text-[10px] font-bold tracking-wide text-indigo border border-indigo/20 px-2.5 py-1 rounded bg-lilac/30"
                >
                  <Plus className="size-3" /> Ajouter un réseau
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socials.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-[rgba(40,25,80,0.06)] bg-cream p-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateSocialField(idx, "label", e.target.value)}
                      placeholder="Nom (Facebook...)"
                      className="w-[100px] rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none font-bold"
                    />
                    <input
                      type="text"
                      value={item.url}
                      onChange={(e) => updateSocialField(idx, "url", e.target.value)}
                      placeholder="Lien complet"
                      className="flex-1 rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSocial(idx)}
                      className="text-live hover:bg-live/10 p-1.5 rounded transition-colors"
                    >
                      <Trash className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal mentions */}
            <label className="flex flex-col gap-1.5 border-t border-[rgba(40,25,80,0.06)] pt-5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Mentions Légales (Copyright Footer)</span>
              <input
                value={legalMentions}
                onChange={(e) => setLegalMentions(e.target.value)}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                placeholder="© 2026 Église MFM Ficgayo. Tous droits réservés."
              />
            </label>
          </div>
        )}

        {/* Tab 5: Live */}
        {activeTab === "live" && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div>
              <h2 className="text-base font-bold text-indigo">Configuration du Live & Diffusion</h2>
              <p className="text-[13px] text-body">Gérez le statut de direct, le chat et l’URL du flux de streaming.</p>
            </div>

            {/* Switches */}
            <div className="flex flex-wrap gap-6 bg-cream p-4 rounded-2xl border border-[rgba(40,25,80,0.06)]">
              <label className="flex flex-1 min-w-[200px] cursor-pointer items-center justify-between gap-4 p-2 rounded-xl hover:bg-white/40 transition-colors">
                <div>
                  <span className="block text-sm font-bold text-indigo">🔴 Statut du Live (En Direct)</span>
                  <span className="block text-xs text-body">Force le badge clignotant & la diffusion.</span>
                </div>
                <input
                  type="checkbox"
                  checked={liveStatus}
                  onChange={(e) => setLiveStatus(e.target.checked)}
                  className="size-5 cursor-pointer accent-gold"
                />
              </label>

              <label className="flex flex-1 min-w-[200px] cursor-pointer items-center justify-between gap-4 p-2 rounded-xl hover:bg-white/40 transition-colors">
                <div>
                  <span className="block text-sm font-bold text-indigo">💬 Module de Chat interactif</span>
                  <span className="block text-xs text-body">Active ou désactive l’onglet de Tchat public.</span>
                </div>
                <input
                  type="checkbox"
                  checked={liveChatEnabled}
                  onChange={(e) => setLiveChatEnabled(e.target.checked)}
                  className="size-5 cursor-pointer accent-gold"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Titre de la diffusion</span>
              <input
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                placeholder="ex: Culte dominical - La puissance de la foi"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">URL du flux vidéo (YouTube / Vimeo embed)</span>
              <input
                value={liveEmbedUrl}
                onChange={(e) => setLiveEmbedUrl(e.target.value)}
                className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
                placeholder="ex: https://www.youtube.com/embed/live_stream?channel=YOUR_CHANNEL_ID"
              />
            </label>
          </div>
        )}

      </div>
    </div>
  );
}
