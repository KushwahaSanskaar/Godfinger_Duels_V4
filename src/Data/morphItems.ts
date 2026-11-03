// "Morph items": roster entries that are not real agents but turn into one when they
// are put in a squad. Choosing one in Squad Select opens a popup with the agents it
// may become.
//
//   Soul Stone            any UNBANNED agent not already on your roster
//   Soul Stone+           any agent - bans and rosters are ignored
//   <Class> Invitation    any UNBANNED <class> agent not already on your roster
//   <Class> Invitation+   any <class> agent - bans and rosters are ignored
//
// To add another item, call add() once below. An item's id doubles as its roster id.

import type { Agent } from "../types";

export interface MorphItem {
  agent: Agent; // what sits in the roster
  specialties: string[] | null; // agents it may become; null = any specialty
  plus: boolean; // true = ignores bans and rosters
  soulStone: boolean; // must be eliminated first when its round is lost
  note: string; // one line shown in the popup
}

function wildcard(id: string, name: string, tag: string): Agent {
  return {
    id,
    name,
    s_rank: true,
    attribute: "None",
    specialty: "Wildcard",
    atkType: "None",
    faction: "N/A",
    rarity: "Unique",
    price: 0,
    art: "soul-stone", // all of these share the Soul Stone artwork
    tag,
  };
}

export const SOUL_STONE_AGENT: Agent = wildcard("soul-stone", "Soul Stone", "SOUL");
export const SOUL_STONE_PLUS_AGENT: Agent = wildcard("soul-stone-plus", "Soul Stone+", "SOUL+");

// The five invitation classes. Support also covers Defense, like everywhere else.
const INVITATION_CLASSES = [
  { key: "attack", label: "Attack", tag: "ATK", specialties: ["Attack"] },
  { key: "anomaly", label: "Anomaly", tag: "ANO", specialties: ["Anomaly"] },
  { key: "rupture", label: "Rupture", tag: "RUP", specialties: ["Rupture"] },
  { key: "support", label: "Support", tag: "SUP", specialties: ["Support", "Defense"] },
  { key: "stun", label: "Stun", tag: "STN", specialties: ["Stun"] },
];

export const MORPH_ITEMS: Record<string, MorphItem> = {};
const MORPH_IDS = new Set<string>();

function add(item: MorphItem) {
  MORPH_ITEMS[item.agent.id] = item;
  MORPH_IDS.add(item.agent.id);
}

add({
  agent: SOUL_STONE_AGENT,
  specialties: null,
  plus: false,
  soulStone: true,
  note: "Choose any unbanned Agent that is not already on your roster.",
});
add({
  agent: SOUL_STONE_PLUS_AGENT,
  specialties: null,
  plus: true,
  soulStone: true,
  note: "Choose any Agent - bans and rosters are ignored.",
});
INVITATION_CLASSES.forEach((c) => {
  add({
    agent: wildcard(`${c.key}-invitation`, `${c.label} Invitation`, `${c.tag} INV`),
    specialties: c.specialties,
    plus: false,
    soulStone: false,
    note: `Choose any unbanned ${c.label} Agent that is not already on your roster.`,
  });
  add({
    agent: wildcard(`${c.key}-invitation-plus`, `${c.label} Invitation+`, `${c.tag} INV+`),
    specialties: c.specialties,
    plus: true,
    soulStone: false,
    note: `Choose any ${c.label} Agent - bans and rosters are ignored.`,
  });
});

export const isMorphItem = (id: string): boolean => MORPH_IDS.has(id);
export const isSoulStone = (id: string): boolean => MORPH_ITEMS[id]?.soulStone === true;

export interface MorphOptionsContext {
  pool: Agent[]; // every real agent
  banned: string[];
  ownedIds: string[]; // the player's own roster
  takenIds: string[]; // already in this squad, or already chosen as another item's form
}

// The agents `item` may turn into right now. If the strict rule leaves nothing (every
// matching agent is banned or owned), it relaxes step by step instead of leaving
// the player stuck with an item they can't use.
export function morphOptions(item: MorphItem, ctx: MorphOptionsContext): Agent[] {
  const matching = ctx.pool.filter(
    (a) => !item.specialties || item.specialties.includes(a.specialty),
  );
  const unbanned = matching.filter((a) => !ctx.banned.includes(a.id));
  const steps: Agent[][] = item.plus
    ? [matching, ctx.pool]
    : [unbanned.filter((a) => !ctx.ownedIds.includes(a.id)), unbanned, matching, ctx.pool];
  for (const step of steps) {
    const free = step.filter((a) => !ctx.takenIds.includes(a.id));
    if (free.length > 0) return free;
  }
  return [];
}

// What a squad slot should show: the agent the item turned into, if one was chosen.
export function displayForm(
  agent: Agent,
  choices: Record<string, string> | undefined,
  pool: Agent[],
): { agent: Agent; via: string | null } {
  const formId = isMorphItem(agent.id) ? choices?.[agent.id] : undefined;
  const form = formId ? pool.find((a) => a.id === formId) : undefined;
  return form ? { agent: form, via: agent.name } : { agent, via: null };
}
