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
  CheckCircle,
  AlertCircle,
  ImagePlus,
  ShoppingBag,
  type LucideIcon
} from "lucide-react";
import { updateAdminSettings } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { LocationPicker } from "../_components/location-picker";

const EMOJI_LIST = [
  "⛪", "🛵", "📦", "🚗", "🚚", "✈️", "🏃", "🚶", "🏢", "🏠", "🌍", "🚲", 
  "🛴", "✉️", "🎁", "🛒", "🚢", "🚉", "📍", "💼", "🤝", "🏷️", "🔑", "🛎️",
  "⭐", "🔥", "❤️", "🙌", "✨", "✝️", "📖", "🕊️", "🎺", "🕯️", "🎙️", "💿"
];

const SETTING_INPUT =
  "rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold w-full";


type TabType = "general" | "schedule" | "offerings" | "contact" | "boutique";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Record<string, Record<string, unknown>>;
}) {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Boutique state
  const [storeCatalogTitle, setStoreCatalogTitle] = useState(
    (initialSettings.boutique?.store_catalog_title as string) ?? "Espace Catalogue Fidèles"
  );
  const [storeCatalogDescription, setStoreCatalogDescription] = useState(
    (initialSettings.boutique?.store_catalog_description as string) ?? "Retrouvez nos livres d'étude, vêtements « Génération Feu » et articles d'onction pour édifier votre marche spirituelle."
  );
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<Array<{ key: string; label: string; desc: string; price: number; icon: string }>>(
    (initialSettings.boutique?.delivery_options as Array<{ key: string; label: string; desc: string; price: number; icon: string }>) ?? [
      { key: "retrait", label: "Retrait à l'église", desc: "Retrait gratuit à MFM Ficgayo", price: 0, icon: "⛪" },
      { key: "abidjan", label: "Livraison Abidjan", desc: "Livraison à domicile à Abidjan", price: 3000, icon: "🛵" },
      { key: "interieur", label: "Livraison intérieur", desc: "Expédition dans les villes de l'intérieur", price: 5000, icon: "📦" }
    ]
  );

  const [activeEmojiPickerIdx, setActiveEmojiPickerIdx] = useState<number | null>(null);

  const handleAddDeliveryOption = () => {
    setStoreDeliveryOptions((prev) => [
      ...prev,
      {
        key: `del-${Date.now()}`,
        label: "Nouveau mode",
        desc: "Description du mode",
        price: 1000,
        icon: "📦",
      },
    ]);
  };

  const handleUpdateDeliveryOption = (
    index: number,
    field: "label" | "desc" | "price" | "icon" | "key",
    val: any
  ) => {
    setStoreDeliveryOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, [field]: val } : opt))
    );
  };

  const handleRemoveDeliveryOption = (index: number) => {
    setStoreDeliveryOptions((prev) => prev.filter((_, i) => i !== index));
  };

  // General state
  const [churchName, setChurchName] = useState((initialSettings.general?.church_name as string) ?? "");
  const [heroTitle, setHeroTitle] = useState((initialSettings.general?.hero_title as string) ?? "");
  const [heroDescription, setHeroDescription] = useState((initialSettings.general?.hero_description as string) ?? "");
  // Hero background media (image OR video). Empty → default cover image is used.
  const [heroBackground, setHeroBackground] = useState((initialSettings.general?.hero_background as string) ?? "");
  const [heroBackgroundType, setHeroBackgroundType] = useState<"image" | "video">(
    (initialSettings.general?.hero_background_type as "image" | "video") === "video" ? "video" : "image"
  );
  const [pendingHeroFile, setPendingHeroFile] = useState<File | null>(null);

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

  // Editable "pitch" panel beside the donation form (page /dons).
  const [pitchEyebrow, setPitchEyebrow] = useState<string>(
    (initialSettings.offerings?.offering_pitch_eyebrow as string) ?? "Générosité"
  );
  const [pitchTitle, setPitchTitle] = useState<string>(
    (initialSettings.offerings?.offering_pitch_title as string) ?? "Semer pour la moisson"
  );
  const [pitchQuote, setPitchQuote] = useState<string>(
    (initialSettings.offerings?.offering_pitch_quote as string) ?? ""
  );
  const [pitchReference, setPitchReference] = useState<string>(
    (initialSettings.offerings?.offering_pitch_reference as string) ?? ""
  );
  const [pitchPoints, setPitchPoints] = useState<string[]>(
    (initialSettings.offerings?.offering_pitch_points as string[]) ?? []
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
  const [latitude, setLatitude] = useState<number | null>(
    initialSettings.contact?.latitude ? Number(initialSettings.contact.latitude) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialSettings.contact?.longitude ? Number(initialSettings.contact.longitude) : null
  );

  // Live states have been transferred to Live Studio console.

  const backendUrl = process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
    : "http://127.0.0.1:8000";

  const getPreviewUrl = (urlOrBlob: string) => {
    if (!urlOrBlob) return "";
    if (urlOrBlob.startsWith("blob:") || urlOrBlob.startsWith("data:")) {
      return urlOrBlob;
    }
    return urlOrBlob.startsWith("/") ? `${backendUrl}${urlOrBlob}` : urlOrBlob;
  };

  // Image handler for live fallback image removed.

  const handleHeroBgSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (heroBackground.startsWith("blob:")) URL.revokeObjectURL(heroBackground);
    setHeroBackground(URL.createObjectURL(file));
    setHeroBackgroundType(file.type.startsWith("video") ? "video" : "image");
    setPendingHeroFile(file);
  };

  const handleHeroBgRemove = () => {
    if (heroBackground.startsWith("blob:")) URL.revokeObjectURL(heroBackground);
    setHeroBackground("");
    setHeroBackgroundType("image");
    setPendingHeroFile(null);
  };

  // Sermon point helpers removed.

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
          { key: "hero_background", value: heroBackground.startsWith("blob:") ? "" : heroBackground, group: "general" },
          { key: "hero_background_type", value: heroBackgroundType, group: "general" },
          
          // Schedule
          { key: "weekly_schedule", value: weeklySchedule, group: "schedule" },
          
          // Offerings
          { key: "offering_methods", value: offeringMethods.filter(Boolean), group: "offerings" },
          { key: "offering_types", value: offeringTypes, group: "offerings" },
          { key: "offering_presets", value: offeringPresets.map(Number).filter((n) => !isNaN(n)), group: "offerings" },
          { key: "offering_custom_limits", value: { min: Number(customMin), max: Number(customMax) }, group: "offerings" },
          { key: "offering_currency", value: offeringCurrency, group: "offerings" },
          { key: "offering_pitch_eyebrow", value: pitchEyebrow, group: "offerings" },
          { key: "offering_pitch_title", value: pitchTitle, group: "offerings" },
          { key: "offering_pitch_quote", value: pitchQuote, group: "offerings" },
          { key: "offering_pitch_reference", value: pitchReference, group: "offerings" },
          { key: "offering_pitch_points", value: pitchPoints.map((p) => p.trim()).filter(Boolean), group: "offerings" },
          
          // Contact
          { key: "socials", value: socials, group: "contact" },
          { key: "address", value: addresses.filter(Boolean), group: "contact" },
          { key: "phones", value: phones.filter(Boolean), group: "contact" },
          { key: "emails", value: emails.filter(Boolean), group: "contact" },
          { key: "map_hint", value: mapHint, group: "contact" },
          { key: "legal_mentions", value: legalMentions, group: "contact" },
          { key: "latitude", value: latitude, group: "contact" },
          { key: "longitude", value: longitude, group: "contact" },
          
          // Boutique / Catalogue settings
          { key: "store_catalog_title", value: storeCatalogTitle, group: "boutique" },
          { key: "store_catalog_description", value: storeCatalogDescription, group: "boutique" },
          { key: "delivery_options", value: storeDeliveryOptions, group: "boutique" },
          
        ];

        const files: Record<string, File | null> = {};
        if (pendingHeroFile) {
          files["hero_background"] = pendingHeroFile;
        }

        const res = (await updateAdminSettings(payload, files)) as {
          data: Record<string, Record<string, unknown>>;
        };

        if (res?.data?.general) {
          setHeroBackground((res.data.general.hero_background as string) ?? "");
          setPendingHeroFile(null);
        }

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
    { id: "boutique", label: "Boutique & Catalogue", icon: ShoppingBag },
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

            {/* Hero background media (image or video) */}
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">
                Média d’arrière-plan de l’accueil
              </span>
              <p className="text-[12px] text-body">
                Image ou vidéo affichée en fond de la section d’accueil. Si aucun média n’est
                défini, l’image de couverture par défaut est utilisée.
              </p>

              {heroBackground ? (
                <div className="mx-auto relative aspect-video w-full max-w-145 overflow-hidden rounded-2xl border border-[rgba(40,25,80,0.12)] bg-ink">
                  {heroBackgroundType === "video" ? (
                    <video
                      src={getPreviewUrl(heroBackground)}
                      className="size-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getPreviewUrl(heroBackground)}
                      alt="Aperçu de l’arrière-plan d’accueil"
                      className="size-full object-cover"
                    />
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-ink/70 px-2.5 py-1 text-[10px] font-bold text-cream backdrop-blur-sm">
                    {heroBackgroundType === "video" ? "Vidéo" : "Image"}
                  </span>
                  <div className="absolute right-2 bottom-2 flex gap-2">
                    <label className="cursor-pointer rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-indigo shadow-sm backdrop-blur-sm transition hover:bg-white">
                      Remplacer
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleHeroBgSelect}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleHeroBgRemove}
                      className="cursor-pointer rounded-lg bg-live/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-live"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ) : (
                <label className="mx-auto flex aspect-video w-full max-w-[580px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(40,25,80,0.25)] bg-[#faf8f4] text-center transition hover:border-gold hover:bg-gold/5">
                  <span className="flex size-12 items-center justify-center rounded-full bg-indigo/5 text-indigo">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="text-[13px] font-bold text-indigo">Importer une image ou une vidéo</span>
                  <span className="text-[11px] text-faint">JPG, PNG, WEBP · MP4, WEBM</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleHeroBgSelect}
                  />
                </label>
              )}
            </div>
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

            {/* Pitch panel (page /dons) */}
            <div className="rounded-2xl border border-[rgba(40,25,80,0.1)] bg-white p-5">
              <h3 className="mb-1 text-sm font-bold text-indigo">Panneau de présentation (page Dons)</h3>
              <p className="mb-4 text-[12.5px] text-body">Le bloc visuel affiché à côté du formulaire de don.</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Sur-titre</span>
                  <input value={pitchEyebrow} onChange={(e) => setPitchEyebrow(e.target.value)} className={SETTING_INPUT} placeholder="ex: Générosité" />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Référence biblique</span>
                  <input value={pitchReference} onChange={(e) => setPitchReference(e.target.value)} className={SETTING_INPUT} placeholder="ex: 2 Corinthiens 9.7" />
                </label>
              </div>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Titre</span>
                <input value={pitchTitle} onChange={(e) => setPitchTitle(e.target.value)} className={SETTING_INPUT} placeholder="ex: Semer pour la moisson" />
              </label>

              <label className="mt-4 flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Citation</span>
                <textarea value={pitchQuote} onChange={(e) => setPitchQuote(e.target.value)} rows={2} className={cn(SETTING_INPUT, "resize-none leading-relaxed")} placeholder="« Que chacun donne… »" />
              </label>

              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Points de réassurance</span>
                {pitchPoints.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      value={point}
                      onChange={(e) => setPitchPoints(pitchPoints.map((p, i) => (i === idx ? e.target.value : p)))}
                      className={cn(SETTING_INPUT, "flex-1")}
                      placeholder="ex: Reçu envoyé automatiquement par e-mail"
                    />
                    <button type="button" onClick={() => setPitchPoints(pitchPoints.filter((_, i) => i !== idx))} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-live/15 text-live transition hover:bg-live/10">
                      <Trash className="size-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setPitchPoints([...pitchPoints, ""])} className="flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-[rgba(40,25,80,0.12)] px-3 py-1.5 text-[12px] font-bold text-indigo transition hover:border-gold hover:text-gold-dark">
                  <Plus className="size-3.5" /> Ajouter un point
                </button>
              </div>
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

              {/* Map location picker */}
              <div className="md:col-span-2 border-t border-[rgba(40,25,80,0.06)] pt-5">
                <span className="block text-[12px] font-bold tracking-wide text-body-strong uppercase mb-3">Indication géographique & Carte</span>
                <LocationPicker
                  value={{ address: mapHint, latitude, longitude, zone: null }}
                  onChange={(next) => {
                    setMapHint(next.address);
                    setLatitude(next.latitude);
                    setLongitude(next.longitude);
                  }}
                />
              </div>
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

        {activeTab === "boutique" && (
          <div className="flex flex-col gap-6 rounded-2xl border border-[rgba(40,25,80,0.06)] bg-white p-6 shadow-sm">
            {/* Title / Description Catalog settings */}
            <div className="border-b border-[rgba(40,25,80,0.06)] pb-5 space-y-4">
              <h3 className="font-display font-bold italic text-[#211648] text-xl">Présentation du Catalogue Boutique</h3>
              
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">Titre de l&apos;espace catalogue</span>
                <input
                  type="text"
                  value={storeCatalogTitle}
                  onChange={(e) => setStoreCatalogTitle(e.target.value)}
                  className={SETTING_INPUT}
                  placeholder="Espace Catalogue Fidèles"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold tracking-wide text-[#211648] uppercase font-bold">Description / Sous-titre</span>
                <textarea
                  value={storeCatalogDescription}
                  onChange={(e) => setStoreCatalogDescription(e.target.value)}
                  className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold min-h-[90px] w-full"
                  placeholder="Retrouvez nos livres d'étude..."
                />
              </label>
            </div>

            {/* Delivery Modes settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[rgba(40,25,80,0.06)] pb-3">
                <h3 className="font-display font-bold italic text-[#211648] text-xl">Modes de livraison</h3>
                <button
                  type="button"
                  onClick={handleAddDeliveryOption}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo/5 px-2.5 py-1 text-xs font-bold text-indigo hover:bg-indigo/10 transition cursor-pointer animate-fade-in"
                >
                  <Plus className="size-3" /> Ajouter un mode
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {storeDeliveryOptions.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-wrap md:flex-nowrap gap-3 items-center rounded-xl border border-[rgba(40,25,80,0.08)] bg-[#faf8f4] p-3 shadow-xs animate-fade-in relative transition-all",
                      activeEmojiPickerIdx === idx ? "z-50" : "z-10"
                    )}
                  >
                    {/* Icon picker */}
                    <div className="relative shrink-0 w-[50px]">
                      <span className="text-[9px] font-bold text-indigo/60 uppercase block mb-1">Emoji</span>
                      <button
                        type="button"
                        onClick={() => setActiveEmojiPickerIdx(activeEmojiPickerIdx === idx ? null : idx)}
                        className="size-9 rounded-lg border border-[rgba(40,25,80,0.1)] bg-white flex items-center justify-center text-lg hover:border-gold transition cursor-pointer w-full"
                        title="Choisir un Emoji"
                      >
                        {item.icon || "📦"}
                      </button>

                      {activeEmojiPickerIdx === idx && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveEmojiPickerIdx(null)}
                          />
                          <div className="absolute top-11 left-0 w-48 p-2 bg-white border border-[rgba(40,25,80,0.15)] rounded-xl grid grid-cols-6 gap-1 shadow-xl z-50 animate-fade-in max-h-48 overflow-y-auto scrollbar-none">
                            {EMOJI_LIST.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  handleUpdateDeliveryOption(idx, "icon", emoji);
                                  setActiveEmojiPickerIdx(null);
                                }}
                                className="size-6 hover:bg-[#faf8f4] rounded flex items-center justify-center text-sm transition cursor-pointer"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-[120px]">
                      <span className="text-[9px] font-bold text-indigo/60 uppercase block mb-1">Libellé</span>
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateDeliveryOption(idx, "label", e.target.value)}
                        className="w-full rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none font-bold"
                        placeholder="Retrait, Livraison..."
                      />
                    </div>

                    {/* Description */}
                    <div className="flex-2 min-w-[200px]">
                      <span className="text-[9px] font-bold text-indigo/60 uppercase block mb-1">Description</span>
                      <input
                        type="text"
                        value={item.desc}
                        onChange={(e) => handleUpdateDeliveryOption(idx, "desc", e.target.value)}
                        className="w-full rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none"
                        placeholder="Retrait à l'église..."
                      />
                    </div>

                    {/* Price */}
                    <div className="w-[100px] shrink-0">
                      <span className="text-[9px] font-bold text-indigo/60 uppercase block mb-1">Frais (FCFA)</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleUpdateDeliveryOption(idx, "price", e.target.value ? Number(e.target.value) : 0)}
                        className="w-full rounded border border-[rgba(40,25,80,0.1)] bg-white px-2 py-1 text-xs text-indigo outline-none font-bold"
                      />
                    </div>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliveryOption(idx)}
                      className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors self-end shrink-0 cursor-pointer"
                    >
                      <Trash className="size-4" />
                    </button>
                  </div>
                ))}
                {storeDeliveryOptions.length === 0 && (
                  <p className="text-xs font-bold text-indigo/55 text-center py-4 bg-white border border-[rgba(40,25,80,0.06)] rounded-xl">Aucun mode de livraison configuré.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
