import Link from "next/link";

// Minimal placeholder so the middleware's user-area redirects resolve.
// Flesh this out with the real fidèle (member) sign-in flow.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <section className="flex min-h-[70vh] items-center justify-center px-6 py-20">
      <div className="w-full max-w-[400px] rounded-[22px] border border-[rgba(40,25,80,0.08)] bg-white p-8 text-center shadow-[0_24px_60px_rgba(22,15,51,0.1)]">
        <h1 className="font-display text-[28px] font-semibold text-indigo italic">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-body">
          Espace des fidèles — connexion à venir.
          {from && (
            <span className="mt-1 block text-[12px] text-faint">
              Vous serez redirigé vers <code>{from}</code> après connexion.
            </span>
          )}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl border border-indigo-mid/25 px-5 py-2.5 text-sm font-semibold text-indigo-mid transition hover:border-gold"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </section>
  );
}
