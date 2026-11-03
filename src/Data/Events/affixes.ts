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
  | "spell-of-necromancy";

export interface AffixDef {
  id: AffixId;
  title: string;
  desc: string;
  polarity: "positive" | "negative";
  ready: boolean;
}

export const AFFIXES: AffixDef[] = [
  { id: "horizontal-investment", title: "Horizontal Investment", polarity: "negative", ready: true,
    desc: "Agents can only be re-played once all Agents in your roster have already been played." },
  { id: "hold-on-wait-for-me", title: "Hold on, Wait for me!", polarity: "negative", ready: true,
    desc: "Add 10sec to your total time." },
  { id: "overworked", title: "Overworked", polarity: "negative", ready: true,
    desc: "For the next 2 rounds, randomly have 1 Agent be fatigued in your total agent pool." },
  { id: "mind-control", title: "Mind Control", polarity: "negative", ready: true,
    desc: "After the currently winning player locks in Agents 1 and 2, the losing player chooses their opponent’s 3rd Agent." },
  { id: "kamikaze", title: "Kamikaze", polarity: "negative", ready: true,
    desc: "For one round, you’re forced to also eliminate 2 of the 3 Agents that you used last round." },
  { id: "overtime-contract", title: "Overtime Contract", polarity: "positive", ready: true,
    desc: "You can re-use one Agent in your previous fight for your upcoming battle. This Agent is now working overtime, which means they are now immune to fatigue and can be used every round." },
  { id: "emergency-reinforcements", title: "Emergency Reinforcements", polarity: "positive", ready: true,
    desc: "Choose 1 eliminated Agent from your own roster and return them to your available pool of Agents. They can be used immediately. On your next loss, lose 3 Agents." },
  { id: "soul-stone-affix", title: "Soul Stone", polarity: "positive", ready: true,
    desc: "Discards one Agent of your choice and replaces them with a SOUL STONE. Soul Stones morph into any unbanned Agent (not already on your roster), and have unlimited uses, but the Soul Stone must be eliminated if you lose the round." },
  { id: "soul-stone-plus-affix", title: "Soul Stone+", polarity: "positive", ready: true,
    desc: "Discards one Agent of your choice and replaces them with a SOUL STONE. Soul Stone+ morphs into any Agent, including banned Agents and Agents already on your roster, and has unlimited uses, but it must be eliminated if you lose the round." },
  { id: "spell-of-necromancy", title: "Spell of Necromancy", polarity: "positive", ready: true,
    desc: "Sacrifice 2 of your current remaining Agents in exchange for 2 eliminated Agents. Not just YOUR eliminated Agents, everyone’s eliminated Agents. Revived Agents cannot both be used in the next upcoming battle, unless you’re forced to." },
];
