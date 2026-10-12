import type { Agent, Mode, PlayerId } from "../../types";

export type DraftEventId =
  | "ban-wave"
  | "ban-2x"
  | "ban-1x"
  | "forced-downgrade"
  | "soul-stone"
  | "anomaly-invitation"
  | "anomaly-invitation-plus"
  | "rupture-invitation"
  | "rupture-invitation-plus"
  | "support-invitation"
  | "support-invitation-plus"
  | "attack-invitation"
  | "attack-invitation-plus"
  | "stunner-invitation"
  | "stunner-invitation-plus"
  | "gatekeeper"
  | "forced-random-agent"
  | "remote-control";

export interface DraftEventDef {
  id: DraftEventId;
  title: string;
  desc: string;
  weight: number; // relative weight; renormalized among whatever's eligible at roll time
  standardOnly?: boolean; // excluded entirely in Swiftplay
  oncePerDraft?: boolean; // removed from the pool for the rest of THIS draft once it fires
}

// TOGGLE: whether the same event can be rolled more than once in one draft.
// Flip to `false` to make every event a one-time-only occurrence per draft
// (on top of anything already marked oncePerDraft, which is always one-time
// regardless of this flag).
export const ALLOW_REPEAT_DRAFT_EVENTS = true;

export const DRAFT_EVENTS: DraftEventDef[] = [
  {
    id: "ban-wave",
    title: "Ban Wave",
    weight: 5,
    desc: "Players will start another ban wave of 1 Agent per category.",
  },
  {
    id: "ban-2x",
    title: "Ban 2x",
    weight: 10,
    desc: "Players will each ban another 2 Agents.",
  },
  {
    id: "ban-1x",
    title: "Ban 1x",
    weight: 14,
    desc: "Players will each ban another Agent.",
  },
  {
    id: "forced-downgrade",
    title: "Forced Downgrade",
    weight: 15,
    desc: "Players will each be forced to pick an A-Rank Agent in their next pick(s).",
  },
  {
    id: "soul-stone",
    title: "Soul Stone",
    weight: 10,
    standardOnly: true,
    desc: "Both players receive a Soul Stone in place of their next pick. It can morph into any Agent, but must be eliminated first if you lose a round it was used in.",
  },
  {
    id: "anomaly-invitation",
    title: "Anomaly Invitation",
    weight: 2,
    desc: "Both players' next pick is forced to be an unbanned Anomaly Agent.",
  },
  {
    id: "anomaly-invitation-plus",
    title: "Anomaly Invitation+",
    weight: 1,
    desc: "Both players' next pick is forced to be an Anomaly Agent — banned Agents included.",
  },
  {
    id: "rupture-invitation",
    title: "Ruptures Invitation",
    weight: 2,
    desc: "Both players' next pick is forced to be an unbanned Rupture Agent.",
  },
  {
    id: "rupture-invitation-plus",
    title: "Ruptures Invitation+",
    weight: 1,
    desc: "Both players' next pick is forced to be a Rupture Agent — banned Agents included.",
  },
  {
    id: "support-invitation",
    title: "Supports Invitation",
    weight: 2,
    desc: "Both players' next pick is forced to be an unbanned Support or Defense Agent.",
  },
  {
    id: "support-invitation-plus",
    title: "Supports Invitation+",
    weight: 1,
    desc: "Both players' next pick is forced to be a Support or Defense Agent — banned Agents included.",
  },
  {
    id: "attack-invitation",
    title: "Attackers Invitation",
    weight: 2,
    desc: "Both players' next pick is forced to be an unbanned Attack Agent.",
  },
  {
    id: "attack-invitation-plus",
    title: "Attackers Invitation+",
    weight: 1,
    desc: "Both players' next pick is forced to be an Attack Agent — banned Agents included.",
  },
  {
    id: "stunner-invitation",
    title: "Stunners Invitation",
    weight: 2,
    desc: "Both players' next pick is forced to be an unbanned Stunner Agent.",
  },
  {
    id: "stunner-invitation-plus",
    title: "Stunners Invitation+",
    weight: 1,
    desc: "Both players' next pick is forced to be a Stunner Agent — banned Agents included.",
  },
  {
    id: "gatekeeper",
    title: "Gatekeeper",
    weight: 15,
    standardOnly: true,
    oncePerDraft: true,
    desc: "From now on, Agents picked by one player cannot be picked by the other.",
  },
  {
    id: "forced-random-agent",
    title: "Forced Random Agent",
    weight: 25,
    desc: "A random unbanned, unpicked Agent is selected for both players, then the draft continues as normal.",
  },
  {
    id: "remote-control",
    title: "Remote Control",
    weight: 5,
    desc: "Both players may pick their opponent's next Agent.",
  }, // flavor-only, no mechanical effect
];

