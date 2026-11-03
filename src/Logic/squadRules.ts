// Pure rules for squad selection, cooldowns and round-loss removal.
// Kept free of React so they can be unit-tested and simulated on their own.

export const SQUAD_SIZE = 3;
export const REMOVAL_COUNT = 2; // agents a round's loser normally loses

// agent id -> rounds of cooldown remaining
export type Cooldowns = Record<string, number>;

// agent id -> restriction tier. Missing / 0 = unrestricted.
//   1 = "already played" (Horizontal Investment)
//   2 = on cooldown / fatigued
export type Tiers = Record<string, number>;

// Merges every source of restriction into one tier map.
export function buildTiers(args: {
  rosterIds: string[];
  cooldowns: Cooldowns; // normal cooldown from playing last round
  fatigue: Cooldowns; // Overworked
  immune: string[]; // Overtime Contract: never restricted
  playedBefore?: string[]; // only passed while Horizontal Investment is active
}): Tiers {
  const { rosterIds, cooldowns, fatigue, immune, playedBefore } = args;
  const tiers: Tiers = {};
  rosterIds.forEach((id) => {
    if (immune.includes(id)) return;
    if (id in cooldowns || id in fatigue) tiers[id] = 2;
    else if (playedBefore && playedBefore.includes(id)) tiers[id] = 1;
  });
  return tiers;
}

// Can `agentId` be added to `squad` right now?
//  - An agent can only be added once EVERY agent of a lower tier is already in
//    the squad. So with 3+ unrestricted agents, restricted ones never unlock;
//    with fewer, the unrestricted ones must all be picked first.
//  - `lockOne` (Necromancy): at most one of these may be in the squad, unless
//    there aren't enough other agents to fill it ("forced").
export function isSquadPickAllowed(
  rosterIds: string[],
  tiers: Tiers,
  squad: string[],
  agentId: string,
  lockOne: string[] = [],
): boolean {
  if (!rosterIds.includes(agentId)) return false;
  if (squad.includes(agentId)) return true; // already picked (click = deselect)
  if (squad.length >= SQUAD_SIZE) return false;

  const tier = tiers[agentId] ?? 0;
  const lowerDone = rosterIds.every(
    (id) => (tiers[id] ?? 0) >= tier || squad.includes(id),
  );
  if (!lowerDone) return false;

  if (lockOne.includes(agentId) && squad.some((id) => lockOne.includes(id))) {
    const needed = SQUAD_SIZE - squad.length;
    // Only agents at the same tier or freer count as alternatives. A more
    // restricted agent can't be picked until this one is, so counting it would
    // leave both stuck (a deadlock).
    const others = rosterIds.filter(
      (id) => !lockOne.includes(id) && !squad.includes(id) && (tiers[id] ?? 0) <= tier,
    ).length;
    if (others >= needed) return false; // not forced
  }
  return true;
}

// Re-validates a squad after a change (e.g. a free agent was deselected, which
// can make an already-picked restricted agent illegal again).
// `fixed` agents (Tunnel Vision's forced pick) always stay, and count as part of
// the squad for everything that follows.
export function sanitizeSquad(
  rosterIds: string[],
  tiers: Tiers,
  squad: string[],
  lockOne: string[] = [],
  fixed: string[] = [],
): string[] {
  const out: string[] = fixed.filter((id) => rosterIds.includes(id));
  squad.forEach((id) => {
    if (fixed.includes(id)) return;
    if (out.length < SQUAD_SIZE && isSquadPickAllowed(rosterIds, tiers, out, id, lockOne))
      out.push(id);
  });
  return out;
}

// Fills a (possibly partial) squad up to `size` agents (default SQUAD_SIZE),
// lowest tier first.
export function autoFillSquad(
  rosterIds: string[],
  tiers: Tiers,
  current: string[],
  lockOne: string[] = [],
  rng: () => number = Math.random,
  size: number = SQUAD_SIZE,
  fixed: string[] = [],
): string[] {
  const squad = sanitizeSquad(rosterIds, tiers, current, lockOne, fixed).slice(0, size);
  while (squad.length < size) {
    const options = rosterIds.filter(
      (id) => !squad.includes(id) && isSquadPickAllowed(rosterIds, tiers, squad, id, lockOne),
    );
    if (options.length === 0) break;
    squad.push(options[Math.floor(rng() * options.length)]);
  }
  return squad;
}

// Normal cooldowns for the NEXT round, computed per player.
//  - Everyone who played this round (and survived) goes on cooldown, except
//    immune agents (Overtime Contract).
//  - Existing cooldowns tick down by one and are dropped at zero.
//  - Once a player is down to SQUAD_SIZE agents or fewer they have no choice in
//    who plays, so nobody is put on cooldown.
export function nextCooldowns(args: {
  rosterIds: string[];
  cooldowns: Cooldowns;
  squad: string[];
  eliminated: string[]; // THIS player's eliminated agents only
  cooldownRounds: number;
  immune?: string[];
}): Cooldowns {
  const { rosterIds, cooldowns, squad, eliminated, cooldownRounds, immune = [] } = args;
  const survivors = rosterIds.filter((id) => !eliminated.includes(id));
  if (survivors.length <= SQUAD_SIZE) return {};

  const next: Cooldowns = {};
  Object.entries(cooldowns).forEach(([id, remaining]) => {
    if (survivors.includes(id) && remaining - 1 > 0) next[id] = remaining - 1;
  });
  squad.forEach((id) => {
    if (survivors.includes(id) && !immune.includes(id)) next[id] = cooldownRounds;
  });
  return next;
}

// Which agents the loser of a round chooses from, and which of those are forced.
// `forced` marks agents that must be removed when their round is lost (Soul Stones,
// Invitations). If a squad holds more of them than the loss costs, they can't all go,
// so the loser picks which of the forced agents are removed and nothing is pre-locked.
export function removalPlan(args: {
  squad: string[];
  rosterIds: string[];
  wholeRoster: boolean; // may remove any agent on the roster, not just the squad
  count: number;
  isForced: (id: string) => boolean;
}): { pool: string[]; locked: string[] } {
  const { squad, rosterIds, wholeRoster, count, isForced } = args;
  const forced = squad.filter(isForced);
  let pool = wholeRoster ? rosterIds : squad;
  let locked = forced;
  if (forced.length > count) {
    pool = forced;
    locked = [];
  }
  if (pool.length <= count) locked = [...pool]; // nothing left to choose: all of them go
  return { pool, locked };
}

// Removal costs `count` agents and the loser must still be able to field a full
// squad afterwards, otherwise the match is over.
export function lossEndsMatch(
  rosterLength: number,
  minRoster: number,
  count: number = REMOVAL_COUNT,
): boolean {
  return rosterLength - count < minRoster;
}
