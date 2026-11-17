// Universal modifiers apply to ONE upcoming battle, for both players.
// `ready` marks the ones whose rules are implemented; the roll only uses those.

export interface ModifierDef {
  id: string;
  title: string;
  flair?: string; // pure mystery text shown next to the name ("(???)")
  // Secret modifiers are announced as just "???" (no name, no description). They stay
  // hidden through the boss roll and squad select and are revealed right before the
  // round starts.
  secret?: boolean;
  // Only rolls once at least this many different Agents have been eliminated in total.
  minEliminated?: number;
  desc: string;
  ready: boolean;
}

export type ModifierId =
  | "tunnel-vision"
  | "puppeteer"
  | "preset-teams"
  | "armory-swap"
  | "deja-vu";

export const UNIVERSAL_MODIFIERS: ModifierDef[] = [
  {
    id: "tunnel-vision",
    title: "Tunnel Vision",
    desc: "Both players are forced to use a random Agent in their current roster for the upcoming battle.",
    ready: true,
  },
  {
    id: "puppeteer",
    title: "Puppeteer",
    desc: "For the upcoming battle, each player will select 2 Agents for themselves and choose the 3rd Agent for their opponent.",
    ready: true,
  },
  {
    id: "preset-teams",
    title: "Preset Teams",
    flair: "???",
    secret: true,
    desc: "Ironically the true mirror match. Pick your squad as usual, then a random team is rolled for both players to use for this upcoming battle. If you lose, the Agents you picked are the ones on the line.",
    ready: true,
  },
  {
    id: "armory-swap",
    title: "Armory Swap",
    flair: "???",
    secret: true,
    desc: "After confirming both teams, swap teams with your opponent for this combat.",
    ready: true,
  },
  {
    id: "deja-vu",
    title: "Deja Vu",
    flair: "???",
    secret: true,
    minEliminated: 3,
    desc: "Disregard the teams that were picked. A random team is rolled from the Agents that have been eliminated so far, and both players use it for this upcoming battle. The Agents you picked are still the ones on the line.",
    ready: true,
  },
];
