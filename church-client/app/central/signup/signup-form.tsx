"use client";

import { useState, type FormEvent } from "react";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

type Errors = Record<string, string[]>;

const FIELDS = {
  church_name: "",
  slug: "",
  admin_name: "",
  admin_email: "",
  password: "",
  password_confirmation: "",
};

export function SignupForm({ initialPlan }: { initialPlan?: string }) {
  const [form, setForm] = useState({ ...FIELDS });
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof FIELDS, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onName = (value: string) => {
    set("church_name", value);
    if (!slugEdited) set("slug", slugify(value));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    setGeneral(null);

    try {
      const res = await fetch(`${API_ORIGIN}/api/platform/signup`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ ...form, plan_code: initialPlan || "free" }),
      });

      if (res.status === 201) {
        const data = (await res.json()) as { admin_url: string };
        window.location.href = data.admin_url; // → the new church's admin login
        return;
      }
      if (res.status === 422) {
        const data = (await res.json()) as { errors?: Errors };
        setErrors(data.errors ?? {});
      } else if (res.status === 429) {
        setGeneral("Trop de tentatives. Réessayez dans une minute.");
      } else {
        setGeneral("Une erreur est survenue. Réessayez.");
      }
    } catch {
      setGeneral("Connexion impossible au serveur.");
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => errors[k]?.[0];

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-4 text-left">
      <Field label="Nom de l'église" error={err("church_name")}>
        <input className={input} value={form.church_name} onChange={(e) => onName(e.target.value)} autoFocus />
      </Field>

      <Field label="Adresse web" error={err("slug")} hint={`${form.slug || "votre-eglise"}.churchapp.io`}>
        <input
          className={input}
          value={form.slug}
          onChange={(e) => {
            setSlugEdited(true);
            set("slug", slugify(e.target.value));
          }}
          spellCheck={false}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Votre nom" error={err("admin_name")}>
          <input className={input} value={form.admin_name} onChange={(e) => set("admin_name", e.target.value)} />
        </Field>
        <Field label="Email" error={err("admin_email")}>
          <input className={input} type="email" value={form.admin_email} onChange={(e) => set("admin_email", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mot de passe" error={err("password")}>
          <input className={input} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <Field label="Confirmer">
          <input className={input} type="password" value={form.password_confirmation} onChange={(e) => set("password_confirmation", e.target.value)} />
        </Field>
      </div>

      {general && <p className="rounded-lg border border-live/40 bg-live/10 px-3 py-2 text-sm text-live-dark">{general}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-dark disabled:opacity-60"
      >
        {busy ? "Création en cours…" : "Créer mon église"}
      </button>
    </form>
  );
}

const input =
  "w-full rounded-lg border border-indigo/15 bg-white px-3 py-2.5 text-indigo outline-none focus:border-gold";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-indigo">{label}</span>
      {children}
      {hint && !error && <span className="font-mono text-xs text-faint">{hint}</span>}
      {error && <span className="text-xs text-live-dark">{error}</span>}
    </label>
  );
}
