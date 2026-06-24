"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, Save, Upload, User, AlertCircle, CheckCircle2, Plus, Trash2, HelpCircle } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "../../_components/searchable-select";
import { updateAdminPastorWord, type AdminPastorWord, type AdminUserOption } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RichEditor } from "@/components/ui/rich-editor";

function Facebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function Instagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function Youtube(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="9.7 15 9.7 9 15 12 9.7 15" />
    </svg>
  );
}

type PastorWordFormProps = {
  pastorWord: AdminPastorWord["pastor_word"];
  churchPresentationBanner: AdminPastorWord["church_presentation_banner"];
  pastorLongMessage: AdminPastorWord["pastor_long_message"];
  users: AdminUserOption[];
};

const DEFAULT_BANNER = {
  eyebrow: "Présentation MFM Ficgayo",
  quote: "« Soyez les bienvenus sur cette page Prophétique... »",
  short_description: "Découvrez l'exhortation prophétique du Pasteur David Odion Victor sur la puissance...",
  button_text: "Lire le message"
};

const DEFAULT_LONG_MESSAGE = {
  preacher_id: 1,
  custom_eyebrow: "Message de Bienvenue",
  custom_title: "Mot du Surintendant Régional",
  guarantees_title: "En parcourant ce site, 3 choses vous sont prophétiquement garanties :",
  guarantees_list: [
    "Le salut de votre âme.",
    "La délivrance de toute forme d’oppression et de possession.",
    "Une grande grâce saisira votre vie au nom de JÉSUS. (Actes 4:33)"
  ],
  html_content: ""
};

