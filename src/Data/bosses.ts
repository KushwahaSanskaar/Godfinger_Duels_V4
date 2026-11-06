export interface Boss {
  id: string;
  name: string;
}

export const BOSS_POOL: Boss[] = [
  { id: "1", name: "Haytor" },
  { id: "2", name: "Infernal Revenant" },
  { id: "3", name: "Sacrifice - Heretic Jester" },
];

// The boss that just appeared is less likely to come straight back: with 3 bosses that
// is 20% for it and 40% for each of the others (20 / 40 / 40). On the first roll nothing
// has appeared yet, so every boss is equally likely.
export const LAST_BOSS_WEIGHT = 20;
export const OTHER_BOSS_WEIGHT = 40;

export function pickBoss(
  pool: Boss[],
  lastBossId: string | null,
  rng: () => number = Math.random,
): Boss {
  const weights = pool.map((b) =>
    b.id === lastBossId ? LAST_BOSS_WEIGHT : OTHER_BOSS_WEIGHT,
  );
  let roll = rng() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i];
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
