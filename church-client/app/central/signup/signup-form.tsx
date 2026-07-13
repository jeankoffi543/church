"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api\/v1\/?$/, "");

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);

// Mirror of the backend SubdomainAvailability rule so we can skip a round-trip
// on obviously invalid input.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SLUG_MESSAGES: Record<string, string> = {
  reserved: "Ce sous-domaine est réservé.",
  taken: "Ce sous-domaine est déjà pris.",
  invalid: "3 à 40 caractères : lettres, chiffres et tirets.",
};

type Errors = Record<string, string[]>;
type SlugStatus = "idle" | "checking" | "available" | "unavailable";
type Phase = "form" | "provisioning";

const FIELDS = {
  church_name: "",
  slug: "",
  admin_name: "",
  admin_email: "",
  password: "",
  password_confirmation: "",
};

export function SignupForm({ initialPlan }: { initialPlan?: string }) {
  const [phase, setPhase] = useState<Phase>("form");
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ ...FIELDS });
  const [slugEdited, setSlugEdited] = useState(false);
  const [serverCheck, setServerCheck] = useState<{ slug: string; available: boolean; reason: string | null; domain: string | null } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const statusUrl = useRef<string | null>(null);

  const set = (key: keyof typeof FIELDS, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const onName = (value: string) => {
    set("church_name", value);
    if (!slugEdited) set("slug", slugify(value));
  };

  // Debounced subdomain availability — GET /api/platform/signup/subdomain (CHR-172).
  // The synchronous "empty / locally-invalid" states are derived during render
  // below, so the effect only ever writes state from its async callback.
  useEffect(() => {
    const slug = form.slug;
    if (slug.length < 3 || !SLUG_RE.test(slug)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_ORIGIN}/api/platform/signup/subdomain?subdomain=${encodeURIComponent(slug)}`,
          { headers: { accept: "application/json" }, signal: controller.signal },
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { available: boolean; reason: string | null; domain: string | null };
        setServerCheck({ slug, available: data.available, reason: data.reason, domain: data.domain });
      } catch {
        // Aborted (slug changed) or transient network error — leave the last
        // known result; the derived status falls back to "checking".
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [form.slug]);

  // Derived slug status — no state of its own, so typing can't desync it.
  const slug = form.slug;
  const result = serverCheck && serverCheck.slug === slug ? serverCheck : null;
  const slugStatus: SlugStatus =
    slug.length === 0
      ? "idle"
      : slug.length < 3 || !SLUG_RE.test(slug)
        ? "unavailable"
        : result
          ? result.available
            ? "available"
            : "unavailable"
          : "checking";
  const slugReason = slugStatus === "unavailable" ? (result?.reason ?? "invalid") : null;
  const checkedDomain = result?.domain ?? null;

  // Poll the provisioning state machine until the church is ready (CHR-173).
  useEffect(() => {
    if (phase !== "provisioning" || !statusUrl.current) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(statusUrl.current!, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { ready: boolean; failed: boolean; error: string | null; admin_url: string | null };
        if (!active) return;
        if (data.ready && data.admin_url) {
          window.location.href = data.admin_url; // → the new church's admin login
          return;
        }
        if (data.failed) {
          setGeneral(data.error || "La création a échoué. Réessayez.");
          setPhase("form");
          setStep(2);
          return;
        }
      } catch {
        // Transient network/error — keep polling.
      }
      if (active) timer = setTimeout(poll, 2500);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [phase]);

  const canProceed = form.church_name.trim().length > 0 && slugStatus === "available";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;

    // Step 1 → advance instead of submitting (also catches the Enter key).
    if (step === 1) {
      if (canProceed) setStep(2);
      return;
    }

    setBusy(true);
    setErrors({});
    setGeneral(null);

    try {
      const res = await fetch(`${API_ORIGIN}/api/platform/signup`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ ...form, plan_code: initialPlan || "free" }),
      });

      if (res.status === 202) {
        const data = (await res.json()) as { tenant_id: string };
        statusUrl.current = `${API_ORIGIN}/api/platform/signup/status/${data.tenant_id}`;
        setPhase("provisioning");
        return;
      }
      if (res.status === 422) {
        const data = (await res.json()) as { errors?: Errors };
        const errs = data.errors ?? {};
        setErrors(errs);
        if (errs.church_name || errs.slug) setStep(1); // send them back to fix identity
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

  if (phase === "provisioning") {
    return <Provisioning domain={checkedDomain} />;
  }

  return (
    <div className="mt-8">
      <StepTrail current={step} />

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4 text-left">
        {step === 1 ? (
          <>
            <Field label="Nom de l'église" error={err("church_name")}>
              <input className={input} value={form.church_name} onChange={(e) => onName(e.target.value)} autoFocus />
            </Field>

            <Field label="Adresse web" error={err("slug")} status={<SlugStatusLine status={slugStatus} reason={slugReason} domain={checkedDomain} slug={form.slug} />}>
              <input
                className={input}
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set("slug", slugify(e.target.value));
                }}
                spellCheck={false}
                placeholder="votre-eglise"
              />
            </Field>

            {general && <Banner>{general}</Banner>}

            <button type="submit" disabled={!canProceed} className={primaryBtn}>
              Continuer
            </button>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Votre nom" error={err("admin_name")}>
                <input className={input} value={form.admin_name} onChange={(e) => set("admin_name", e.target.value)} autoFocus />
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

            {general && <Banner>{general}</Banner>}

            <div className="mt-2 flex items-center gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-full px-5 py-3 font-semibold text-body transition hover:text-indigo">
                ← Retour
              </button>
              <button type="submit" disabled={busy} className={`flex-1 ${primaryBtn}`}>
                {busy ? "Création en cours…" : "Créer mon église"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

/** The "we're setting up your church" screen shown while ProvisionTenant runs. */
function Provisioning({ domain }: { domain: string | null }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="size-12 animate-spin rounded-full border-[3px] border-indigo/15 border-t-gold" />
      <h2 className="mt-6 font-display text-2xl font-bold text-indigo">Nous préparons votre église…</h2>
      <p className="mt-2 text-sm text-body">
        {domain ? (
          <>
            <span className="font-mono text-indigo">{domain}</span> sera en ligne dans un instant.
          </>
        ) : (
          "Votre site sera en ligne dans un instant."
        )}
      </p>
      <ul className="mt-6 flex flex-col gap-2 text-left text-sm text-body">
        <li className="flex items-center gap-2"><Dot /> Création de votre espace</li>
        <li className="flex items-center gap-2"><Dot /> Installation des modules</li>
        <li className="flex items-center gap-2"><Dot /> Préparation de votre compte administrateur</li>
      </ul>
      <p className="mt-6 text-xs text-faint">Vous serez redirigé automatiquement une fois prêt.</p>
    </div>
  );
}

function Dot() {
  return <span className="size-1.5 animate-pulse rounded-full bg-gold-dark" />;
}

function StepTrail({ current }: { current: 1 | 2 }) {
  const steps = ["Votre église", "Votre compte"];
  return (
    <ol className="flex items-center gap-3 text-sm">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2;
        const active = n === current;
        const done = n < current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${active || done ? "bg-gold text-ink" : "bg-indigo/10 text-faint"}`}>
              {done ? "✓" : n}
            </span>
            <span className={`font-semibold ${active ? "text-indigo" : "text-faint"}`}>{label}</span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-indigo/15" />}
          </li>
        );
      })}
    </ol>
  );
}

