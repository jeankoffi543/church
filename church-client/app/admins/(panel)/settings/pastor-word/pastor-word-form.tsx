"use client";

import React, { useState, useRef, useEffect } from "react";
import { Loader2, Save, Upload, User, Globe, AlertCircle, CheckCircle2 } from "lucide-react";
import { SearchableSelect, type SearchableOption } from "../../_components/searchable-select";
import { updateAdminPastorWord, type AdminPastorWord, type AdminUserOption } from "@/lib/admin-api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrandButton } from "@/components/ui/brand-button";

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
  initialData: AdminPastorWord | null;
  users: AdminUserOption[];
};

export function PastorWordForm({ initialData, users }: PastorWordFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialData?.user_id ?? null
  );
  const [customTitle, setCustomTitle] = useState(initialData?.custom_title ?? "");
  const [word, setWord] = useState(initialData?.word ?? "");
  const [socialLinks, setSocialLinks] = useState({
    facebook: initialData?.social_links?.facebook ?? "",
    instagram: initialData?.social_links?.instagram ?? "",
    youtube: initialData?.social_links?.youtube ?? "",
  });

  // Image Upload State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
  const ASSET_BASE = API_URL.replace(/\/api\/v1\/?$/, "");

  const getFullPhotoUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("data:")) return path; // local base64 preview
    if (/^https?:\/\//i.test(path)) return path;
    return `${ASSET_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const initialPhotoUrl = getFullPhotoUrl(initialData?.photo_path ?? null);

  // Clear success/error states when user starts editing
  const clearAlerts = () => {
    setSuccess(null);
    setError(null);
  };

  // Timer to clear alerts automatically after 4 seconds
  useEffect(() => {
    if (!success && !error) return;
    const timer = setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [success, error]);

  // Handle manual input changes
  const handleUserChange = (userId: number | null) => {
    clearAlerts();
    setSelectedUserId(userId);
  };

  const handleTitleChange = (val: string) => {
    clearAlerts();
    setCustomTitle(val);
  };

  const handleWordChange = (val: string) => {
    clearAlerts();
    setWord(val);
  };

  const handleSocialChange = (key: "facebook" | "instagram" | "youtube", val: string) => {
    clearAlerts();
    setSocialLinks((prev) => ({ ...prev, [key]: val }));
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

  // Format active users for the combobox SearchableSelect
  const searchableUsers = users.map<SearchableOption>((u) => ({
    value: u.id,
    label: u.name,
    sublabel: u.email,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError("Veuillez sélectionner le serviteur/administrateur désigné comme Pasteur.");
      return;
    }
    if (!word.trim()) {
      setError("Le message d'accueil ne peut pas être vide.");
      return;
    }

    setLoading(true);
    clearAlerts();

    try {
      const formData = new FormData();
      formData.append("user_id", String(selectedUserId));
      formData.append("custom_title", customTitle);
      formData.append("word", word);
      formData.append("social_links", JSON.stringify(socialLinks));

      if (photoFile) {
        formData.append("photo", photoFile);
      }

      const res = await updateAdminPastorWord(formData);
      setSuccess(res.message || "Le mot du pasteur a été mis à jour.");
      setPhotoFile(null); // Reset file input selection after upload
    } catch (err) {
      setError((err as Error).message || "Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const currentPreview = photoPreview || initialPhotoUrl;

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8 border-b border-[rgba(40,25,80,0.06)] pb-5">
        <h1 className="font-display text-3xl font-extrabold text-indigo italic">
          Le Mot du Pasteur
        </h1>
        <p className="text-sm text-body mt-1">
          Configurez le message d&apos;accueil officiel, la photo et les réseaux du pasteur affichés sur la page d&apos;accueil publique.
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">
        {/* Left Side: Fields */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm space-y-5">
            {/* Servant Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-indigo uppercase tracking-wider">
                Sélectionner le Serviteur (Pasteur)
              </label>
              <SearchableSelect
                options={searchableUsers}
                value={selectedUserId}
                onChange={handleUserChange}
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
                onChange={(e) => handleTitleChange(e.target.value)}
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
                onChange={(e) => handleWordChange(e.target.value)}
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
                  onChange={(e) => handleSocialChange("facebook", e.target.value)}
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
                  onChange={(e) => handleSocialChange("instagram", e.target.value)}
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
                  onChange={(e) => handleSocialChange("youtube", e.target.value)}
                  className="h-11 rounded-xl border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-4 text-sm text-indigo focus-visible:border-gold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Photo and Save Actions */}
        <div className="space-y-6">
          {/* Photo Uploader Card */}
          <div className="rounded-2xl border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-sm text-center">
            <label className="text-xs font-bold text-indigo uppercase tracking-wider block mb-4 text-left">
              Photo Officielle
            </label>

            {/* Photo frame layout */}
            <div className="relative group overflow-hidden rounded-xl border border-[rgba(40,25,80,0.12)] bg-cream aspect-[3/4] flex items-center justify-center mb-4">
              {currentPreview ? (
                <img
                  src={currentPreview}
                  alt="Aperçu photo pastorale"
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center p-6 text-faint">
                  <User className="size-12 mb-2 opacity-50" />
                  <p className="text-xs font-semibold">Aucune photo sélectionnée</p>
                </div>
              )}

              {/* Hover overlay trigger */}
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
              Recommandé : Format portrait (ratio 3:4, max 5Mo).
            </p>
          </div>

          {/* Action button */}
          <BrandButton
            type="submit"
            disabled={loading}
            variant="gold"
            size="full"
            className="h-12 text-sm font-extrabold shadow-md shadow-gold/25"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Sauvegarde en cours...
              </>
            ) : (
              <>
                <Save className="size-4 mr-1.5" />
                Enregistrer les modifications
              </>
            )}
          </BrandButton>
        </div>
      </form>
    </div>
  );
}
