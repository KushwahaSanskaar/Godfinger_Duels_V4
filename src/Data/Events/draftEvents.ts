import type { Agent, Mode, PlayerId } from "../../types";
import { MORPH_ITEMS, SOUL_STONE_AGENT } from "../morphItems";

export { SOUL_STONE_AGENT };

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
  | "stun-invitation"
  | "stun-invitation-plus"
  | "gatekeeper"
  | "wild-draft"
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
    desc: "Initiate a ban wave: ban 1 Agent from each category.",
  },
  {
    id: "ban-2x",
    title: "Ban 2x",
    weight: 10,
    desc: "Both players ban 2 additional Agents.",
  },
  {
    id: "ban-1x",
    title: "Ban 1x",
    weight: 14,
    desc: "Both players ban 1 additional Agent.",
  },
  {
    id: "forced-downgrade",
    title: "Forced Downgrade",
    weight: 15,
    desc: "Both players' next pick must be an A-Rank Agent.",
  },
  {
    id: "soul-stone",
    title: "Soul Stone",
    weight: 10,
    standardOnly: true,
    oncePerDraft: true, // rosters are keyed by agent id: a 2nd Soul Stone would collide with the 1st
    desc: "Both players gain a Soul Stone. It morphs into any unbanned Agent and has unlimited uses, but is eliminated on loss.",
  },
  {
    id: "anomaly-invitation",
    title: "Anomaly Invitation",
    weight: 2,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any unbanned Anomaly Agent directly into your active squad.",
  },
  {
    id: "anomaly-invitation-plus",
    title: "Anomaly Invitation+",
    weight: 1,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any Anomaly Agent (including banned agents) directly into your active squad.",
  },
  {
    id: "rupture-invitation",
    title: "Ruptures Invitation",
    weight: 2,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any unbanned Rupture Agent directly into your active squad.",
  },
  {
    id: "rupture-invitation-plus",
    title: "Ruptures Invitation+",
    weight: 1,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any Rupture Agent (including banned agents) directly into your active squad.",
  },
  {
    id: "support-invitation",
    title: "Supports Invitation",
    weight: 2,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any unbanned Support Agent directly into your active squad.",
  },
  {
    id: "support-invitation-plus",
    title: "Supports Invitation+",
    weight: 1,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any Support Agent (including banned agents) directly into your active squad.",
  },
  {
    id: "attack-invitation",
    title: "Attackers Invitation",
    weight: 2,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any unbanned Attack Agent directly into your active squad.",
  },
  {
    id: "attack-invitation-plus",
    title: "Attackers Invitation+",
    weight: 1,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any Attack Agent (including banned agents) directly into your active squad.",
  },
  {
    id: "stun-invitation",
    title: "Stunners Invitation",
    weight: 2,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any unbanned Stun Agent directly into your active squad.",
  },
  {
    id: "stun-invitation-plus",
    title: "Stunners Invitation+",
    weight: 1,
    oncePerDraft: true, // rosters are keyed by item id: a repeat would collide
    desc: "Gain a 1-use Invitation. Use it during Squad Select to draft any Stun Agent (including banned agents) directly into your active squad.",
  },
  {
    id: "gatekeeper",
    title: "Gatekeeper",
    weight: 15,
    standardOnly: true,
    oncePerDraft: true,
    desc: "Agents selected by one player can no longer be picked by the other.",
  },
  {
    id: "wild-draft",
    title: "Wild-Draft",
    weight: 25,
    desc: "Instantly assigns 1 random unbanned, unpicked Agent to each player.",
  },
  // {
  //   id: "remote-control",
  //   title: "Remote Control",
  //   weight: 5,
  //   desc: "Both players may pick their opponent's next Agent.",
  // }, // flavor-only, no mechanical effect
];

// Invitations: derived from the roster items so the two can never disagree.
export const INVITATION_SPECIALTIES: Partial<
  Record<DraftEventId, { specialties: string[]; includeBanned: boolean }>
> = Object.fromEntries(
  Object.values(MORPH_ITEMS)
    .filter((item) => item.specialties && item.agent.id.includes("-invitation"))
    .map((item) => [
      item.agent.id,
      { specialties: item.specialties as string[], includeBanned: item.plus },
    ]),
);

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

  if (event.id === "wild-draft") {
    const hasAny = ctx.pool.some((a) => !ctx.banned.includes(a.id));
    if (!hasAny) return false;
  }

  return true;
}

export function rollDraftEvent(ctx: DraftEventContext): DraftEventDef | null {
  const eligible = DRAFT_EVENTS.filter((e) => isDraftEventEligible(e, ctx));
  // For dev testing purposes, force a specific event to trigger via console.
  // usage: forcedDraftEvent = "[EVENT_ID]" in the console.
  const forcedId =
    process.env.NODE_ENV === "development"
      ? (window as unknown as { forcedDraftEvent?: DraftEventId })
        .forcedDraftEvent
      : undefined;
  const forced = eligible.find((e) => e.id === forcedId);
  if (forced) return forced;
  
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