function SlugStatusLine({ status, reason, domain, slug }: { status: SlugStatus; reason: string | null; domain: string | null; slug: string }) {
  if (status === "checking") {
    return <span className="font-mono text-xs text-faint">Vérification…</span>;
  }
  if (status === "available" && domain) {
    return <span className="font-mono text-xs text-gold-dark">✓ {domain} est disponible</span>;
  }
  if (status === "unavailable") {
    return <span className="text-xs text-live-dark">{SLUG_MESSAGES[reason ?? "invalid"] ?? SLUG_MESSAGES.invalid}</span>;
  }
  return <span className="font-mono text-xs text-faint">{slug || "votre-eglise"}.churchapp.io</span>;
}

const input = "w-full rounded-lg border border-indigo/15 bg-white px-3 py-2.5 text-indigo outline-none focus:border-gold";

const primaryBtn = "rounded-full bg-gold px-6 py-3 font-semibold text-ink transition hover:bg-gold-dark disabled:opacity-60";

function Banner({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-live/40 bg-live/10 px-3 py-2 text-sm text-live-dark">{children}</p>;
}

function Field({
  label,
  status,
  error,
  children,
}: {
  label: string;
  status?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-semibold text-indigo">{label}</span>
      {children}
      {error ? <span className="text-xs text-live-dark">{error}</span> : status}
    </label>
  );
}
