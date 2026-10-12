import { useEffect, useState } from "react";
import type { Agent, PendingRemoval, PlayerId, RoundLogEntry } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { AgentPool } from "../Components/AgentPool";
import { TIMER_CONFIG } from "../Data/timers";

interface ScoreSubmitProps {
  pool: Agent[];
  banned: string[];
  round: number;
  bossName: string | undefined;
  roundWins: Record<PlayerId, number>;
  rosters: Record<PlayerId, Agent[]>;
  squads: Record<PlayerId, string[]>;
  timeInputs: Record<PlayerId, { minutes: string; seconds: string }>;
  submitted: Record<PlayerId, boolean>;
  onTimeChange: (player: PlayerId, field: "minutes" | "seconds", value: string) => void;
  onConfirmTime: (player: PlayerId) => void;
  onTimeout: () => void;
  pendingRemoval: PendingRemoval | null;
  removalSelection: string[];
  onToggleRemoval: (agentId: string) => void;
  onConfirmRemoval: () => void;
  roundLog: RoundLogEntry[];
  displayName: (p: PlayerId | null) => string;
}

const ROUND_SECONDS = TIMER_CONFIG.scoreTotalSeconds;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayerTimeInput({
  player,
  accent,
  input,
  locked,
  displayName,
  onTimeChange,
  onConfirmTime,
}: {
  player: PlayerId;
  accent: string;
  input: { minutes: string; seconds: string };
  locked: boolean;
  displayName: (p: PlayerId | null) => string;
  onTimeChange: (player: PlayerId, field: "minutes" | "seconds", value: string) => void;
  onConfirmTime: (player: PlayerId) => void;
}) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <label className={`text-xs font-pixel ${accent}`}>{displayName(player).toUpperCase()}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          placeholder="MM"
          disabled={locked}
          className="bg-unavailable border-b-2 border-current px-2 py-3 text-lg font-sand text-text-primary outline-none w-16 text-center disabled:opacity-40"
          value={input.minutes}
          onChange={(e) => onTimeChange(player, "minutes", e.target.value)}
        />
        <span className="text-text-primary text-lg">:</span>
        <input
          type="number"
          min={0}
          max={59}
          placeholder="SS"
          disabled={locked}
          className="bg-unavailable border-b-2 border-current px-2 py-3 text-lg font-sand text-text-primary outline-none w-16 text-center disabled:opacity-40"
          value={input.seconds}
          onChange={(e) => onTimeChange(player, "seconds", e.target.value)}
        />
      </div>
      <button
        onClick={() => onConfirmTime(player)}
        disabled={locked}
        className={`px-6 py-2 font-pixel font-bold text-sm text-white tracking-widest transition-opacity ${
          player === "p1" ? "bg-p1" : "bg-p2"
        } ${locked ? "opacity-20 cursor-not-allowed" : "hover:opacity-80"}`}
      >
        {locked ? "LOCKED IN" : "CONFIRM"}
      </button>
    </div>
  );
}

