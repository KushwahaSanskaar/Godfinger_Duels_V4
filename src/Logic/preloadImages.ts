import { AGENTS } from "../Data/agents";
import { BOSS_POOL } from "../Data/bosses";
import { INVITE_ART, agentArtUrl, agentFullArtUrl } from "./agentArt";

const started = new Set<string>();
const kept: HTMLImageElement[] = [];

function load(src: string) {
  if (started.has(src)) return;
  started.add(src);
  const img = new Image();
  img.src = src;
  img.decode?.().catch(() => {});
  kept.push(img);
}

export function preloadGameImages() {
  for (const a of AGENTS) {
    load(agentArtUrl(a));
    load(agentFullArtUrl(a));
    if (a.art && a.art !== a.id) load(`/agents/agents_full/${a.id}_full.webp`);
  }
  load(`/agents/${INVITE_ART}.webp`); // shared by every Invitation
  for (const b of BOSS_POOL) load(`/bosses/${b.id}.webp`);
}