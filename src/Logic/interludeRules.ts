// Pure rules for the between-round screens (affixes + universal modifiers).

import type { Agent, PlayerId } from "../types";
import { AFFIXES, type AffixDef } from "../Data/Events/affixes";
import { UNIVERSAL_MODIFIERS, type ModifierDef } from "../Data/Events/universalModifiers";
import { SOUL_STONE_AGENT, SOUL_STONE_PLUS_AGENT, isSoulStone } from "../Data/morphItems";

export const SOUL_ID = SOUL_STONE_AGENT.id;
export const SOUL_PLUS_ID = SOUL_STONE_PLUS_AGENT.id;

export function otherPlayer(p: PlayerId): PlayerId {
  return p === "p1" ? "p2" : "p1";
}

// "Leading" = most round wins. Level = no leader.
export function leaderOf(wins: Record<PlayerId, number>): PlayerId | null {
  if (wins.p1 === wins.p2) return null;
  return wins.p1 > wins.p2 ? "p1" : "p2";
}

export interface InterludeContext {
  rosters: Record<PlayerId, Agent[]>;
  eliminatedPool: Record<PlayerId, Agent[]>; // agents eliminated FROM each player's roster
  lastSquads: Record<PlayerId, string[]>; // squads of the round that just ended
  lastWinner: PlayerId | null;
  minRoster: number;
  immune?: Record<PlayerId, string[]>; // already have an Overtime Contract
}

function uniqueById(list: Agent[]): Agent[] {
  const seen = new Set<string>();
  return list.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

// Eliminated agents `p` could take back: never a Soul Stone, never one they own.
export function ownRevivable(ctx: InterludeContext, p: PlayerId): Agent[] {
  const owned = new Set(ctx.rosters[p].map((a) => a.id));
  return uniqueById(ctx.eliminatedPool[p]).filter((a) => !isSoulStone(a.id) && !owned.has(a.id));
}

// Necromancy: EVERYONE's eliminated agents.
export function anyRevivable(ctx: InterludeContext, p: PlayerId): Agent[] {
  const owned = new Set(ctx.rosters[p].map((a) => a.id));
  return uniqueById([...ctx.eliminatedPool.p1, ...ctx.eliminatedPool.p2]).filter(
    (a) => !isSoulStone(a.id) && !owned.has(a.id),
  );
}

// Agents from the round that just ended that are still on `p`'s roster.
export function lastSquadSurvivors(ctx: InterludeContext, p: PlayerId): string[] {
  return ctx.lastSquads[p].filter((id) => ctx.rosters[p].some((a) => a.id === id));
}

// Last round's survivors who could still sign an Overtime Contract.
export function contractCandidates(ctx: InterludeContext, p: PlayerId): string[] {
  const already = ctx.immune?.[p] ?? [];
  return lastSquadSurvivors(ctx, p).filter((id) => !already.includes(id));
}

// Kamikaze only bites a player who WON the last battle, has 2+ survivors from
// that squad, and can afford to lose 2. Otherwise it is wasted ("no effect").
export function kamikazeApplies(ctx: InterludeContext, target: PlayerId): boolean {
  return (
    ctx.lastWinner === target &&
    lastSquadSurvivors(ctx, target).length >= 2 &&
    ctx.rosters[target].length - 2 >= ctx.minRoster
  );
}

// Can this POSITIVE affix do anything for `chooser`?
export function positiveAvailable(def: AffixDef, ctx: InterludeContext, chooser: PlayerId): boolean {
  switch (def.id) {
    case "overtime-contract":
      return contractCandidates(ctx, chooser).length >= 1;
    case "emergency-reinforcements":
      return ownRevivable(ctx, chooser).length >= 1;
    case "soul-stone-affix":
      return !ctx.rosters[chooser].some((a) => a.id === SOUL_ID);
    case "soul-stone-plus-affix":
      return !ctx.rosters[chooser].some((a) => a.id === SOUL_PLUS_ID);
    case "spell-of-necromancy":
      return anyRevivable(ctx, chooser).length >= 1;
    default:
      return true;
  }
}

export interface AffixOffer {
  positive: AffixDef | null; // for the LOSING player, if they take it
  negative: AffixDef | null; // for the LEADING player, if the loser gives it
  leader: PlayerId;
  chooser: PlayerId; // the losing player decides
}

function pickOne<T>(list: T[], rng: () => number): T | null {
  return list.length ? list[Math.floor(rng() * list.length)] : null;
}

export function rollAffixOffer(
  ctx: InterludeContext,
  leader: PlayerId,
  rng: () => number = Math.random,
  exclude: string[] = [],
): AffixOffer | null {
  const chooser = otherPlayer(leader);
  const positives = AFFIXES.filter(
    (a) => a.ready && a.polarity === "positive" && positiveAvailable(a, ctx, chooser),
  );
  // Negatives are always rolled: if one can't bite (e.g. Kamikaze), it is the
  // losing player's choice whether to give it or waste it.
  const negatives = AFFIXES.filter(
    (a) => a.ready && a.polarity === "negative" && !exclude.includes(a.id),
  );
  const positive = pickOne(positives, rng);
  const negative = pickOne(negatives, rng);
  if (!positive && !negative) return null;
  return { positive, negative, leader, chooser };
}

export function rollModifier(rng: () => number = Math.random): ModifierDef | null {
  return pickOne(UNIVERSAL_MODIFIERS.filter((m) => m.ready), rng);
}

// ---------- Preset Teams ----------
// A team is 3 agents: 1-2 from Attack/Anomaly/Rupture/Armorer, 0-1 Stun and
// 1-2 from Support/Defense. Banned agents are allowed; only the Soul Stone isn't
// part of the pool. Both players get the same team.
const CORE = ["Attack", "Anomaly", "Rupture", "Armorer"];
const STUN = ["Stun"];
const SUPPORT = ["Support", "Defense"];
const SHAPES: [number, number, number][] = [
  [1, 0, 2],
  [2, 0, 1],
  [1, 1, 1],
];

function sample<T>(list: T[], n: number, rng: () => number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    out.push(...pool.splice(Math.floor(rng() * pool.length), 1));
  }
  return out;
}

