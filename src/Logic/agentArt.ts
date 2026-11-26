import type { Agent } from "../types";

// Every "Invitation" item shares one picture: public/agents/invite.webp.
// It has no separate full-size version, so the same file is used for both sizes.
export const INVITE_ART = "invite";

export function agentArtUrl(agent: Pick<Agent, "id" | "art">): string {
  return `/agents/${agent.art ?? agent.id}.webp`;
}

export function agentFullArtUrl(agent: Pick<Agent, "id" | "art">): string {
  const key = agent.art ?? agent.id;
  return key === INVITE_ART
    ? `/agents/${INVITE_ART}.webp`
    : `/agents/agents_full/${key}_full.webp`;
}
