import { useEffect, useState } from "react";
import type { Agent, DraftQueueItem, GameEvent, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { AgentPool } from "../Components/AgentPool";
import { EventOverlay } from "../Components/EventOverlay";
import { HeaderStatusPortal } from "../Components/HeaderStatusPortal";
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
  const pickPlayer = draftItem?.type === "pick" ? draftItem.player : undefined;
  const isPickTurn = !activeEvent && !inExtraBans && !!pickPlayer;

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

  // "+" invitations let a banned agent of the right specialty be picked, so
  // suppress the ban-X overlay entirely for that one turn.
  const currentRestriction = pickPlayer ? pickRestriction[pickPlayer] : null;
  const effectiveBanned = currentRestriction?.includeBanned ? [] : banned;

  return (
    <div className="space-y-4">
      {gatekeeperActive && (
        <div className="w-full border-2 border-p2 bg-[#30151D] px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="font-pixel text-xl text-p2">
              ⚠
            </span>

            <span className="font-pixel text-lg text-white tracking-wider">
              GATEKEEPER ACTIVE
            </span>

            <span className="font-pixel text-xl text-p2">
              ⚠
            </span>
          </div>

          <p className="mt-2 font-mono font-bold text-md text-[#FF9099]">
            NO SHARED PICKS FOR THE REST OF THIS DRAFT
          </p>
        </div>
      )}


      {activeEvent ? (
        <EventOverlay event={activeEvent} onAcknowledge={onResolveEvent} />
      ) : inExtraBans && extraBans ? (
        <Card className="space-y-3">
          <HeaderStatusPortal>
            <div className="flex flex-col gap-1 text-white">
              <span className="font-pixel text-[10px]">
                EXTRA BAN ({extraBans.length} REMAINING) — ANY AGENT
              </span>
              <span className="font-semibold text-sm">
                {displayName(extraBans[0].player)}'s ban
              </span>
            </div>
            <span className={`font-pixel text-2xl ${timeLeft <= 10 ? "text-yellow-300" : "text-white"}`}>
              0:{timeLeft.toString().padStart(2, "0")}
            </span>
          </HeaderStatusPortal>
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
                ? extraBans[0].player === "p2" ? "selected-p2" : "selected-p1"
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
      ) : pickPlayer ? (
        <Card className="space-y-3">
          <HeaderStatusPortal>
            <div className="flex flex-col gap-1 text-white">
              <span className="font-pixel text-[10px]">
                PICKING — {rosters[pickPlayer].length + 1}/{picksPerPlayer}
              </span>
              <span className="font-semibold text-sm">
                {displayName(pickPlayer)}'s pick
              </span>
            </div>
            <span className={`font-pixel text-2xl ${timeLeft <= 10 ? "text-yellow-300" : "text-white"}`}>
              0:{timeLeft.toString().padStart(2, "0")}
            </span>
          </HeaderStatusPortal>
          {currentRestriction && (
            <p className="text-xs font-sand text-p2">
              {displayName(pickPlayer)} {restrictionLabel(currentRestriction)}
            </p>
          )}
          <AgentPool
            agents={pool}
            banned={effectiveBanned}
            showBanOverlay={false}
            unavailable={(a) => {
              const ownedByCurrentPlayer = rosters[pickPlayer].some(
                (agent) => agent.id === a.id
              );
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
                ) return true;
              }
              return false;
            }}
            selection={(a) => {
              if (a.id === selectedAgent?.id)
                return pickPlayer === "p2" ? "selected-p2" : "selected-p1";
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
