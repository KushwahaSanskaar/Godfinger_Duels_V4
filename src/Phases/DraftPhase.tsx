import { useEffect, useState } from "react";
import type { Agent, DraftQueueItem, GameEvent, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { Pill } from "../Components/Pill";
import { AgentPool } from "../Components/AgentPool";
import { EventOverlay } from "../Components/EventOverlay";
import { TIMER_CONFIG } from "../Data/timers";
import { groupForSpecialty } from "../Data/modes";
import type { ExtraBanTurn, PickRestriction } from "../Data/Events/draftEvents";

interface DraftPhaseProps {
  pool: Agent[];
  banned: string[];
  draftItem: DraftQueueItem | undefined;
  activeEvent: GameEvent | null;
  rosters: Record<PlayerId, Agent[]>;
  picksPerPlayer: number;
  sharedPool: boolean;
  pickRestriction: Record<PlayerId, PickRestriction | null>;
  extraBans: ExtraBanTurn[] | null;
  waveLockedCategories: string[];
  gatekeeperActive: boolean;
  displayName: (p: PlayerId | null) => string;
  onDraft: (agent: Agent) => void;
  onResolveEvent: () => void;
  onTimeout: () => void;
  onResolveExtraBan: (agent: Agent) => void;
  onExtraBanTimeout: () => void;
  selectedAgent: Agent | null;
  onAgentSelect: (agent: Agent | null) => void;
}

function restrictionLabel(restriction: PickRestriction): string {
  if (restriction.kind === "a-rank") return "must pick an A-Rank Agent";
  const specs = restriction.specialties?.join("/") ?? "";
  return `must pick a ${specs} Agent${restriction.includeBanned ? " (banned agents allowed)" : ""}`;
}

export function DraftPhase({
  pool,
  draftItem,
  activeEvent,
  rosters,
  banned,
  picksPerPlayer,
  sharedPool,
  pickRestriction,
  extraBans,
  waveLockedCategories,
  gatekeeperActive,
  displayName,
  onDraft,
  onResolveEvent,
  onTimeout,
  onResolveExtraBan,
  onExtraBanTimeout,
  selectedAgent,
  onAgentSelect,
}: DraftPhaseProps) {
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIG.draftSeconds);
  const inExtraBans = !!extraBans && extraBans.length > 0;
  const isPickTurn = !activeEvent && !inExtraBans && draftItem?.type === "pick";

  useEffect(() => {
    setTimeLeft(TIMER_CONFIG.draftSeconds);
  }, [draftItem, activeEvent, extraBans?.length]);

  useEffect(() => {
    if (!isPickTurn && !inExtraBans) return;
    if (timeLeft <= 0) {
      if (inExtraBans) onExtraBanTimeout();
      else onTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, isPickTurn, inExtraBans, onTimeout, onExtraBanTimeout]);

  const currentRestriction = draftItem?.player ? pickRestriction[draftItem.player] : null;
  // "+" invitations let a banned agent of the right specialty be picked, so
  // suppress the ban-X overlay entirely for that one turn.
  const effectiveBanned = currentRestriction?.includeBanned ? [] : banned;

  return (
    <div className="space-y-4">
      {gatekeeperActive && (
        <p className="text-[10px] font-pixel text-p2 tracking-widest text-center">
          GATEKEEPER ACTIVE — no shared picks for the rest of this draft
        </p>
      )}

      {activeEvent ? (
        <EventOverlay event={activeEvent} onAcknowledge={onResolveEvent} />
      ) : inExtraBans && extraBans ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              Extra ban ({extraBans.length} remaining){" "}
              {extraBans[0].enforceCategoryLock ? "— 1 per category, this wave only" : "— any Agent"}
            </p>
            <div className="flex items-center gap-3">
              <Pill tone={extraBans[0].player}>{displayName(extraBans[0].player)}'s ban</Pill>
              <span className={`font-pixel text-sm ${timeLeft <= 10 ? "text-p2" : "text-text-muted"}`}>
                0:{timeLeft.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
          <AgentPool
            agents={pool}
            banned={banned}
            showBanOverlay={true}
            unavailable={(a) =>
              extraBans[0].enforceCategoryLock &&
              waveLockedCategories.includes(groupForSpecialty(a.specialty))
            }
            selection={(a) =>
              a.id === selectedAgent?.id
                ? extraBans[0].player === "p2"
                  ? "selected-p2"
                  : "selected-p1"
                : "none"
            }
            onClick={onAgentSelect}
            onConfirm={(a) => {
              onResolveExtraBan(a);
              onAgentSelect(null);
            }}
            confirmLabel="BAN"
            confirmColor="#E63946"
          />
        </Card>
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
          {currentRestriction && (
            <p className="text-xs font-sand text-p2">
              {displayName(draftItem.player)} {restrictionLabel(currentRestriction)}
            </p>
          )}
          <AgentPool
            agents={pool}
            banned={effectiveBanned}
            showBanOverlay={false}
            unavailable={(a) => {
              const ownedByCurrentPlayer = (draftItem.player
                ? rosters[draftItem.player as PlayerId]
                : []
              ).some((agent) => agent.id === a.id);
              const baseUnavailable = sharedPool
                ? ownedByCurrentPlayer
                : rosters.p1.some((agent) => agent.id === a.id) ||
                  rosters.p2.some((agent) => agent.id === a.id);
              if (baseUnavailable) return true;
              if (currentRestriction) {
                if (currentRestriction.kind === "a-rank" && a.s_rank) return true;
                if (
                  currentRestriction.kind === "specialty" &&
                  !currentRestriction.specialties?.includes(a.specialty)
                ) {
                  return true;
                }
              }
              return false;
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
