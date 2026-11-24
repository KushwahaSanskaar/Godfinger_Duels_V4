import { AGENTS } from "../Data/agents";
import { BOSS_POOL } from "../Data/bosses";

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
    const key = a.art ?? a.id;
    load(`/agents/${key}.webp`);
    load(`/agents/agents_full/${key}_full.webp`);
    if (key !== a.id) load(`/agents/agents_full/${a.id}_full.webp`);
  }
  for (const b of BOSS_POOL) load(`/bosses/${b.id}.webp`);
}