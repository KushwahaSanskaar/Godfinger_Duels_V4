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
  | "mirror-match"
  | "armory-swap"
  | "deja-vu";

export const SECRET_HINTS = [
  "SOMETHING UNUSUAL MIGHT HAPPEN...",
  "SOMETHING FEELS OFF...",
  "SOMETHING ISN'T RIGHT...",
  "NOT EVERYTHING IS AS IT SEEMS...",
  "SOMETHING IS ABOUT TO CHANGE...",
  "THIS ROUND MIGHT NOT GO TO PLAN...",
];

export const UNIVERSAL_MODIFIERS: ModifierDef[] = [
  {
    id: "tunnel-vision",
    title: "Tunnel Vision",
    desc: "Each player's squad is forced to include 1 random Agent from their current roster.",
    ready: true,
  },
  {
    id: "puppeteer",
    title: "Puppeteer",
    desc: "Each player selects 2 Agents for their own squad, and the 3rd is selected by their opponent.",
    ready: true,
  },
  {
    id: "mirror-match",
    title: "Mirror Match",
    flair: "???",
    secret: true,
    desc: "Disregard locked-in squads. Both players are assigned identical, randomly generated squads.",
    ready: true,
  },
  {
    id: "armory-swap",
    title: "Armory Swap",
    flair: "???",
    secret: true,
    desc: "Swap squads with your opponent.",
    ready: true,
  },
  {
    id: "deja-vu",
    title: "Deja Vu",
    flair: "???",
    secret: true,
    minEliminated: 3,
    desc: "Disregard locked-in squads. Both players must assemble a new squad using the opponent's eliminated Agents.",
    ready: true,
  },
];
