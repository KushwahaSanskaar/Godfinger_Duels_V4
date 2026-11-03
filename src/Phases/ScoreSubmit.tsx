import { useEffect, useState } from "react";
import { usePaused } from "../Hooks/PauseContext";
import type { Agent, PendingRemoval, PlayerId, RoundLogEntry } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { AgentPool } from "../Components/AgentPool";
import { TIMER_CONFIG } from "../Data/timers";
import { roundLabel, OVERTIME_STREAK_TO_WIN } from "../Data/modes";
import { displayForm, isMorphItem } from "../Data/morphItems";

interface ScoreSubmitProps {
  pool: Agent[];
  banned: string[];
  round: number;
  totalRounds: number;
  swapped: boolean;
  timePenalty: Record<PlayerId, number>;
  bossName: string | undefined;
  roundWins: Record<PlayerId, number>;
  overtimeStreak: Record<PlayerId, number>;
  rosters: Record<PlayerId, Agent[]>;
  squads: Record<PlayerId, string[]>;
  morphs: Record<PlayerId, Record<string, string>>; // Soul Stone / Invitation forms, per squad owner
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

function PlayerPanel({
  player, roster, pool, swapped, penalty, squad, morphs, wins, input, locked, displayName,
  onTimeChange, onConfirmTime, pendingRemoval, removalSelection,
  onToggleRemoval, onConfirmRemoval,
}: {
  player: PlayerId;
  roster: Agent[];
  swapped: boolean; // Armory Swap: this player is playing the OTHER squad
  pool: Agent[]; // everything a squad can hold: the pool plus both rosters (Preset Teams, Armory Swap, Soul Stones)
  penalty: number; // seconds added to this player's time
  squad: string[];
  morphs: Record<string, string>; // item id -> agent it became
  wins: number;
  input: { minutes: string; seconds: string };
  locked: boolean;
  displayName: (p: PlayerId | null) => string;
  onTimeChange: (p: PlayerId, f: "minutes" | "seconds", v: string) => void;
  onConfirmTime: (p: PlayerId) => void;
  pendingRemoval: PendingRemoval | null;
  removalSelection: string[];
  onToggleRemoval: (id: string) => void;
  onConfirmRemoval: () => void;
}) {
  const isP1 = player === "p1";
  const accent = isP1 ? "text-p1" : "text-p2";
  const border = isP1 ? "border-p1" : "border-p2";
  const background = isP1 ? "bg-p1" : "bg-p2";
  const isRemoving = pendingRemoval?.player === player;
  const selectedAgents = squad.map(id => pool.find(a => a.id === id));
  const removable = isRemoving
    ? roster.filter(a => pendingRemoval.pool.includes(a.id))
    : [];

  return (
    <section className={`flex flex-col min-w-0 border-t-4 ${border} bg-[#141420]`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#303044]">
        <div className="min-w-0">
          <div className={`font-pixel text-lg ${accent}`}>{displayName(player).toUpperCase()}</div>
          <div className="text-xs text-text-muted mt-1">{roster.length} AGENTS REMAINING</div>
        </div>
        <div className="text-right">
          <div className="font-pixel text-[10px] text-text-muted">ROUND WINS</div>
          <div className={`font-pixel text-2xl ${accent}`}>{wins}</div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-6">
        {swapped && (
          <div className="font-pixel text-xs text-event mb-3 text-center">
            ARMORY SWAP · PLAYING {displayName(player === "p1" ? "p2" : "p1").toUpperCase()}’S SQUAD
          </div>
        )}
        {penalty > 0 && (
          <div className="font-pixel text-xs text-p2-alt2 mb-3 text-center">
            HOLD ON, WAIT FOR ME! · +{penalty}s ADDED TO YOUR TIME
          </div>
        )}
        <div className="flex justify-between items-center mb-4">
          <span className="font-pixel text-sm text-text-primary">ROUND SQUAD</span>
          <span className={`font-pixel text-sm ${accent}`}>{squad.length} AGENT{squad.length === 1 ? "" : "S"}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-[600px] mx-auto w-full">
          {Array.from({ length: Math.max(squad.length, 1) }, (_, index) => index).map(index => {
            const agent = selectedAgents[index];
            const shown = agent ? displayForm(agent, morphs, pool) : null;
            return (
              <div key={index} className={`relative min-w-0 aspect-[3/4] border-2 ${agent ? border : "border-[#353548]"} bg-[#1D1D2C] overflow-hidden`}>
                {agent ? (
                  <>
                    <img src={`/agents/agents_full/${shown!.agent.art ?? shown!.agent.id}_full.webp`} alt={shown!.agent.name} loading="eager" className="absolute inset-0 w-full h-full object-cover object-top" />
                    {shown!.via && (
                      <span className="absolute top-1 right-1 bg-event text-[#141420] font-pixel text-[10px] px-1">{shown!.via.toUpperCase()}</span>
                    )}
                    <div className={`absolute bottom-0 inset-x-0 ${background} px-1 py-2 text-center`}>
                      <span className="font-mono font-bold text-[20px] text-white break-words">{shown!.agent.name}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-pixel text-3xl text-[#45455C]">+</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* During removal, only the losing player's eligible squad members can be selected. */}
      {isRemoving ? (
        <div className="px-5 pb-5">
          <div className="font-pixel text-sm text-text-primary mb-2">SELECT AGENTS TO REMOVE</div>
          <p className="text-sm text-text-muted mb-4">
            Choose {pendingRemoval.count} of this round's agents ({removalSelection.length}/{pendingRemoval.count})
            {((pendingRemoval.locked?.length ?? 0) > 0 || pendingRemoval.pool.every(isMorphItem)) &&
              " — Soul Stones and Invitations used this round are removed first"}
          </p>
          <div className="grid grid-cols-6 gap-3 w-fit mx-auto mb-5">
            {removable.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                selection={removalSelection.includes(agent.id) ? (isP1 ? "selected-p1" : "selected-p2") : "none"}
                onClick={() => onToggleRemoval(agent.id)}
                size={128}
              />
            ))}
          </div>
          <button
            disabled={removalSelection.length !== pendingRemoval.count}
            onClick={onConfirmRemoval}
            className={`w-full py-4 font-pixel text-sm font-bold text-white ${background} ${removalSelection.length !== pendingRemoval.count ? "opacity-20 cursor-not-allowed" : "hover:brightness-110"}`}
          >
            CONFIRM REMOVAL ({removalSelection.length}/{pendingRemoval.count})
          </button>
        </div>
      ) : !pendingRemoval ? (
        <div className="px-5 pb-6">
          <div className="font-pixel text-sm text-text-primary mb-4">SUBMIT TIME</div>

          <div className="flex items-center justify-center gap-4">
            {/* TIME INPUTS */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="MM"
                disabled={locked}
                value={input.minutes}
                onChange={e => onTimeChange(player, "minutes", e.target.value)}
                className="bg-unavailable border-b-2 border-current px-2 py-3 font-sand text-2xl text-text-primary outline-none w-20 text-center disabled:opacity-40"
              />

              <span className="font-pixel text-xl text-text-primary">:</span>

              <input
                type="number"
                min={0}
                max={59}
                placeholder="SS"
                disabled={locked}
                value={input.seconds}
                onChange={e => onTimeChange(player, "seconds", e.target.value)}
                className="bg-unavailable border-b-2 border-current px-2 py-3 font-sand text-2xl text-text-primary outline-none w-20 text-center disabled:opacity-40"
              />
            </div>

            {/* CONFIRM BUTTON */}
            <button
              onClick={() => onConfirmTime(player)}
              disabled={locked}
              className={`
      px-6 py-4
      font-pixel text-sm font-bold text-white
      whitespace-nowrap
      ${background}
      ${locked
                  ? "opacity-20 cursor-not-allowed"
                  : "hover:brightness-110"}
    `}
            >
              {locked ? "LOCKED IN" : "CONFIRM TIME"}
            </button>
          </div>

        </div>
      ) : (
        <div className="px-5 pb-6 font-pixel text-xs text-text-muted text-center">AWAITING REMOVAL</div>
      )}

      <div className="flex-1 px-5 pb-6">
        <div className="flex justify-between items-center border-b border-[#303044] pb-2 mb-4">
          <span className="font-pixel text-sm text-text-primary">YOUR ROSTER</span>
          <span className="text-xs text-text-muted">{roster.length} AGENTS</span>
        </div>
        <div className="grid grid-cols-6 gap-3 w-fit mx-auto">
          {roster.map(agent => (
            <AgentCard key={agent.id} agent={agent} size={128}
              unavailable={!squad.includes(agent.id)} selection={player} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ScoreSubmit({
  pool, banned, round, totalRounds, swapped, bossName, roundWins, overtimeStreak, timePenalty, rosters, squads, morphs,
  timeInputs, submitted, onTimeChange, onConfirmTime, onTimeout,
  pendingRemoval, removalSelection, onToggleRemoval, onConfirmRemoval,
  roundLog, displayName,
}: ScoreSubmitProps) {
  // A squad can hold Soul Stones / Invitations and, under Armory Swap, the OTHER
  // player's agents, so lookups search both rosters as well as the pool.
  const squadLookup = [...rosters.p1, ...rosters.p2, ...pool];
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const resolved = !!pendingRemoval || (submitted.p1 && submitted.p2);
  const paused = usePaused(); // host pause: the round clock stands still

  useEffect(() => {
    if (resolved || paused) return;
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, resolved, paused, onTimeout]);

  // Preserve original sudden-death behavior.
  function handleConfirmTime(player: PlayerId) {
    onConfirmTime(player);
    const opponent: PlayerId = player === "p1" ? "p2" : "p1";
    if (!submitted[opponent] && timeLeft > TIMER_CONFIG.scoreSuddenDeathSeconds) {
      setTimeLeft(TIMER_CONFIG.scoreSuddenDeathSeconds);
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 py-3">
      <header className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center gap-5">
          <span className="font-pixel text-lg text-text-primary">
            {roundLabel(round, totalRounds)}
          </span>
          <span
            className={`font-pixel text-lg ${timeLeft <= 30 && !resolved
              ? "text-p2"
              : "text-text-primary"
              }`}
          >
            {resolved ? "—:—" : formatTime(Math.max(timeLeft, 0))}
          </span>
        </div>
        {bossName && (
          <span className="font-pixel text-xs text-text-muted">
            BOSS: {bossName.toUpperCase()}
          </span>
        )}
        {round > totalRounds && (
          <span className="font-pixel text-xs text-text-muted text-center">
            FIRST TO {OVERTIME_STREAK_TO_WIN} WINS IN A ROW ·{" "}
            <span className="text-p1">{displayName("p1")} {overtimeStreak.p1}</span>
            {" / "}
            <span className="text-p2">{displayName("p2")} {overtimeStreak.p2}</span>
          </span>
        )}
        {pendingRemoval && (
          <span className="font-pixel text-sm text-text-primary">
            SQUAD REMOVAL
          </span>
        )}
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {(["p1", "p2"] as PlayerId[]).map(player => (
          <PlayerPanel key={player} player={player} roster={rosters[player]} pool={squadLookup} swapped={swapped} penalty={timePenalty[player]} squad={squads[player]} morphs={morphs[player]}
            wins={roundWins[player]} input={timeInputs[player]} locked={submitted[player]}
            displayName={displayName} onTimeChange={onTimeChange}
            onConfirmTime={handleConfirmTime} pendingRemoval={pendingRemoval}
            removalSelection={removalSelection} onToggleRemoval={onToggleRemoval}
            onConfirmRemoval={onConfirmRemoval} />
        ))}
      </div>

      {roundLog.length > 0 && (
        <div className="bg-[#141420] p-5">
          <div className="font-pixel text-sm text-text-primary mb-3">ROUND LOG</div>
          {roundLog.map((r, i) => (
            <p key={i} className="text-xs font-sand text-text-muted mb-1">
              Round {r.round}{r.boss ? ` (${r.boss})` : ""}: <span className="text-p1">{displayName("p1")}</span>{" "}
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

      <div className="w-full">
        <AgentPool agents={pool} banned={banned} showBanOverlay={false} cardSize={56}
          showHeaders={false} flat={true}
          selection={a => {
            const inP1 = rosters.p1.some(x => x.id === a.id);
            const inP2 = rosters.p2.some(x => x.id === a.id);
            if (inP1 && inP2) return "mirror";
            if (inP1) return "p1";
            if (inP2) return "p2";
            return "none";
          }}
          onClick={() => { }} />
      </div>
    </div>
  );
}