export function ScoreSubmit({
  pool,
  banned,
  round,
  bossName,
  roundWins,
  rosters,
  squads,
  timeInputs,
  submitted,
  onTimeChange,
  onConfirmTime,
  onTimeout,
  pendingRemoval,
  removalSelection,
  onToggleRemoval,
  onConfirmRemoval,
  roundLog,
  displayName,
}: ScoreSubmitProps) {
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);

  // The round is "resolved" (stop counting down) once both players have
  // locked in a time, OR a loss is already being processed.
  const resolved = !!pendingRemoval || (submitted.p1 && submitted.p2);

  useEffect(() => {
    if (resolved) return;
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, resolved, onTimeout]);

  const removalChoices = pendingRemoval
    ? rosters[pendingRemoval.player].filter((a) => pendingRemoval.pool.includes(a.id))
    : [];

  // As soon as one player locks in a time, the other gets capped to 2
  // minutes remaining (if they still had more than that) — sudden death.
  function handleConfirmTime(player: PlayerId) {
    onConfirmTime(player);
    const opponent: PlayerId = player === "p1" ? "p2" : "p1";
    if (!submitted[opponent] && timeLeft > TIMER_CONFIG.scoreSuddenDeathSeconds) {
      setTimeLeft(TIMER_CONFIG.scoreSuddenDeathSeconds);
    }
  }

  return (
    <div className="flex gap-4 items-start py-8">
      {/* P1 roster — left */}
      <div className="flex flex-col gap-2 w-48 flex-shrink-0">
        <span className="text-xs font-pixel text-p1">
          {displayName("p1").toUpperCase()} — {rosters.p1.length}
        </span>
        <div className="flex flex-wrap gap-1">
          {rosters.p1.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              unavailable={!squads.p1.includes(a.id)}
              selection="p1"
              size={48}
            />
          ))}
        </div>
      </div>

      {/* Center */}
      <div
        className="flex flex-col items-center gap-6 flex-1 min-w-0"
        style={{ minHeight: "calc(100vh - 12rem)" }}
      >
        {/* Round info */}
        <div className="flex items-center gap-6">
          <span className="font-sand text-text-muted text-sm">
            {displayName("p1")}: <span className="text-p1 font-bold">{roundWins.p1}</span>
          </span>
          <span className="font-pixel text-text-primary text-xl">ROUND {round}</span>
          <span className="font-sand text-text-muted text-sm">
            {displayName("p2")}: <span className="text-p2 font-bold">{roundWins.p2}</span>
          </span>
        </div>
        {bossName && (
          <span className="text-[10px] font-pixel text-text-muted tracking-widest">
            BOSS: {bossName.toUpperCase()}
          </span>
        )}

        {/* Timer */}
        <span
          className={`font-pixel text-3xl ${timeLeft <= 30 && !resolved ? "text-p2" : "text-text-primary"}`}
        >
          {resolved ? "—:—" : formatTime(Math.max(timeLeft, 0))}
        </span>

        {/* Time input */}
        <div className="flex gap-8 items-start">
          <PlayerTimeInput
            player="p1"
            accent="text-p1"
            input={timeInputs.p1}
            locked={submitted.p1}
            displayName={displayName}
            onTimeChange={onTimeChange}
            onConfirmTime={handleConfirmTime}
          />
          <PlayerTimeInput
            player="p2"
            accent="text-p2"
            input={timeInputs.p2}
            locked={submitted.p2}
            displayName={displayName}
            onTimeChange={onTimeChange}
            onConfirmTime={handleConfirmTime}
          />
        </div>

        {/* Agent removal */}
        {pendingRemoval && (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="font-sand text-text-primary text-lg">
              <span className={pendingRemoval.player === "p1" ? "text-p1 font-bold" : "text-p2 font-bold"}>
                {displayName(pendingRemoval.player)}
              </span>{" "}
              must remove {pendingRemoval.count} of this round's agents
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {removalChoices.map((a) => {
                const selected = removalSelection.includes(a.id);
                return (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    selection={
                      selected
                        ? pendingRemoval.player === "p1"
                          ? "selected-p1"
                          : "selected-p2"
                        : "none"
                    }
                    onClick={() => onToggleRemoval(a.id)}
                    size={72}
                  />
                );
              })}
            </div>
            <button
              disabled={removalSelection.length !== pendingRemoval.count}
              onClick={onConfirmRemoval}
              className={`px-10 py-3 font-pixel font-bold text-xl text-white tracking-widest transition-opacity bg-p2
                ${removalSelection.length !== pendingRemoval.count ? "opacity-20 cursor-not-allowed" : "hover:opacity-80"}`}
            >
              CONFIRM REMOVAL ({removalSelection.length}/{pendingRemoval.count})
            </button>
          </div>
        )}

        {/* Round log */}
        {roundLog.length > 0 && (
          <div className="flex flex-col gap-1 w-full max-w-md">
            <span className="text-xs font-pixel text-text-muted mb-1">ROUND LOG</span>
            {roundLog.map((r, i) => (
              <p key={i} className="text-xs font-sand text-text-muted">
                Round {r.round}
                {r.boss ? ` (${r.boss})` : ""}: <span className="text-p1">{displayName("p1")}</span>{" "}
                {formatTime(r.t1)} — {formatTime(r.t2)} <span className="text-p2">{displayName("p2")}</span>
                {r.outcome === "double-timeout"
                  ? " · both lost (no submission)"
                  : r.winner
                    ? ` · ${displayName(r.winner)} wins${r.outcome === "timeout" ? " (opponent timed out)" : " (faster time)"}`
                    : " · tie"}
              </p>
            ))}
          </div>
        )}

        {/* Agent pool */}
        <div className="mt-auto w-full">
          <AgentPool
            agents={pool}
            banned={banned}
            showBanOverlay={false}
            cardSize={56}
            showHeaders={false}
            flat={true}
            selection={(a) => {
              const inP1 = rosters.p1.some((x) => x.id === a.id);
              const inP2 = rosters.p2.some((x) => x.id === a.id);
              if (inP1 && inP2) return "mirror";
              if (inP1) return "p1";
              if (inP2) return "p2";
              return "none";
            }}
            onClick={() => {}}
          />
        </div>
      </div>

      {/* P2 roster — right */}
      <div className="flex flex-col gap-2 w-48 flex-shrink-0">
        <span className="text-xs font-pixel text-p2">
          {displayName("p2").toUpperCase()} — {rosters.p2.length}
        </span>
        <div className="flex flex-wrap gap-1">
          {rosters.p2.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              unavailable={!squads.p2.includes(a.id)}
              selection="p2"
              size={48}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
