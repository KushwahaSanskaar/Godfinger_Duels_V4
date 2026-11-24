import type { DraftQueueItem, PlayerId } from "../types";

export function nextUpSlot(
  draftQueue: DraftQueueItem[],
  draftPointer: number,
  rosterSizes: Record<PlayerId, number>,
): { player: PlayerId; index: number } | null {
  const next = draftQueue
    .slice(draftPointer + 1)
    .find((item) => item.type === "pick" && item.player);
  if (!next?.player) return null;
  const current = draftQueue[draftPointer];
  const pickingNow =
    current?.type === "pick" && current.player === next.player ? 1 : 0;
  return { player: next.player, index: rosterSizes[next.player] + pickingNow };
}