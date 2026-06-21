import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * MFM Ficgayo wordmark: official "Montagne du Feu" emblem + name + kicker.
 * `tone="dark"` is used on the deep-navy footer.
 */
export function Logo({
  tone = "light",
  className,
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-3", className)}
      aria-label="MFM Ficgayo — Accueil"
    >
      <Image
        src={tone === "dark" ? "/images/logo.jpeg" : "/images/logo-no-bg.png"}
        alt="Logo Ministères de la Montagne du Feu et des Miracles"
        width={48}
        height={48}
        priority
        className={cn(
          "size-[46px] shrink-0 object-contain",
          // logo.jpeg has a white background → frame it as a tile on dark footer
          tone === "dark" && "rounded-[10px] bg-white p-0.5"
        )}
      />
      <span className="text-left leading-[1.05]">
        <span
          className={cn(
            "block font-display text-[21px] font-bold",
            tone === "dark" ? "text-white" : "text-indigo"
          )}
        >
          MFM Ficgayo
        </span>
        <span
          className={cn(
            "block text-[9.5px] font-bold tracking-[0.24em] uppercase",
            tone === "dark" ? "text-[#9a8fb5]" : "text-faint"
          )}
        >
          Maison du Feu
        </span>
      </span>
    </Link>
  );
}
