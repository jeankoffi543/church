import Image from "next/image";

import { loginAdmin } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from = "", error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px] rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-8 shadow-[0_24px_60px_rgba(22,15,51,0.12)]">
        <div className="mb-7 flex flex-col items-center text-center">
          <Image
            src="/images/logo-no-bg.png"
            alt="Logo MFM Ficgayo"
            width={64}
            height={64}
            priority
            className="mb-3 size-16 object-contain"
          />
          <h1 className="font-display text-[26px] font-semibold text-indigo italic">
            Espace administrateur
          </h1>
          <p className="mt-1 text-[13px] text-body">
            Accès réservé à l&apos;équipe MFM Ficgayo.
          </p>
        </div>

        {error === "missing" && (
          <p className="mb-4 rounded-lg bg-live/10 px-3 py-2.5 text-[13px] font-medium text-live">
            Merci de renseigner votre e-mail et votre mot de passe.
          </p>
        )}

        {error === "invalid" && (
          <p className="mb-4 rounded-lg bg-live/10 px-3 py-2.5 text-[13px] font-medium text-live">
            Identifiants invalides. Veuillez réessayer.
          </p>
        )}

        <form action={loginAdmin} className="flex flex-col gap-4">
          <input type="hidden" name="from" value={from} />

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">
              E-mail
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@mfm-ficgayo.ci"
              className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold tracking-wide text-body-strong uppercase">
              Mot de passe
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border border-[rgba(40,25,80,0.12)] bg-[#faf8f4] px-3.5 py-3 text-[15px] text-indigo outline-none focus:border-gold"
            />
          </label>

          <button
            type="submit"
            className="mt-1 w-full cursor-pointer rounded-xl bg-gradient-to-br from-gold to-gold-dark py-3.5 text-[15px] font-bold text-indigo shadow-[0_12px_30px_rgba(200,144,46,0.3)] transition hover:-translate-y-0.5 hover:brightness-105"
          >
            Se connecter
          </button>
        </form>

        <p className="mt-5 text-center text-[11.5px] text-faint">
          🔒 Connexion sécurisée · espace séparé du site public
        </p>
      </div>
    </div>
  );
}