export function PastorWordForm({ pastorWord, churchPresentationBanner, pastorLongMessage, users }: PastorWordFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Tab 1: Pastor Word Showcase (Landing Page) State ---
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    pastorWord?.user_id ?? (users.length > 0 ? users[0].id : null)
  );
  const [customTitle, setCustomTitle] = useState(pastorWord?.custom_title ?? "");
  const [word, setWord] = useState(pastorWord?.word ?? "");
  const [socialLinks, setSocialLinks] = useState({
    facebook: pastorWord?.social_links?.facebook ?? "",
    instagram: pastorWord?.social_links?.instagram ?? "",
    youtube: pastorWord?.social_links?.youtube ?? "",
  });

  // Photo Uploader
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const ASSET_BASE = API_URL.replace(/\/api\/v1\/?$/, "");

  const getFullPhotoUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("data:")) return path; // local preview
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const initialPhotoUrl = getFullPhotoUrl(pastorWord?.photo_path ?? null);
  const currentPreview = photoPreview || initialPhotoUrl;

  // --- Tab 2: Presentation Banner State ---
  const [eyebrow, setEyebrow] = useState(churchPresentationBanner?.eyebrow ?? DEFAULT_BANNER.eyebrow);
  const [quote, setQuote] = useState(churchPresentationBanner?.quote ?? DEFAULT_BANNER.quote);
  const [shortDescription, setShortDescription] = useState(churchPresentationBanner?.short_description ?? DEFAULT_BANNER.short_description);
  const [buttonText, setButtonText] = useState(churchPresentationBanner?.button_text ?? DEFAULT_BANNER.button_text);

  // --- Tab 3: Grand Message State ---
  const [preacherId, setPreacherId] = useState<number | null>(
    pastorLongMessage?.preacher_id ?? (users.length > 0 ? users[0].id : null)
  );
  const [customEyebrow, setCustomEyebrow] = useState(pastorLongMessage?.custom_eyebrow ?? DEFAULT_LONG_MESSAGE.custom_eyebrow);
  const [longCustomTitle, setLongCustomTitle] = useState(pastorLongMessage?.custom_title ?? DEFAULT_LONG_MESSAGE.custom_title);
  const [guaranteesTitle, setGuaranteesTitle] = useState(pastorLongMessage?.guarantees_title ?? DEFAULT_LONG_MESSAGE.guarantees_title);
  const [guaranteesList, setGuaranteesList] = useState<string[]>(
    pastorLongMessage?.guarantees_list ?? DEFAULT_LONG_MESSAGE.guarantees_list
  );
  const [htmlContent, setHtmlContent] = useState(pastorLongMessage?.html_content ?? DEFAULT_LONG_MESSAGE.html_content);

  const clearAlerts = () => {
    setSuccess(null);
    setError(null);
  };

  // Timer to clear alerts
  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [success, error]);

  // Format active users for the combobox SearchableSelect
  const searchableUsers = users.map<SearchableOption>((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
  }));

  // Repeatable field handlers
  const handleAddGuarantee = () => {
    clearAlerts();
    setGuaranteesList((prev) => [...prev, ""]);
  };

  const handleRemoveGuarantee = (index: number) => {
    clearAlerts();
    setGuaranteesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuaranteeChange = (index: number, val: string) => {
    clearAlerts();
    setGuaranteesList((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearAlerts();
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setPhotoFile(file);

      // Show immediate local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Veuillez sélectionner le serviteur/administrateur désigné comme Pasteur.");
      return;
    }
    if (!word.trim()) {
      setError("Le message d'accueil (Mot du Pasteur) ne peut pas être vide.");
      return;
    }
    if (!preacherId) {
      setError("Veuillez sélectionner le serviteur/administrateur désigné comme Prédicateur.");
      return;
    }

    setLoading(true);
    clearAlerts();

    const formData = new FormData();
    
    // 1. pastor_word_showcase
    formData.append("user_id", String(selectedUserId));
    formData.append("custom_title", customTitle);
    formData.append("word", word);
    formData.append("social_links", JSON.stringify(socialLinks));
    if (photoFile) {
      formData.append("photo", photoFile);
    }

    // 2. church_presentation_banner
    formData.append("banner_eyebrow", eyebrow);
    formData.append("banner_quote", quote);
    formData.append("banner_short_description", shortDescription);
    formData.append("banner_button_text", buttonText);

    // 3. pastor_long_message
    formData.append("preacher_id", String(preacherId));
    formData.append("long_custom_eyebrow", customEyebrow);
    formData.append("long_custom_title", longCustomTitle);
    formData.append("long_guarantees_title", guaranteesTitle);
    formData.append("long_guarantees_list", JSON.stringify(guaranteesList.filter((g) => g.trim() !== "")));
    formData.append("long_html_content", htmlContent);

    try {
      await updateAdminPastorWord(formData);
      setSuccess("Toutes les configurations pastorales et de présentation ont été mises à jour.");
      setPhotoFile(null);
    } catch (err) {
      setError((err as Error).message || "Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-8 border-b border-[rgba(40,25,80,0.06)] pb-5">
        <h1 className="font-display text-3xl font-extrabold text-indigo italic">
          Gestion des Messages Pastoraux & Présentation
        </h1>
        <p className="text-sm text-body mt-1">
          Configurez le mot du pasteur (page d&apos;accueil), la bannière de présentation et la liseuse doctrinale de l&apos;église.
        </p>
      </div>

      {/* Floating Success / Error Alerts */}
      <div className="space-y-3 mb-6">
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 animate-in fade-in slide-in-from-top-3">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <p className="text-sm font-semibold">{success}</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-800 animate-in fade-in slide-in-from-top-3">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="pastor_word" className="w-full">
          <TabsList className="grid grid-cols-3 max-w-2xl mb-8 bg-indigo-mid/5 p-1 border border-indigo-mid/10 rounded-xl h-11">
            <TabsTrigger value="pastor_word" className="rounded-lg font-bold text-xs uppercase tracking-wider py-2">
              Mot du Pasteur (Accueil)
            </TabsTrigger>
            <TabsTrigger value="banner" className="rounded-lg font-bold text-xs uppercase tracking-wider py-2">
              Bannière de Présentation
            </TabsTrigger>
            <TabsTrigger value="message" className="rounded-lg font-bold text-xs uppercase tracking-wider py-2">
              Liseuse Doctrinale
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PASTOR WORD SHOWCASE */}
          <TabsContent value="pastor_word" className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
              {/* Left Side: Fields */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-5">
                  <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3 mb-2">
                    Configuration du Mot du Pasteur (Landing Page)
                  </h3>
                  
                  {/* Servant Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-indigo uppercase tracking-wider">
                      Sélectionner le Serviteur (Pasteur)
                    </label>
                    <SearchableSelect
                      options={searchableUsers}
                      value={selectedUserId}
                      onChange={(val) => { clearAlerts(); setSelectedUserId(val); }}
                      placeholder="Rechercher et choisir le pasteur..."
                      clearable={false}
                    />
                    <p className="text-[11px] text-faint">
                      Désigne le compte administrateur dont le nom complet sera affiché publiquement.
                    </p>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="custom_title" className="text-xs font-bold text-indigo uppercase tracking-wider">
                      Titre personnalisé
                    </label>
                    <Input
                      id="custom_title"
                      placeholder="Ex: Pasteur Principal / Fondateur"
                      value={customTitle}
                      onChange={(e) => { clearAlerts(); setCustomTitle(e.target.value); }}
                      className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                    />
                  </div>

                  {/* Message */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="word" className="text-xs font-bold text-indigo uppercase tracking-wider">
                      Le message d&apos;accueil
                    </label>
                    <Textarea
                      id="word"
                      placeholder="Écrivez le message ou mot d'accueil pastoral..."
                      rows={10}
                      value={word}
                      onChange={(e) => { clearAlerts(); setWord(e.target.value); }}
                      className="rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3.5 text-sm text-indigo focus-visible:border-gold resize-y min-h-[220px]"
                    />
                  </div>
                </div>

                {/* Social Network Section */}
                <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-indigo italic mb-4">
                    Réseaux Sociaux du Pasteur
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                        <Facebook className="size-5" />
                      </span>
                      <Input
                        placeholder="Lien Facebook"
                        value={socialLinks.facebook}
                        onChange={(e) => { clearAlerts(); setSocialLinks((prev) => ({ ...prev, facebook: e.target.value })); }}
                        className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600">
                        <Instagram className="size-5" />
                      </span>
                      <Input
                        placeholder="Lien Instagram"
                        value={socialLinks.instagram}
                        onChange={(e) => { clearAlerts(); setSocialLinks((prev) => ({ ...prev, instagram: e.target.value })); }}
                        className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                        <Youtube className="size-5" />
                      </span>
                      <Input
                        placeholder="Lien YouTube"
                        value={socialLinks.youtube}
                        onChange={(e) => { clearAlerts(); setSocialLinks((prev) => ({ ...prev, youtube: e.target.value })); }}
                        className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Photo */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm text-center">
                  <label className="text-xs font-bold text-indigo uppercase tracking-wider block mb-4 text-left">
                    Photo Officielle
                  </label>

                  <div className="relative group overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream aspect-[3/4] flex items-center justify-center mb-4">
                    {currentPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element -- dynamic blob/remote preview URL; next/image breaks object-preview blobs
                      <img
                        src={currentPreview}
                        alt="Aperçu photo pastorale"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center p-6 text-faint">
                        <User className="size-12 mb-2 opacity-50" />
                        <p className="text-xs font-semibold">Aucune photo</p>
                      </div>
                    )}

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-ink/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition duration-200"
                    >
                      <Upload className="size-6 mb-1" />
                      <span className="text-[11px] font-bold">Changer la photo</span>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />

                  <BrandButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4 mr-1.5" /> Sélectionner une photo
                  </BrandButton>
                  <p className="text-[10px] text-faint mt-2.5">
                    Portrait (ratio 3:4, max 5Mo).
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PRESENTATION BANNER */}
          <TabsContent value="banner" className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3 mb-2">
                Configuration de la Bannière de Présentation (page /eglise)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Eyebrow */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="eyebrow" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Surtitre / Sourcil (Eyebrow)
                  </label>
                  <Input
                    id="eyebrow"
                    placeholder="Ex: Présentation MFM Ficgayo"
                    value={eyebrow}
                    onChange={(e) => { clearAlerts(); setEyebrow(e.target.value); }}
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>

                {/* Button text */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="button_text" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Texte du bouton
                  </label>
                  <Input
                    id="button_text"
                    placeholder="Ex: Lire le message"
                    value={buttonText}
                    onChange={(e) => { clearAlerts(); setButtonText(e.target.value); }}
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>
              </div>

              {/* Accroche / Quote */}
              <div className="flex flex-col gap-2">
                <label htmlFor="quote" className="text-xs font-bold text-indigo uppercase tracking-wider">
                  Accroche principale (Citation entre guillemets)
                </label>
                <Input
                  id="quote"
                  placeholder="Ex: « Soyez les bienvenus sur cette page Prophétique... »"
                  value={quote}
                  onChange={(e) => { clearAlerts(); setQuote(e.target.value); }}
                  className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm font-semibold text-indigo focus-visible:border-gold"
                />
              </div>

              {/* Short description */}
              <div className="flex flex-col gap-2">
                <label htmlFor="short_description" className="text-xs font-bold text-indigo uppercase tracking-wider">
                  Courte description introductive
                </label>
                <Textarea
                  id="short_description"
                  placeholder="Décrivez brièvement le message doctrinal..."
                  rows={4}
                  value={shortDescription}
                  onChange={(e) => { clearAlerts(); setShortDescription(e.target.value); }}
                  className="rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] p-3.5 text-sm text-indigo focus-visible:border-gold resize-none"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: GRAND MESSAGE DOCTRINAL */}
          <TabsContent value="message" className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-6">
              <h3 className="font-display text-lg font-bold text-indigo italic border-b pb-3 mb-2">
                Contenu de la Liseuse Doctrinale (page /eglise/presentation)
              </h3>

              {/* Preacher Select & Title Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Serviteur associé (Prédicateur)
                  </label>
                  <SearchableSelect
                    options={searchableUsers}
                    value={preacherId}
                    onChange={(val) => { clearAlerts(); setPreacherId(val); }}
                    placeholder="Choisir le serviteur..."
                    clearable={false}
                  />
                  <p className="text-[10px] text-faint">
                    Son nom, rôle et initiales seront affichés en signature au bas du message.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="custom_eyebrow" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Surtitre du message
                  </label>
                  <Input
                    id="custom_eyebrow"
                    placeholder="Ex: Message de Bienvenue"
                    value={customEyebrow}
                    onChange={(e) => { clearAlerts(); setCustomEyebrow(e.target.value); }}
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="long_custom_title" className="text-xs font-bold text-indigo uppercase tracking-wider">
                  Grand Titre du Message Doctrinal
                </label>
                <Input
                  id="long_custom_title"
                  placeholder="Ex: Mot du Surintendant Régional"
                  value={longCustomTitle}
                  onChange={(e) => { clearAlerts(); setLongCustomTitle(e.target.value); }}
                  className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                />
              </div>

              {/* Guarantees Box */}
              <div className="border border-[rgba(40,25,80,0.08)] rounded-xl p-5 bg-indigo-mid/[0.01] space-y-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="guarantees_title" className="text-xs font-bold text-indigo-mid uppercase tracking-wider">
                    Titre de la section des garanties
                  </label>
                  <Input
                    id="guarantees_title"
                    placeholder="Ex: En parcourant ce site, 3 choses vous sont garanties :"
                    value={guaranteesTitle}
                    onChange={(e) => { clearAlerts(); setGuaranteesTitle(e.target.value); }}
                    className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm font-semibold text-indigo focus-visible:border-gold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-indigo uppercase tracking-wider block">
                    Points de garanties prophétiques
                  </label>

                  {guaranteesList.map((guarantee, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-dark text-xs font-bold font-mono">
                        {idx + 1}
                      </span>
                      <Input
                        value={guarantee}
                        onChange={(e) => handleGuaranteeChange(idx, e.target.value)}
                        placeholder={`Garantie numéro ${idx + 1}`}
                        className="h-10 rounded-lg border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3 text-xs text-indigo focus-visible:border-gold"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGuarantee(idx)}
                        className="p-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition shrink-0"
                        title="Supprimer ce point"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddGuarantee}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gold-dark hover:text-gold transition mt-1 px-1 py-0.5"
                  >
                    <Plus className="size-4" /> Ajouter une garantie
                  </button>
                </div>
              </div>

              {/* Rich text / HTML content */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="html_content" className="text-xs font-bold text-indigo uppercase tracking-wider">
                    Grand texte de lecture (Éditeur Riche)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] text-faint">
                    <HelpCircle className="size-3" /> Utilisez les boutons de macro pour injecter des blocs stylisés (Verset, Prière).
                  </span>
                </div>
                <RichEditor
                  value={htmlContent}
                  onChange={(val) => {
                    clearAlerts();
                    setHtmlContent(val);
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Global Save Button */}
        <div className="flex justify-end pt-4">
          <BrandButton
            type="submit"
            disabled={loading}
            variant="gold"
            size="lg"
            className="text-sm font-extrabold shadow-md shadow-gold/25"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="size-4 mr-1.5" />
                Enregistrer toutes les modifications
              </>
            )}
          </BrandButton>
        </div>
      </form>
    </div>
  );
}
