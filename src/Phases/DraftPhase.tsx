import { useTurnTimer } from "../Hooks/useTurnTimer";
import type { Agent, DraftQueueItem, GameEvent, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { AgentPool } from "../Components/AgentPool";
import { EventOverlay } from "../Components/EventOverlay";
import { HudStatusPortal } from "../Components/HudStatusPortal";
import { Timer } from "../Components/Timer";
import { Notice } from "../Components/Notice";
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
  turnKey: string;
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

function restrictionTitle(restriction: PickRestriction): string {
  return restriction.kind === "a-rank" ? "A-RANK ONLY" : "SPECIALTY LOCK";
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
  turnKey,
  displayName,
  onDraft,
  onResolveEvent,
  onTimeout,
  onResolveExtraBan,
  onExtraBanTimeout,
  selectedAgent,
  onAgentSelect,
}: DraftPhaseProps) {
  const inExtraBans = !!extraBans && extraBans.length > 0;
  const pickPlayer = draftItem?.type === "pick" ? draftItem.player : undefined;
  const isPickTurn = !activeEvent && !inExtraBans && !!pickPlayer;

  // The clock restarts whenever turnKey changes (next pick, next extra ban, or an
  // event card opening/closing) and only runs on a pick or extra-ban turn.
  const timeLeft = useTurnTimer(
    TIMER_CONFIG.draftSeconds,
    turnKey,
    isPickTurn || inExtraBans,
    inExtraBans ? onExtraBanTimeout : onTimeout,
  );

  // "+" invitations let a banned agent of the right specialty be picked, so
  // suppress the ban-X overlay entirely for that one turn.
  const currentRestriction = pickPlayer ? pickRestriction[pickPlayer] : null;
  const effectiveBanned = currentRestriction?.includeBanned ? [] : banned;
  const restrictedPlayer =
    !activeEvent && !inExtraBans && currentRestriction ? pickPlayer : undefined;

  return (
    <div className="space-y-4">
      {(gatekeeperActive || restrictedPlayer) && (
        <div className="flex gap-4">
          {gatekeeperActive && (
            <Notice
              className="border-p2 bg-[#30151D] text-danger-soft"
              title="GATEKEEPER ACTIVE"
            >
              NO SHARED PICKS FOR THE REST OF THIS DRAFT
            </Notice>
          )}
          {restrictedPlayer && currentRestriction && (
            <Notice
              className="border-event bg-[#2B2410] text-event-light"
              title={restrictionTitle(currentRestriction)}
            >
              <span className={restrictedPlayer === "p1" ? "text-p1" : "text-p2"}>
                {displayName(restrictedPlayer).toUpperCase()}
              </span>{" "}
              {restrictionLabel(currentRestriction).toUpperCase()}
            </Notice>
          )}
        </div>
      )}

      {activeEvent ? (
        <EventOverlay event={activeEvent} onAcknowledge={onResolveEvent} />
      ) : inExtraBans && extraBans ? (
        <Card className="space-y-3">
          <HudStatusPortal>
            <Timer
              timeLeft={timeLeft}
              total={TIMER_CONFIG.draftSeconds}
              turnKey={turnKey}
            />
          </HudStatusPortal>
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
          />
        </Card>
      ) : pickPlayer ? (
        <Card className="space-y-3">
          <HudStatusPortal>
            <Timer
              timeLeft={timeLeft}
              total={TIMER_CONFIG.draftSeconds}
              turnKey={turnKey}
            />
          </HudStatusPortal>
          <AgentPool
            agents={pool}
            banned={effectiveBanned}
            showBanOverlay={true}
            unavailable={(a) => {
              const ownedByCurrentPlayer = rosters[pickPlayer].some(
                (agent) => agent.id === a.id,
              );
              const baseUnavailable = sharedPool
                ? ownedByCurrentPlayer
                : rosters.p1.some((agent) => agent.id === a.id) ||
                  rosters.p2.some((agent) => agent.id === a.id);
              if (baseUnavailable) return true;
              if (currentRestriction) {
                if (currentRestriction.kind === "a-rank" && a.s_rank)
                  return true;
                if (
                  currentRestriction.kind === "specialty" &&
                  !currentRestriction.specialties?.includes(a.specialty)
                )
                  return true;
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
          />
        </Card>
      ) : null}
    </div>
  );
}