// Invitations
export const INVITATION_SPECIALTIES: Partial<
  Record<DraftEventId, { specialties: string[]; includeBanned: boolean }>
> = {
  "anomaly-invitation": { specialties: ["Anomaly"], includeBanned: false },
  "anomaly-invitation-plus": { specialties: ["Anomaly"], includeBanned: true },
  "rupture-invitation": { specialties: ["Rupture"], includeBanned: false },
  "rupture-invitation-plus": { specialties: ["Rupture"], includeBanned: true },
  "support-invitation": {
    specialties: ["Support", "Defense"],
    includeBanned: false,
  },
  "support-invitation-plus": {
    specialties: ["Support", "Defense"],
    includeBanned: true,
  },
  "attack-invitation": { specialties: ["Attack"], includeBanned: false },
  "attack-invitation-plus": { specialties: ["Attack"], includeBanned: true },
  "stunner-invitation": { specialties: ["Stunner"], includeBanned: false },
  "stunner-invitation-plus": { specialties: ["Stunner"], includeBanned: true },
};

export const SOUL_STONE_AGENT: Agent = {
  id: "soul-stone",
  name: "Soul Stone",
  s_rank: true,
  attribute: "None",
  specialty: "Wildcard",
  atkType: "None",
  faction: "N/A",
  rarity: "Unique",
  price: 0,
};

export interface DraftEventContext {
  mode: Mode;
  banned: string[];
  pool: Agent[];
  gatekeeperActive: boolean;
  firedEventIds: DraftEventId[];
}

export function isDraftEventEligible(
  event: DraftEventDef,
  ctx: DraftEventContext,
): boolean {
  if (event.standardOnly && ctx.mode !== "standard") return false;
  if (event.oncePerDraft && ctx.firedEventIds.includes(event.id)) return false;
  if (!ALLOW_REPEAT_DRAFT_EVENTS && ctx.firedEventIds.includes(event.id))
    return false;

  if (event.id === "gatekeeper" && ctx.gatekeeperActive) return false;

  if (event.id === "forced-downgrade") {
    const hasARank = ctx.pool.some(
      (a) => !a.s_rank && !ctx.banned.includes(a.id),
    );
    if (!hasARank) return false;
  }

  const invite = INVITATION_SPECIALTIES[event.id];
  if (invite) {
    const hasEligible = ctx.pool.some(
      (a) =>
        invite.specialties.includes(a.specialty) &&
        (invite.includeBanned || !ctx.banned.includes(a.id)),
    );
    if (!hasEligible) return false;
  }

  if (event.id === "forced-random-agent") {
    const hasAny = ctx.pool.some((a) => !ctx.banned.includes(a.id));
    if (!hasAny) return false;
  }

  return true;
}

export function rollDraftEvent(ctx: DraftEventContext): DraftEventDef | null {
  const eligible = DRAFT_EVENTS.filter((e) => isDraftEventEligible(e, ctx));
  if (eligible.length === 0) return null;
  const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const e of eligible) {
    if (roll < e.weight) return e;
    roll -= e.weight;
  }
  return eligible[eligible.length - 1];
}

export interface PickRestriction {
  kind: "a-rank" | "specialty";
  specialties?: string[];
  includeBanned?: boolean;
  picksRemaining: number;
}

export interface ExtraBanTurn {
  player: PlayerId;
  enforceCategoryLock: boolean;
}
