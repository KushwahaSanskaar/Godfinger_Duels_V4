// Not wired into any logic yet — this is just the data, waiting on the
// round-schedule system to be built. "polarity" records the [+]/[-] from
// your list — negatives apply to whoever WON the round they trigger on.

export interface AffixDef {
  id: string;
  title: string;
  desc: string;
  polarity: "positive" | "negative";
}

export const AFFIXES: AffixDef[] = [
  { id: "horizontal-investment", title: "Horizontal Investment", polarity: "negative",
    desc: "Agents can only be re-played once all Agents in your roster have already been played." },
  { id: "hold-on-wait-for-me", title: "Hold on, Wait for me!", polarity: "negative",
    desc: "Add 10 seconds to your total time." },
  { id: "overworked", title: "Overworked", polarity: "negative",
    desc: "For the next 2 rounds, randomly have 1 Agent be fatigued in your total agent pool." },
  { id: "mind-control", title: "Mind Control", polarity: "negative",
    desc: "After the currently winning player locks in Agents 1 and 2, the losing player chooses their opponent's 3rd Agent." },
  { id: "kamikaze", title: "Kamikaze", polarity: "negative",
    desc: "If you won your last battle, you're forced to also eliminate 2 of the 3 Agents you used last round. If you lost your last battle, this modifier has no effect." },
  { id: "overtime-contract", title: "Overtime Contract", polarity: "positive",
    desc: "You can re-use one Agent from your previous fight for your upcoming battle. This Agent is now immune to fatigue and can be used every round." },
  { id: "emergency-reinforcements", title: "Emergency Reinforcements", polarity: "positive",
    desc: "Choose 1 eliminated Agent from your own roster and return them to your available pool, usable immediately. On your next loss, lose 3 Agents instead of 2." },
  { id: "soul-stone-affix", title: "Soul Stone", polarity: "positive",
    desc: "Discard one Agent of your choice and replace them with a Soul Stone. It can morph into any Agent and has unlimited uses, but must be eliminated if you lose the round." },
  { id: "soul-stone-plus-affix", title: "Soul Stone+", polarity: "positive",
    desc: "Discard one Agent of your choice and replace them with a Soul Stone. It can morph into any Agent, including banned Agents, and must be eliminated if you lose the round." },
  { id: "spell-of-necromancy", title: "Spell of Necromancy", polarity: "positive",
    desc: "Sacrifice 2 of your current remaining Agents in exchange for 2 eliminated Agents — anyone's, not just your own. Revived Agents cannot both be used in the next battle unless you're forced to." },
];
