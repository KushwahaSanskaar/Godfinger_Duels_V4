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
  desc: string;
  ready: boolean;
}

export type ModifierId =
  | "tunnel-vision"
  | "puppeteer"
  | "preset-teams"
  | "armory-swap";

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
    desc: "Ironically the true mirror match, disregard the teams that are picked and randomly roll a team for both players to use for this upcoming battle.",
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
];
