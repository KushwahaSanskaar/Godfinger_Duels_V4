// Affixes: after a round, the player who is LOSING chooses between one positive
// affix for themselves or one negative affix for the player who is LEADING.
// `ready` marks the ones whose rules are implemented; the roll only uses those.

export type AffixId =
  | "horizontal-investment"
  | "hold-on-wait-for-me"
  | "overworked"
  | "mind-control"
  | "kamikaze"
  | "overtime-contract"
  | "emergency-reinforcements"
  | "soul-stone-affix"
  | "soul-stone-plus-affix"
  | "spell-of-necromancy"
  | "frozen-assets"
  | "veto-card";

// Who reads the text. `viewer` is the player looking at it, or null for a shared
// screen, where both players are named.
export interface AffixParties {
  leader: string;
  trailer: string;
  viewer: "leader" | "trailer" | null;
}

export interface AffixDef {
  id: AffixId;
  title: string;
  desc: string | ((p: AffixParties) => string);
  polarity: "positive" | "negative";
  ready: boolean;
}

// Word forms for one side of a negative affix: "You" / "Mindhooked", "your" / "Mindhooked's"
function side(name: string, isViewer: boolean) {
  return {
    you: isViewer,
    Name: isViewer ? "You" : name,
    poss: isViewer ? "your" : `${name}’s`,
    their: isViewer ? "your" : "their",
  };
}

export function describeAffix(def: AffixDef, parties: AffixParties): string {
  return typeof def.desc === "string" ? def.desc : def.desc(parties);
}

const leaderOf = (p: AffixParties) => side(p.leader, p.viewer === "leader");
const trailerOf = (p: AffixParties) => side(p.trailer, p.viewer === "trailer");

export const AFFIXES: AffixDef[] = [
  {
    id: "horizontal-investment",
    title: "Horizontal Investment",
    polarity: "negative",
    ready: true,
    desc: (p) => {
      const l = leaderOf(p);
      return `${l.Name} cannot re-deploy an Agent until every Agent in ${l.their} roster has been played once.`;
    },
  },
  {
    id: "hold-on-wait-for-me",
    title: "Lag Spike",
    polarity: "negative",
    ready: true,
    desc: (p) => `Add 10 seconds to ${leaderOf(p).poss} total time.`,
  },
  {
    id: "overworked",
    title: "Overworked",
    polarity: "negative",
    ready: true,
    desc: (p) =>
      `For the next 2 rounds, 1 random Agent in ${leaderOf(p).poss} roster becomes Fatigued.`,
  },
  {
    id: "mind-control",
    title: "Mind Control",
    polarity: "negative",
    ready: true,
    desc: (p) => {
      const l = leaderOf(p);
      const t = trailerOf(p);
      return `${l.Name} ${l.you ? "lock" : "locks"} in Agents 1 and 2 normally. ${t.Name} ${t.you ? "select" : "selects"} ${l.their} 3rd Agent.`;
    },
  },
  {
    id: "kamikaze",
    title: "Kamikaze",
    polarity: "negative",
    ready: true,
    desc: (p) =>
      `${leaderOf(p).Name} must eliminate 2 of the 3 Agents used in the previous battle.`,
  },
  {
    id: "overtime-contract",
    title: "Overtime Contract",
    polarity: "positive",
    ready: true,
    desc: "Re-deploy 1 Agent from your previous squad. They gain Overtime and become immune to fatigue.",
  },
  {
    id: "emergency-reinforcements",
    title: "Emergency Reinforcements",
    polarity: "positive",
    ready: true,
    desc: "Restore 1 eliminated Agent to your roster. Your next loss eliminates 3 Agents instead of 2.",
  },
  {
    id: "soul-stone-affix",
    title: "Soul Stone",
    polarity: "positive",
    ready: true,
    desc: "Replace 1 Agent in your roster with a Soul Stone. It morphs into any unbanned Agent and has unlimited uses, but is eliminated on loss.",
  },
  {
    id: "soul-stone-plus-affix",
    title: "Soul Stone+",
    polarity: "positive",
    ready: true,
    desc: "Replace 1 Agent in your roster with a Soul Stone+. It morphs into any Agent (including banned Agents) and has unlimited uses, but is eliminated on loss.",
  },
  {
    id: "spell-of-necromancy",
    title: "Spell of Necromancy",
    polarity: "positive",
    ready: true,
    desc: "Sacrifice 2 Agents in your roster to revive 2 eliminated Agents from either player’s graveyard. Revived Agents cannot both be placed in the next squad.",
  },
  {
    id: "frozen-assets",
    title: "Frozen Assets",
    polarity: "negative",
    ready: true,
    desc: (p) => {
      const t = trailerOf(p);
      const l = leaderOf(p);
      return `${t.you ? "Choose" : `${t.Name} chooses`} 2 Agents in ${l.poss} roster. They cannot be selected for a squad in the next 2 rounds.`;
    },
  },
  {
    id: "veto-card",
    title: "Veto Card",
    polarity: "positive",
    ready: true,
    desc: "Grants the ability to negate the 2-Agent elimination penalty.",
  },
];