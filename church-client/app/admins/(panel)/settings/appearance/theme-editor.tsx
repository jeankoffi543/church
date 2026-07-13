"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Palette, Save, Upload, X, Heart } from "lucide-react";

import { updateAdminSettings } from "@/lib/admin-api";
import { assetUrl } from "@/lib/asset-url";
import { PageShell, PageHeader } from "@/components/admin/data/page-shell";
import { Button } from "@/components/admin/ui/button";
import { inputClass } from "@/components/admin/ui/field";
import { StatusBanner, type Status } from "@/components/admin/ui/status-banner";
import { cn } from "@/lib/utils";

const DEFAULT_PRIMARY = "#e2b85f"; // brand gold
const DEFAULT_SECONDARY = "#211648"; // brand indigo

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const asString = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;

export function ThemeEditor({ initialTheme }: { initialTheme: Record<string, unknown> }) {
  const [siteName, setSiteName] = useState(asString(initialTheme.site_name));
  const [primary, setPrimary] = useState(asString(initialTheme.primary, DEFAULT_PRIMARY));
  const [secondary, setSecondary] = useState(asString(initialTheme.secondary, DEFAULT_SECONDARY));

  const initialLogo = asString(initialTheme.logo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo ? assetUrl(initialLogo) : null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>(null);
  const [isPending, startTransition] = useTransition();

  const onLogoPick = (file: File | null) => {
    if (!file) return;
    setLogoFile(file);
    setLogoRemoved(false);
    setLogoPreview(URL.createObjectURL(file));
    setStatus(null);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoRemoved(true);
    setLogoPreview(null);
    if (logoInput.current) logoInput.current.value = "";
  };

  const save = () => {
    if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
      setStatus({ type: "error", message: "Les couleurs doivent être des codes hexadécimaux valides (ex. #e2b85f)." });
      return;
    }
    setStatus(null);
    startTransition(async () => {
      try {
        const settings: { key: string; value: unknown; group: string }[] = [
          { key: "site_name", value: siteName.trim(), group: "theme" },
          { key: "primary", value: primary, group: "theme" },
          { key: "secondary", value: secondary, group: "theme" },
        ];
        const files: Record<string, File | null> = {};
        if (logoFile) {
          settings.push({ key: "logo", value: "", group: "theme" }); // value filled by the upload
          files.logo = logoFile;
        } else if (logoRemoved) {
          settings.push({ key: "logo", value: "", group: "theme" });
        }

        await updateAdminSettings(settings, Object.keys(files).length ? files : undefined);
        setStatus({ type: "success", message: "Apparence enregistrée. Votre site public reflète les changements." });
        setLogoFile(null);
        setLogoRemoved(false);
      } catch (err) {
        setStatus({ type: "error", message: (err as Error).message || "Enregistrement impossible." });
      }
    });
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Église & Présentation"
        title="Apparence du site"
        subtitle="Personnalisez le nom, les couleurs et le logo de votre église. Les couleurs et le nom s'appliquent immédiatement à votre site public."
      />

      <StatusBanner status={status} className="mb-6" />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-semibold text-indigo">Nom du site</span>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Église de la Grâce"
              maxLength={120}
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField label="Couleur principale" hint="Boutons & accents" value={primary} onChange={setPrimary} />
            <ColorField label="Couleur secondaire" hint="Titres & en-têtes" value={secondary} onChange={setSecondary} />
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-indigo">Logo</span>
            <div className="flex items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-indigo/10 bg-cream/50">
                {logoPreview ? (
                  <Image src={logoPreview} alt="Logo" width={64} height={64} unoptimized className="size-full object-contain" />
                ) : (
                  <Palette className="size-6 text-faint" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoInput.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo/20 bg-white px-3 py-2 text-xs font-semibold text-indigo transition hover:bg-cream"
                >
                  <Upload className="size-3.5" /> Importer
                </button>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-faint transition hover:text-live"
                  >
                    <X className="size-3.5" /> Retirer
                  </button>
                )}
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onLogoPick(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div>
            <Button icon={<Save className="size-4" />} loading={isPending} onClick={save}>
              Enregistrer l&apos;apparence
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-[11px] font-bold tracking-wider text-body uppercase">Aperçu</p>
          <div className="overflow-hidden rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white shadow-[0_1px_3px_rgba(22,15,51,0.04)]">
            <div className="flex items-center gap-2.5 px-5 py-4" style={{ backgroundColor: secondary }}>
              {logoPreview ? (
                <Image src={logoPreview} alt="" width={28} height={28} unoptimized className="size-7 rounded object-contain" />
              ) : (
                <span className="grid size-7 place-items-center rounded bg-white/15 text-xs font-bold text-white">✦</span>
              )}
              <span className="font-display text-lg font-bold text-white">{siteName || "Votre église"}</span>
            </div>
            <div className="px-5 py-6">
              <h3 className="font-display text-xl font-bold" style={{ color: secondary }}>
                Bienvenue chez nous
              </h3>
              <p className="mt-1.5 text-sm text-body">
                Rejoignez-nous ce dimanche pour un temps de louange et d&apos;adoration.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ backgroundColor: primary, color: secondary }}
              >
                <Heart className="size-4" /> Faire un don
              </button>
              <p className="mt-4 text-xs font-semibold" style={{ color: primary }}>
                Un accent de couleur principale
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function ColorField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-indigo">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={HEX_RE.test(value) ? value : DEFAULT_PRIMARY}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 shrink-0 cursor-pointer rounded-lg border border-indigo/15 bg-white p-1"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className={cn(inputClass, "font-mono uppercase")}
        />
      </div>
      <span className="text-xs text-faint">{hint}</span>
    </label>
  );
}
