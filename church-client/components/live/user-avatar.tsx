import { cn } from "@/lib/utils";

/** Stable 32-bit string hash → used to derive a deterministic hue. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Up to two uppercase initials from a (possibly single-word) pseudonym. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic, storage-free avatar: the same pseudonym always yields the same
 * colour + initials, so identities stay visually stable across the chat.
 */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  const hue = hashString(name) % 360;

  return (
    <span
      aria-hidden
      style={{ background: `linear-gradient(135deg, hsl(${hue} 62% 48%), hsl(${(hue + 28) % 360} 62% 38%))` }}
      className={cn(
        "grid size-7 shrink-0 select-none place-items-center rounded-full text-[10px] font-bold tracking-wide text-white shadow-sm",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
