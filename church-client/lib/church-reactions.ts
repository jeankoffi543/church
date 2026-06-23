import { Bird, Crown, Flame, Heart, HeartHandshake, type LucideIcon } from "lucide-react";

import type { ReactionType } from "@/lib/live";

export type ChurchReaction = {
  type: ReactionType;
  Icon: LucideIcon;
  emoji: string;
  color: string;
  label: string;
};

/** The exclusive "emojis du Royaume", shared by the reaction bar and analytics. */
export const CHURCH_REACTIONS: ChurchReaction[] = [
  { type: "flame", Icon: Flame, emoji: "🔥", color: "#ff9b3d", label: "Feu de l'Esprit" },
  { type: "hands", Icon: HeartHandshake, emoji: "🙌", color: "#ffd36b", label: "Adoration" },
  { type: "dove", Icon: Bird, emoji: "🕊️", color: "#8fd3ff", label: "Colombe de la paix" },
  { type: "crown", Icon: Crown, emoji: "👑", color: "#f5c542", label: "Couronne" },
  { type: "heart", Icon: Heart, emoji: "❤️", color: "#ff5b8a", label: "Amour divin" },
];

export const REACTION_BY_TYPE: Record<ReactionType, ChurchReaction> = CHURCH_REACTIONS.reduce(
  (acc, r) => {
    acc[r.type] = r;
    return acc;
  },
  {} as Record<ReactionType, ChurchReaction>,
);
