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
  const isP1 = player === "p1";

  const accent = isP1 ? "text-p1" : "text-p2";
  const border = isP1 ? "border-p1" : "border-p2";
  const background = isP1 ? "bg-p1" : "bg-p2";

  const [timeLeft, setTimeLeft] = useState(
    TIMER_CONFIG.squadSeconds
  );

  useEffect(() => {
    if (confirmed) return;
    if (timeLeft <= 0) {
      onTimeout(player);
      return;
    }

    const id = setTimeout(
      () => setTimeLeft((t) => t - 1),
      1000
    );

    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, confirmed]);
  const selectedAgents = squad.map(
    (id) => roster.find((agent) => agent.id === id)
  );

  return (
    <section
      className={`
        flex flex-col min-w-0
        border-t-4 ${border}
        bg-[#141420]
      `}
    >
      {/* PLAYER HEADER */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#303044]">
        <div className="flex flex-col gap-1 min-w-0">
          <span className={`font-pixel text-lg ${accent}`}>
            {displayName(player).toUpperCase()}
          </span>

          <span className="text-xs text-text-muted uppercase tracking-widest">
            Squad Selection
          </span>
        </div>

        {/* TIMER */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-pixel text-text-muted">
            {confirmed ? "STATUS" : "TIME LEFT"}
          </span>

          <span
            className={`
              font-pixel text-2xl
              ${
                confirmed
                  ? accent
                  : timeLeft <= 10
                  ? "text-p2"
                  : "text-text-primary"
              }
            `}
          >
            {confirmed
              ? "LOCKED"
              : `0:${timeLeft.toString().padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {/* SELECTED SQUAD */}
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-pixel text-sm text-text-primary">
            SELECTED SQUAD
          </span>

          <span className={`font-pixel text-sm ${accent}`}>
            {squad.length}/3
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-[600px] mx-auto w-full">
          {[0, 1, 2].map((index) => {
            const agent = selectedAgents[index];

            return (
              <div
                key={index}
                className={`
                  relative min-w-0 aspect-[3/4]
                  border-2
                  ${
                    agent
                      ? border
                      : "border-[#353548]"
                  }
                  bg-[#1D1D2C]
                  overflow-hidden
                `}
              >
                {agent ? (
                  <>
                    <img
                      src={`/agents/agents_full/${agent.id}_full.webp`}
                      alt={agent.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />

                    {/* Agent nameplate */}
                    <div
                      className={`
                        absolute bottom-0 inset-x-0
                        ${background}
                        px-1 py-2
                        text-center
                      `}
                    >
                      <span className="font-mono font-bold text-[20px] text-white break-words">
                        {agent.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="font-pixel text-4xl text-[#45455C]">
                      +
                    </span>

                    <span className="font-pixel text-[10px] text-[#66667D]">
                      SLOT {index + 1}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ROSTER AREA */}
      <div className="flex-1 px-5 pb-5">
        <div className="flex items-center justify-between mb-4 border-b border-[#303044] pb-2">
          <span className="font-pixel text-sm text-text-primary">
            YOUR ROSTER
          </span>

          <span className="text-xs text-text-muted">
            {roster.length} AGENTS
          </span>
        </div>

        <div className="grid grid-cols-6 gap-3 w-fit mx-auto">
          {roster.map((agent) => {
            const inSquad = squad.includes(agent.id);
            const isEligible = eligible(agent.id);

            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                unavailable={
                  !confirmed &&
                  !inSquad &&
                  (!isEligible || squad.length >= 3)
                }
                cooldown={grayed[agent.id] ?? 0}
                selection={inSquad ? player : "none"}
                onClick={
                  confirmed
                    ? undefined
                    : () => onToggleAgent(player, agent)
                }
                size={128}
              />
            );
          })}
        </div>
      </div>

      {/* CONFIRM BUTTON */}
      <div className="px-5 pb-5 pt-3">
        <button
          onClick={() => onConfirmSquad(player)}
          disabled={confirmed || squad.length !== 3}
          className={`
            w-full py-4
            font-pixel font-bold text-sm
            tracking-widest text-white
            transition-opacity
            ${background}
            ${
              confirmed || squad.length !== 3
                ? "opacity-20 cursor-not-allowed"
                : "hover:opacity-80"
            }
          `}
        >
          {confirmed ? "LOCKED IN" : "CONFIRM SQUAD"}
        </button>
      </div>
    </section>
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
    <div className="w-full flex flex-col gap-6 py-3">
      {/* ROUND HEADING */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel text-lg text-text-primary text-center">
          ROUND {round}
        </span>

        <span className="font-pixel text-sm text-text-muted tracking-widest">
          SQUAD SELECTION
        </span>
      </div>

      {/* TWO PLAYER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
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
