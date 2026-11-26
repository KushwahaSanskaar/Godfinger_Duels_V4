import type { Agent, PlayerId } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { HudStatusPortal } from "../Components/HudStatusPortal";
import { Panel } from "../Components/Panel";
import { Timer } from "../Components/Timer";
import { useTurnTimer } from "../Hooks/useTurnTimer";
import { TIMER_CONFIG } from "../Data/timers";
import { DEJA_VU_TEAM_SIZE } from "../Logic/interludeRules";

const PLAYERS: PlayerId[] = ["p1", "p2"];

interface DejaVuScreenProps {
  round: number;
  picks: Record<PlayerId, string[]>;
  locked: Record<PlayerId, boolean>;
  candidatesFor: (p: PlayerId) => Agent[];
  displayName: (p: PlayerId | null) => string;
  onToggle: (p: PlayerId, agentId: string) => void;
  onConfirm: (p: PlayerId) => void;
  onTimeout: (p: PlayerId) => void;
}

// Deja Vu: the locked-in squads are set aside. Each player builds a NEW team of 3
// from the agents that were eliminated from their OPPONENT's roster.
export function DejaVuScreen({
  round,
  picks,
  locked,
  candidatesFor,
  displayName,
  onToggle,
  onConfirm,
  onTimeout,
}: DejaVuScreenProps) {
  const waiting = PLAYERS.filter((p) => !locked[p]);
  const timeLeft = useTurnTimer(
    TIMER_CONFIG.squadSeconds,
    `dejavu-${round}`,
    waiting.length > 0,
    () => waiting.forEach(onTimeout),
  );

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      <HudStatusPortal>
        <Timer
          timeLeft={timeLeft}
          total={TIMER_CONFIG.squadSeconds}
          turnKey={`dejavu-${round}`}
        />
      </HudStatusPortal>

      <div className="flex flex-col gap-2 border-2 border-event bg-ink px-6 py-4">
        <span className="text-trim font-pixel font-bold tracking-widest text-event text-[clamp(14px,1.2vw,30px)]">
          ◆ DEJA VU
        </span>
        <span className="text-text-primary text-[clamp(14px,1.05vw,26px)]">
          Your locked-in squad is set aside. Build a new team of {DEJA_VU_TEAM_SIZE}{" "}
          from the Agents eliminated from your opponent&rsquo;s roster. A loss
          still costs agents from the squad you locked in first.
        </span>
      </div>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {PLAYERS.map((p) => {
          const isP1 = p === "p1";
          const opponent = isP1 ? "p2" : "p1";
          const chosen = picks[p];
          const ready = chosen.length === DEJA_VU_TEAM_SIZE;
          const accent = isP1 ? "text-p1" : "text-p2";
          return (
            <Panel key={p} className="flex min-w-0 flex-col gap-4 p-5">
              <div
                className={`flex items-center justify-between gap-3 px-5 py-3 ${
                  isP1
                    ? "border-l-[6px] border-l-p1"
                    : "flex-row-reverse border-r-[6px] border-r-p2"
                }`}
              >
                <span
                  className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accent}`}
                >
                  {displayName(p).toUpperCase()}
                </span>
                <span className="text-trim font-pixel tracking-widest text-text-muted text-[clamp(10px,0.8vw,20px)]">
                  {locked[p]
                    ? "LOCKED"
                    : `${chosen.length}/${DEJA_VU_TEAM_SIZE}`}
                </span>
              </div>

              <span className="text-text-muted text-[clamp(11px,0.85vw,20px)]">
                From {displayName(opponent).toUpperCase()}&rsquo;s eliminated Agents
              </span>

              <div className="flex flex-wrap gap-3">
                {candidatesFor(p).map((agent) => {
                  const picked = chosen.includes(agent.id);
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      size={96}
                      selection={picked ? (isP1 ? "selected-p1" : "selected-p2") : "none"}
                      unavailable={locked[p] && !picked}
                      onClick={locked[p] ? undefined : () => onToggle(p, agent.id)}
                    />
                  );
                })}
              </div>

              <button
                disabled={locked[p] || !ready}
                onClick={() => onConfirm(p)}
                className="text-trim w-full bg-event py-4 font-pixel font-bold tracking-widest text-ink transition-colors hover:bg-event-hover disabled:cursor-not-allowed disabled:bg-chrome disabled:text-text-dim"
              >
                {locked[p] ? "TEAM LOCKED" : "LOCK IN TEAM"}
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
