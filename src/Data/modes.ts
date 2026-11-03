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

// Rounds are always decisive (a tie replays the round), so regulation can't end
// level. The overtime streak is kept only as a safety net.
export const OVERTIME_STREAK_TO_WIN = 2;

export function roundLabel(round: number, regulationRounds: number): string {
  if (round > regulationRounds) return `OVERTIME - ROUND ${round}`;
  if (round === regulationRounds) return `SUDDEN DEATH - ROUND ${round}`;
  return `ROUND ${round}`;
}

export const MODES: Record<"standard" | "swiftplay", ModeConfig> = {
  standard: {
    label: "Standard (11 agents)",
    picksPerPlayer: 11,
    sharedPool: true, // both players may draft the same agent
    minRoster: 3,
    rounds: 9,
    // 1 -> AFFIX -> 2 -> MOD -> 3 -> AFFIX -> 4 -> 5 -> AFFIX -> 6 -> MOD -> 7 -> AFFIX + MOD -> 8 -> 9
    interludes: {
      1: ["affix"],
      2: ["modifier"],
      3: ["affix"],
      5: ["affix"],
      6: ["modifier"],
      7: ["affix", "modifier"],
    },
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
    rounds: 5,
    // MOD -> 1 -> AFFIX -> 2 -> MOD -> 3 -> AFFIX -> 4 -> 5
    interludes: {
      0: ["modifier"],
      1: ["affix"],
      2: ["modifier"],
      3: ["affix"],
    },
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