// Hugo Vlad only works with Stunners: if he is rolled, the rest of the team is
// re-rolled to hold 1-2 Stun agents. With 3 slots, 2 Stunners leave no room for a
// Support/Defense, so his teams are Hugo + 1 Stun + 1 Support/Defense, or
// Hugo + 2 Stun.
export const HUGO_ID = "hugo";

export function rollPresetTeam(agents: Agent[], rng: () => number = Math.random): string[] {
  const usable = agents.filter((a) => !isSoulStone(a.id));
  const [core, stun, sup] = SHAPES[Math.floor(rng() * SHAPES.length)];
  const team = [
    ...sample(usable.filter((a) => CORE.includes(a.specialty)), core, rng),
    ...sample(usable.filter((a) => STUN.includes(a.specialty)), stun, rng),
    ...sample(usable.filter((a) => SUPPORT.includes(a.specialty)), sup, rng),
  ];
  const hugo = team.find((a) => a.id === HUGO_ID);
  if (hugo) {
    const stunners = rng() < 0.5 ? 1 : 2;
    return [
      hugo,
      ...sample(usable.filter((a) => STUN.includes(a.specialty)), stunners, rng),
      ...sample(usable.filter((a) => SUPPORT.includes(a.specialty)), 2 - stunners, rng),
    ].map((a) => a.id);
  }
  return team.map((a) => a.id);
}

// ---------- Tunnel Vision ----------
// "Random means random": one agent from the WHOLE roster, even one that was
// just played or is on cooldown. It is a forced first pick; the player still
// chooses the other two.
export function rollTunnelVision(
  rosters: Record<PlayerId, Agent[]>,
  rng: () => number = Math.random,
): Record<PlayerId, string[]> {
  const one = (p: PlayerId) => {
    const a = pickOne(rosters[p], rng);
    return a ? [a.id] : [];
  };
  return { p1: one("p1"), p2: one("p2") };
}

// ---------- Necromancy pool bookkeeping ----------
// Removes revived agents from the shared eliminated pool. An agent that sits in
// `target`'s own list leaves that one first, otherwise it leaves the other's.
export function takeFromPool(
  pool: Record<PlayerId, Agent[]>,
  target: PlayerId,
  ids: string[],
): Record<PlayerId, Agent[]> {
  const next = { p1: [...pool.p1], p2: [...pool.p2] };
  ids.forEach((id) => {
    const own = next[target].findIndex((a) => a.id === id);
    if (own >= 0) next[target].splice(own, 1);
    else {
      const o = otherPlayer(target);
      const i = next[o].findIndex((a) => a.id === id);
      if (i >= 0) next[o].splice(i, 1);
    }
  });
  return next;
}
