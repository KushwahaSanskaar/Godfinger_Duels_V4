import type { ClassGroup, ModeConfig } from "../types";

export const CLASS_GROUPS: ClassGroup[] = [
  { label: "Attack", specialties: ["Attack"] },
  { label: "Stun", specialties: ["Stun"] },
  { label: "Anomaly", specialties: ["Anomaly"] },
  { label: "Rupture / Armorer", specialties: ["Rupture", "Armorer"] },
  { label: "Support / Defense", specialties: ["Support", "Defense"] },
];

export function groupForSpecialty(specialty: string): string {
  return (
    CLASS_GROUPS.find((g) => g.specialties.includes(specialty))?.label ??
    specialty
  );
}

export const MODES: Record<"standard" | "swiftplay", ModeConfig> = {
  standard: {
    label: "Standard (11 agents)",
    picksPerPlayer: 11,
    sharedPool: true, // both players may draft the same agent
    minRoster: 3,
    draftScript: [
      { type: "event" },
      { type: "pick", player: "p1", count: 1 },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "event" },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "pick", player: "p2", count: 2 },
      { type: "event" },
      { type: "pick", player: "p1", count: 2 },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "event" },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "pick", player: "p2", count: 1 },
    ],
  },
  swiftplay: {
    label: "Swiftplay (7 agents)",
    picksPerPlayer: 7,
    sharedPool: false, // players CANNOT draft the same agent
    minRoster: 3,
    draftScript: [
      { type: "event" },
      { type: "pick", player: "p1", count: 1 },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "event" },
      { type: "pick", player: "p2", count: 2 },
      { type: "pick", player: "p1", count: 2 },
      { type: "pick", player: "p2", count: 2 },
      { type: "event" },
      { type: "pick", player: "p1", count: 2 },
      { type: "pick", player: "p2", count: 1 },
    ],
  },
};
