import { useEffect, useState } from "react";
import type { Agent, PlayerId } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { TIMER_CONFIG } from "../Data/timers";

interface SquadSelectProps {
  round: number;
  rosters: Record<PlayerId, Agent[]>;
  squads: Record<PlayerId, string[]>;
  squadsConfirmed: Record<PlayerId, boolean>;
  grayedOut: Record<PlayerId, Record<string, number>>;
  isSquadEligible: (player: PlayerId, agentId: string) => boolean;
  displayName: (p: PlayerId | null) => string;
  onToggleAgent: (player: PlayerId, agent: Agent) => void;
  onConfirmSquad: (player: PlayerId) => void;
  onTimeoutForPlayer: (player: PlayerId) => void;
}

function SquadColumn({
  player,
  roster,
  squad,
  confirmed,
  grayed,
  eligible,
  displayName,
  onToggleAgent,
  onConfirmSquad,
  onTimeout,
}: {
  player: PlayerId;
  roster: Agent[];
  squad: string[];
  confirmed: boolean;
  grayed: Record<string, number>;
  eligible: (agentId: string) => boolean;
  displayName: (p: PlayerId | null) => string;
  onToggleAgent: (player: PlayerId, agent: Agent) => void;
  onConfirmSquad: (player: PlayerId) => void;
  onTimeout: (player: PlayerId) => void;
}) {
  const accent = player === "p1" ? "text-p1" : "text-p2";
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIG.squadSeconds);

  useEffect(() => {
    if (confirmed) return;
    if (timeLeft <= 0) {
      onTimeout(player);
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, confirmed]);

  return (
    <div className="flex flex-col gap-3 flex-1 items-center">
      <span className={`text-sm font-pixel ${accent}`}>
        {displayName(player).toUpperCase()} — SELECT 3 ({squad.length}/3)
      </span>
      <span className={`font-pixel text-sm ${!confirmed && timeLeft <= 10 ? "text-p2" : "text-text-muted"}`}>
        {confirmed ? "LOCKED" : `0:${timeLeft.toString().padStart(2, "0")}`}
      </span>
      <div className="flex flex-wrap gap-2 justify-center max-w-lg">
        {roster.map((a) => {
          const inSquad = squad.includes(a.id);
          const isEligible = eligible(a.id);
          return (
            <AgentCard
              key={a.id}
              agent={a}
              unavailable={!confirmed && !inSquad && (!isEligible || squad.length >= 3)}
              cooldown={grayed[a.id] ?? 0}
              selection={inSquad ? player : "none"}
              onClick={confirmed ? undefined : () => onToggleAgent(player, a)}
              size={64}
            />
          );
        })}
      </div>
      <button
        onClick={() => onConfirmSquad(player)}
        disabled={confirmed || squad.length !== 3}
        className={`px-8 py-2 font-pixel font-bold text-sm text-white tracking-widest transition-opacity ${
          player === "p1" ? "bg-p1" : "bg-p2"
        } ${confirmed || squad.length !== 3 ? "opacity-20 cursor-not-allowed" : "hover:opacity-80"}`}
      >
        {confirmed ? "LOCKED IN" : "CONFIRM SQUAD"}
      </button>
    </div>
  );
}

export function SquadSelect({
  round,
  rosters,
  squads,
  squadsConfirmed,
  grayedOut,
  isSquadEligible,
  displayName,
  onToggleAgent,
  onConfirmSquad,
  onTimeoutForPlayer,
}: SquadSelectProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      <span className="font-pixel text-text-primary text-xl">ROUND {round} — SQUAD SELECT</span>
      <div className="flex gap-10 w-full justify-center">
        <SquadColumn
          player="p1"
          roster={rosters.p1}
          squad={squads.p1}
          confirmed={squadsConfirmed.p1}
          grayed={grayedOut.p1}
          eligible={(id) => isSquadEligible("p1", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          onTimeout={onTimeoutForPlayer}
        />
        <SquadColumn
          player="p2"
          roster={rosters.p2}
          squad={squads.p2}
          confirmed={squadsConfirmed.p2}
          grayed={grayedOut.p2}
          eligible={(id) => isSquadEligible("p2", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          onTimeout={onTimeoutForPlayer}
        />
      </div>
    </div>
  );
}
