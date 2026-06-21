// Deterministic colour mapping so a Group / Department always renders with the
// same elegant badge palette across the Users and Roles screens.

export type GroupStyle = { bg: string; text: string; dot: string; ring: string };

const PALETTE: GroupStyle[] = [
  { bg: "bg-gold/12", text: "text-gold-dark", dot: "bg-gold", ring: "ring-gold/30" },
  { bg: "bg-indigo/10", text: "text-indigo", dot: "bg-indigo", ring: "ring-indigo/25" },
  { bg: "bg-online/10", text: "text-online", dot: "bg-online", ring: "ring-online/30" },
  { bg: "bg-live/10", text: "text-live", dot: "bg-live", ring: "ring-live/30" },
  { bg: "bg-[#7c5cff]/12", text: "text-[#5b3fd6]", dot: "bg-[#7c5cff]", ring: "ring-[#7c5cff]/30" },
  { bg: "bg-[#0ea5e9]/12", text: "text-[#0369a1]", dot: "bg-[#0ea5e9]", ring: "ring-[#0ea5e9]/30" },
];

const SUPER_ADMIN_STYLE: GroupStyle = {
  bg: "bg-gradient-to-br from-gold/20 to-gold-dark/15",
  text: "text-gold-dark",
  dot: "bg-gold-dark",
  ring: "ring-gold/40",
};

export function groupStyle(name: string): GroupStyle {
  if (name === "Super Admin") return SUPER_ADMIN_STYLE;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
