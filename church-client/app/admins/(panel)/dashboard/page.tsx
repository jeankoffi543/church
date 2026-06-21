import { Users, Video, CalendarDays, HandCoins } from "lucide-react";

const STATS = [
  { label: "Fidèles inscrits", value: "1 248", icon: Users },
  { label: "Cultes diffusés", value: "36", icon: Video },
  { label: "Événements à venir", value: "4", icon: CalendarDays },
  { label: "Dons ce mois", value: "—", icon: HandCoins },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-8">
        <span className="text-[11px] font-bold tracking-[0.2em] text-gold-dark uppercase">
          Backoffice
        </span>
        <h1 className="mt-1 font-display text-[34px] font-semibold text-indigo italic">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-body">
          Vue d&apos;ensemble de l&apos;activité de la Maison.
        </p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {STATS.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-[18px] border border-[rgba(40,25,80,0.08)] bg-white p-5 shadow-[0_1px_3px_rgba(22,15,51,0.05)]"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-lilac text-indigo-mid">
              <Icon className="size-5" />
            </span>
            <div className="mt-4 font-display text-[30px] font-bold text-indigo">
              {value}
            </div>
            <div className="text-[13px] font-semibold text-faint">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[18px] border border-dashed border-[rgba(40,25,80,0.15)] bg-white/60 p-8 text-center text-sm text-body">
        Squelette du tableau de bord — branchez ici vos modules (gestion des
        sermons, événements, fidèles, dons…).
      </div>
    </div>
  );
}
