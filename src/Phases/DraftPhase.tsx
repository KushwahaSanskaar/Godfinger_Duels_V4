import type { Agent, DraftQueueItem, GameEvent, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { Pill } from "../Components/Pill";
import { AgentPool } from "../Components/AgentPool";
import { useEffect, useState } from "react";
import { EventOverlay } from "../Components/EventOverlay";
import { TIMER_CONFIG } from "../Data/timers";

interface DraftPhaseProps {
  pool: Agent[];
  banned: string[];
  draftItem: DraftQueueItem | undefined;
  activeEvent: GameEvent | null;
  rosters: Record<PlayerId, Agent[]>;
  picksPerPlayer: number;
  sharedPool: boolean;
  displayName: (p: PlayerId | null) => string;
  onDraft: (agent: Agent) => void;
  onResolveEvent: () => void;
  onTimeout: () => void;
  selectedAgent: Agent | null;
  onAgentSelect: (agent: Agent | null) => void;
}

const PLAYER_IDS: PlayerId[] = ["p1", "p2"];

export function DraftPhase({
  pool,
  draftItem,
  activeEvent,
  rosters,
  banned,
  picksPerPlayer,
  sharedPool,
  displayName,
  onDraft,
  onResolveEvent,
  onTimeout,
  selectedAgent,
  onAgentSelect,
}: DraftPhaseProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIG.draftSeconds);
  const isPickTurn = !activeEvent && draftItem?.type === "pick";

  // Reset the clock whenever a new pick comes on the clock.
  useEffect(() => {
    setTimeLeft(TIMER_CONFIG.draftSeconds);
  }, [draftItem, activeEvent]);

  useEffect(() => {
    if (!isPickTurn) return; // no countdown while an event is being shown
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isPickTurn, onTimeout]);

  return (
    <div className="space-y-4">
      {activeEvent ? (
        <EventOverlay event={activeEvent} onAcknowledge={onResolveEvent} />
      ) : draftItem && draftItem.type === "pick" && draftItem.player ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">On the clock:</p>
            <div className="flex items-center gap-3">
              <Pill tone={draftItem.player}>{displayName(draftItem.player)}</Pill>
              <span className={`font-pixel text-sm ${timeLeft <= 10 ? "text-p2" : "text-text-muted"}`}>
                0:{timeLeft.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
          <AgentPool
            agents={pool}
            banned={banned}
            showBanOverlay={false}
            unavailable={(a) => {
              const ownedByCurrentPlayer = (draftItem.player
                ? rosters[draftItem.player as PlayerId]
                : []
              ).some((agent) => agent.id === a.id);
              if (sharedPool) return ownedByCurrentPlayer;
              return (
                rosters.p1.some((agent) => agent.id === a.id) ||
                rosters.p2.some((agent) => agent.id === a.id)
              );
            }}
            selection={(a) => {
              if (a.id === selectedAgent?.id)
                return draftItem.player === "p2"
                  ? "selected-p2"
                  : "selected-p1";
              const inP1 = rosters.p1.some((agent) => agent.id === a.id);
              const inP2 = rosters.p2.some((agent) => agent.id === a.id);
              if (inP1 && inP2) return "mirror";
              if (inP1) return "p1";
              if (inP2) return "p2";
              return "none";
            }}
            onClick={onAgentSelect}
            onConfirm={(a) => {
              onDraft(a);
              onAgentSelect(null);
            }}
            confirmLabel="PICK"
            confirmColor="#3A8EF6"
          />
        </Card>
      ) : null}
    </div>
  );
}
