// Not wired into any logic yet — this is just the data, waiting on the
// round-schedule system (1 -> 2 -> MOD -> 3 -> AFFIX -> 4 -> 5 -> AFFIX ->
// 6 -> MOD -> 7 -> AFFIX+MOD -> 8 -> 9) to be built.

export interface UniversalModifierDef {
  id: string;
  title: string;
  desc: string;
}

export const UNIVERSAL_MODIFIERS: UniversalModifierDef[] = [
  { id: "tunnel-vision", title: "Tunnel Vision",
    desc: "Both players are forced to use a random Agent in their current roster for the upcoming battle." },
  { id: "puppeteer", title: "Puppeteer",
    desc: "For the upcoming battle, each player selects 2 Agents for themselves and chooses the 3rd Agent for their opponent." },
  { id: "crippled-veils", title: "Crippled Veils",
    desc: "Activating Ether Veil adds 5 seconds to your total time." },
  { id: "crippled-stunners", title: "Crippled Stunners",
    desc: "Stunning the enemy adds 5 seconds to your total time." },
  { id: "preset-teams", title: "Preset Teams",
    desc: "Disregard the teams that were picked — randomly roll a team for both players to use for this upcoming battle." },
  { id: "armory-swap", title: "Armory Swap",
    desc: "After confirming both teams, swap teams with your opponent for this combat." },
];
