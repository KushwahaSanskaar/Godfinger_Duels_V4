export interface Boss {
  id: string;
  name: string;
}

export const BOSS_POOL: Boss[] = [
  { id: "1", name: "Haytor" },
  { id: "2", name: "Infernal Revenant" },
  { id: "3", name: "Sacrifice - Heretic Jester" },
];

// Each roll, the boss that came up keeps 65% of its chance and the other 35% is
// shared evenly by the rest, so a boss gets rarer the more often it appears.
export const ROLLED_BOSS_KEEPS = 0.65;

export type BossChances = Record<string, number>;

export function initialBossChances(pool: Boss[] = BOSS_POOL): BossChances {
  return Object.fromEntries(pool.map((b) => [b.id, 1 / pool.length]));
}

export function pickBoss(
  pool: Boss[],
  chances: BossChances,
  rng: () => number = Math.random,
): Boss {
  let roll = rng() * pool.reduce((sum, b) => sum + (chances[b.id] ?? 0), 0);
  for (const boss of pool) {
    roll -= chances[boss.id] ?? 0;
    if (roll < 0) return boss;
  }
  return pool[pool.length - 1];
}

export function chancesAfterRoll(
  pool: Boss[],
  chances: BossChances,
  rolledId: string,
): BossChances {
  const given = (chances[rolledId] ?? 0) * (1 - ROLLED_BOSS_KEEPS);
  const share = given / (pool.length - 1);
  return Object.fromEntries(
    pool.map((b) => [
      b.id,
      b.id === rolledId
        ? (chances[b.id] ?? 0) - given
        : (chances[b.id] ?? 0) + share,
    ]),
  );
}