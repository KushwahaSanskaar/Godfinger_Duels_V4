import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Agent, PendingRemoval, PlayerId } from "../types";
import { agentFullArtUrl } from "../Logic/agentArt";
import { AgentCard } from "../Components/AgentCard";
import { Notice } from "../Components/Notice";
import { Panel } from "../Components/Panel";
import { Timer } from "../Components/Timer";
import { HudStatusPortal } from "../Components/HudStatusPortal";
import { useTurnTimer } from "../Hooks/useTurnTimer";
import { TIMER_CONFIG } from "../Data/timers";
import { OVERTIME_STREAK_TO_WIN } from "../Data/modes";
import { displayForm, isMorphItem, isSoulStone } from "../Data/morphItems";
import { hasTime } from "../Logic/timeInput";
import { VETO_CARD_ID } from "../Logic/squadRules";

interface ScoreSubmitProps {
  pool: Agent[];
  round: number;
  totalRounds: number;
  swapped: boolean;
  preset: boolean;
  veto: Record<PlayerId, boolean>; // who holds a Veto Card
  lossPenalty: Record<PlayerId, number>; // Emergency Reinforcements: a loss costs this many (0 = normal)
  timePenalty: Record<PlayerId, number>;
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
  bossName: string | undefined;
  overtimeStreak: Record<PlayerId, number>;
  rosters: Record<PlayerId, Agent[]>;
  squads: Record<PlayerId, string[]>;
  morphs: Record<PlayerId, Record<string, string>>; // Soul Stone / Invitation forms, per squad owner
  timeInputs: Record<PlayerId, { minutes: string; seconds: string }>;
  submitted: Record<PlayerId, boolean>;
  onTimeChange: (
    player: PlayerId,
    field: "minutes" | "seconds",
    value: string,
  ) => void;
  onConfirmTime: (player: PlayerId) => void;
  onTimeout: () => void;
  pendingRemoval: PendingRemoval | null;
  removalSelection: string[];
  onToggleRemoval: (agentId: string) => void;
  onConfirmRemoval: () => void;
  displayName: (p: PlayerId | null) => string;
}

const ROSTER_COLUMNS = 6;
const ROSTER_GAP = 12;
const EMPTY_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.05) 10px 12px)";
const FORM_STRIP =
  "text-trim bg-ink/90 py-[0.6em] text-center font-pixel tracking-wider text-lavender-bright";
const TAG_SIZE = "clamp(9px, 0.7vw, 18px)";
const CHAMFER_VARS = {
  "--c": "clamp(12px, 1.1vw, 26px)",
} as React.CSSProperties;
const CHAMFER =
  "polygon(0 0, calc(100% - var(--c)) 0, 100% var(--c), 100% 100%, var(--c) 100%, 0 calc(100% - var(--c)))";
const CHAMFER_INNER =
  "polygon(0 0, calc(100% - var(--c) + 1px) 0, 100% calc(var(--c) - 1px), 100% 100%, calc(var(--c) - 1px) 100%, 0 calc(100% + 1px - var(--c)))";
const VETO_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(245,197,24,0.1) 10px 12px)";
const BUTTON =
  "text-trim font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors";
const GOLD_BUTTON = "bg-event text-ink hover:bg-event-hover";
const DISABLED_BUTTON =
  "cursor-not-allowed border-2 border-chrome bg-chrome-fill text-lavender";
const TIME_INPUT =
  "w-[2.6em] border-2 border-chrome bg-ink py-[0.45em] text-center font-lexend font-black leading-none text-bright outline-none transition-colors placeholder:text-chrome-strong focus:border-event disabled:opacity-50";

function useViewportHeight() {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

function useFittedCardSize(
  columns: number,
  gap: number,
  viewportShare: number,
  maxSize = 160,
) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const viewportHeight = useViewportHeight();
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const size = Math.max(
    56,
    Math.min(
      Math.floor((width - gap * (columns - 1)) / columns),
      Math.floor(viewportHeight * viewportShare),
      maxSize,
    ),
  );
  return { ref, size };
}

function BossBar({
  bossName,
  overtime,
  overtimeStreak,
  displayName,
}: {
  bossName: string | undefined;
  overtime: boolean;
  overtimeStreak: Record<PlayerId, number>;
  displayName: (p: PlayerId | null) => string;
}) {
  return (
    <div className="flex justify-center">
      <Panel className="flex items-center gap-4 px-5 py-3">
        <span
          className="text-trim font-pixel tracking-widest text-lavender-light"
          style={{ fontSize: TAG_SIZE }}
        >
          <span className="text-event">◆</span> BOSS
        </span>
        <span className="text-trim font-pixel font-bold text-bright text-[clamp(14px,1.2vw,32px)]">
          {(bossName ?? "UNKNOWN").toUpperCase()}
        </span>
        {overtime && (
          <>
            <span className="h-[1.4em] w-[2px] self-stretch bg-chrome" />
            <span
              className="text-trim font-pixel tracking-widest text-event"
              style={{ fontSize: TAG_SIZE }}
            >
              OVERTIME · FIRST TO {OVERTIME_STREAK_TO_WIN} IN A ROW
            </span>
            <span className="text-trim font-pixel" style={{ fontSize: TAG_SIZE }}>
              <span className="text-p1">
                {displayName("p1").toUpperCase()} {overtimeStreak.p1}
              </span>
              <span className="text-lavender"> / </span>
              <span className="text-p2">
                {displayName("p2").toUpperCase()} {overtimeStreak.p2}
              </span>
            </span>
          </>
        )}
      </Panel>
    </div>
  );
}

const twoDigits = (value: string) => value.replace(/\D/g, "").slice(0, 2);

function TimeEntry({
  player,
  input,
  locked,
  onTimeChange,
  onConfirmTime,
}: {
  player: PlayerId;
  input: { minutes: string; seconds: string };
  locked: boolean;
  onTimeChange: (p: PlayerId, f: "minutes" | "seconds", v: string) => void;
  onConfirmTime: (p: PlayerId) => void;
}) {
  // Confirm only works once a time is typed in (and not again if it is cleared).
  const canConfirm = !locked && hasTime(input);
  return (
    <div className="flex items-stretch gap-4 px-5 pb-4">
      <div className="flex items-center gap-2 text-[clamp(22px,1.8vw,46px)]">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          aria-label="Minutes"
          disabled={locked}
          value={input.minutes}
          onChange={(e) => onTimeChange(player, "minutes", twoDigits(e.target.value))}
          className={TIME_INPUT}
        />
        <span className="font-lexend font-black text-lavender">:</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="SS"
          aria-label="Seconds"
          disabled={locked}
          value={input.seconds}
          onChange={(e) => onTimeChange(player, "seconds", twoDigits(e.target.value))}
          className={TIME_INPUT}
        />
      </div>
      <button
        onClick={() => onConfirmTime(player)}
        disabled={!canConfirm}
        className={`${BUTTON} flex-1 ${locked
            ? "border-2 border-event bg-event/10 text-event"
            : canConfirm
              ? GOLD_BUTTON
              : DISABLED_BUTTON
          }`}
      >
        {locked ? "LOCKED IN" : "CONFIRM TIME"}
      </button>
    </div>
  );
}

// The Veto Card sits on the removal screen like one more agent in the squad.
function VetoTile({
  size,
  selected,
  onClick,
}: {
  size: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      data-testid="veto-tile"
      className={`flex flex-col items-center justify-center gap-[0.7em] border-4 font-pixel transition-colors ${selected
          ? "border-event bg-event text-ink"
          : "border-event bg-ink text-event hover:bg-event-plate"
        }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.14),
        backgroundImage: selected ? undefined : VETO_TEXTURE,
      }}
    >
      <span className="text-trim font-bold">VETO</span>
      <span className="text-trim">CARD</span>
    </button>
  );
}

function RemovalPanel({
  roster,
  overtime,
  preset,
  pendingRemoval,
  removalSelection,
  onToggleRemoval,
  onConfirmRemoval,
}: {
  player: PlayerId;
  roster: Agent[];
  overtime: string[]; // agents on an Overtime Contract
  preset: boolean;
  pendingRemoval: PendingRemoval;
  removalSelection: string[];
  onToggleRemoval: (id: string) => void;
  onConfirmRemoval: () => void;
}) {
  const removable = roster.filter((a) => pendingRemoval.pool.includes(a.id));
  const { ref, size } = useFittedCardSize(ROSTER_COLUMNS, ROSTER_GAP, 0.12);
  const usingVeto = removalSelection.includes(VETO_CARD_ID);
  const picked = removalSelection.filter((id) => id !== VETO_CARD_ID).length;
  const ready = usingVeto || picked === pendingRemoval.count;
  const soulStonesFirst =
    (pendingRemoval.locked?.length ?? 0) > 0 ||
    pendingRemoval.pool.every(isSoulStone);
  const rules = [
    `Pick from ${preset ? "the agents you picked" : "this round's squad"}.`,
    soulStonesFirst && "Soul Stones used this round go first.",
    pendingRemoval.veto && "Or play your Veto Card to keep everyone.",
  ].filter(Boolean);

  return (
    <div className="mx-5 mb-4 flex flex-col gap-3 border-2 border-event bg-event-plate p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-trim font-pixel tracking-wider text-event text-[clamp(11px,0.9vw,24px)]">
          ◆ REMOVE {pendingRemoval.count} AGENT
          {pendingRemoval.count === 1 ? "" : "S"}
        </span>
        <div className="flex gap-[0.4em] text-[clamp(10px,0.8vw,20px)]">
          {Array.from({ length: pendingRemoval.count }, (_, i) => (
            <span
              key={i}
              className={`h-[1em] w-[1em] border-2 ${usingVeto
                  ? "border-chrome bg-transparent"
                  : i < picked
                    ? "border-p2 bg-p2"
                    : "border-event bg-transparent"
                }`}
            />
          ))}
        </div>
      </div>

      <span className="text-trim text-text-primary text-[clamp(12px,0.85vw,20px)]">
        {rules.join(" ")}
      </span>
      <div ref={ref}>
        <div className="flex flex-wrap justify-center" style={{ gap: ROSTER_GAP }}>
          {removable.map((agent) => {
            const marked = removalSelection.includes(agent.id);
            return (
              <div
                key={agent.id}
                className="relative overflow-hidden"
                style={{ width: size, height: size }}
              >
                <AgentCard
                  agent={agent}
                  size={size}
                  tags={overtime.includes(agent.id) ? ["OVERTIME"] : undefined}
                  onClick={() => onToggleRemoval(agent.id)}
                />
                {marked && (
                  <div className="pointer-events-none absolute left-[-20%] right-[-20%] top-[34%] z-20 flex h-[32%] -rotate-12 items-center justify-center bg-ink/90 outline outline-[3px] outline-p2">
                    <span
                      className="text-trim font-pixel font-bold tracking-[-0.12em] text-p2-alt2"
                      style={{ fontSize: `clamp(7px, ${size * 0.2}px, 52px)` }}
                    >
                      REMOVE
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {pendingRemoval.veto && (
            <VetoTile
              size={size}
              selected={usingVeto}
              onClick={() => onToggleRemoval(VETO_CARD_ID)}
            />
          )}
        </div>
      </div>
      <button
        disabled={!ready}
        onClick={onConfirmRemoval}
        className={`${BUTTON} w-full py-5 ${ready ? GOLD_BUTTON : DISABLED_BUTTON}`}
      >
        {usingVeto ? "PLAY VETO CARD" : "CONFIRM REMOVAL"}
      </button>
    </div>
  );
}

function PlayerColumn({
  player,
  roster,
  pool,
  swapped,
  preset,
  hasVeto,
  lossCost,
  penalty,
  squad,
  morphs,
  immune,
  input,
  locked,
  displayName,
  onTimeChange,
  onConfirmTime,
  pendingRemoval,
  removalSelection,
  onToggleRemoval,
  onConfirmRemoval,
}: {
  player: PlayerId;
  roster: Agent[];
  pool: Agent[]; // everything a squad can hold: the pool plus both rosters (Preset Teams, Armory Swap, Soul Stones)
  swapped: boolean; // Armory Swap: this player is playing the OTHER squad
  preset: boolean; // Preset Teams: the removal pool is the squad they PICKED
  hasVeto: boolean;
  lossCost: number; // agents this player loses on a loss, if not the normal 2
  penalty: number; // seconds added to this player's time
  squad: string[];
  morphs: Record<string, string>; // item id -> agent it became
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
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
  const background = isP1 ? "bg-p1" : "bg-p2";
  const isRemoving = pendingRemoval?.player === player;
  // Armory Swap: the squad shown here is the other player's agents.
  const squadOvertime = immune[swapped ? (player === "p1" ? "p2" : "p1") : player];
  const selectedAgents = squad.map((id) => pool.find((a) => a.id === id));
  const { ref: rosterRef, size: rosterCardSize } = useFittedCardSize(
    ROSTER_COLUMNS,
    ROSTER_GAP,
    0.12,
  );

  const name = (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accent}`}
      >
        {displayName(player).toUpperCase()}
      </span>
      {hasVeto && (
        <span
          className="text-trim border-2 border-event px-[0.6em] py-[0.4em] font-pixel text-event"
          style={{ fontSize: TAG_SIZE }}
          data-testid={`veto-pill-${player}`}
        >
          VETO READY
        </span>
      )}
      {lossCost > 0 && (
        <span
          className="text-trim border-2 border-p2-alt2 px-[0.6em] py-[0.4em] font-pixel text-p2-alt2"
          style={{ fontSize: TAG_SIZE }}
        >
          LOSS COSTS {lossCost}
        </span>
      )}
    </div>
  );
  return (
    <Panel className="flex min-w-0 flex-col">
      {/* PLAYER HEADER */}
      <div
        className={`flex items-center px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "justify-end border-r-[6px] border-r-p2"}`}
      >
        {name}
      </div>

      {(swapped || penalty > 0) && (
        <div className="flex flex-col gap-3 px-5 pt-2">
          {swapped && (
            <Notice
              className="border-event bg-event-plate text-event-light"
              title="ARMORY SWAP"
              icon="◆"
            >
              Playing {displayName(isP1 ? "p2" : "p1")}’s squad
            </Notice>
          )}
          {penalty > 0 && (
            <Notice
              className="border-p2 bg-ink text-p2-alt2"
              title="LAG SPIKE"
            >
              +{penalty}s added to your time
            </Notice>
          )}
        </div>
      )}

      {/* ROUND SQUAD */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {Array.from({ length: Math.max(squad.length, 3) }, (_, i) => i).map(
          (index) => {
            const agent = selectedAgents[index];
            const shown = agent ? displayForm(agent, morphs, pool) : null;
            return (
              <div
                key={index}
                className={`relative h-[clamp(170px,32vh,520px)] min-w-0 ${agent ? background : "bg-chrome"}`}
                style={{ ...CHAMFER_VARS, clipPath: CHAMFER }}
              >
                <div
                  className={`absolute inset-[2px] overflow-hidden ${agent ? "bg-chrome" : "bg-chrome-fill"}`}
                  style={{ clipPath: CHAMFER_INNER, backgroundImage: EMPTY_TEXTURE }}
                >
                  {agent && shown ? (
                    <>
                      <img
                        src={agentFullArtUrl(shown.agent)}
                        alt={shown.agent.name}
                        loading="eager"
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex flex-col">
                        {squadOvertime.includes(agent.id) && (
                          <span
                            className={FORM_STRIP}
                            style={{ fontSize: TAG_SIZE }}
                          >
                            ◆ OVERTIME
                          </span>
                        )}
                        {isMorphItem(agent.id) && shown.via && (
                          <span
                            className={FORM_STRIP}
                            style={{ fontSize: TAG_SIZE }}
                          >
                            ◆ {shown.via.toUpperCase()}
                          </span>
                        )}
                        <div className={`px-2 py-[1em] text-center ${background}`}>
                          <span className="text-trim break-words font-mono text-[clamp(14px,1.25vw,32px)] font-bold leading-none text-ink">
                            {shown!.agent.name}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-trim font-pixel text-lavender text-[clamp(9px,0.7vw,18px)]">
                        NO AGENT
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* TIME / REMOVAL */}
      {isRemoving ? (
        <RemovalPanel
          player={player}
          roster={roster}
          overtime={immune[player]}
          preset={preset}
          pendingRemoval={pendingRemoval}
          removalSelection={removalSelection}
          onToggleRemoval={onToggleRemoval}
          onConfirmRemoval={onConfirmRemoval}
        />
      ) : pendingRemoval ? (
        <div className="mx-5 mb-4 flex items-center justify-center border-2 border-chrome bg-chrome-fill py-5">
          <span className="text-trim font-pixel tracking-widest text-lavender text-[clamp(11px,0.9vw,22px)]">
            AWAITING REMOVAL
          </span>
        </div>
      ) : (
        <TimeEntry
          player={player}
          input={input}
          locked={locked}
          onTimeChange={onTimeChange}
          onConfirmTime={onConfirmTime}
        />
      )}

      {/* ROSTER */}
      <Panel className={`mx-5 mb-5 p-4 ${isRemoving ? "hidden" : ""}`}>
        <div ref={rosterRef}>
          <div
            className="grid justify-center"
            style={{
              gridTemplateColumns: `repeat(${ROSTER_COLUMNS}, ${rosterCardSize}px)`,
              gap: ROSTER_GAP,
            }}
          >
            {roster.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                size={rosterCardSize}
                unavailable={!squad.includes(agent.id)}
                tags={immune[player].includes(agent.id) ? ["OVERTIME"] : undefined}
                selection={squad.includes(agent.id) ? player : "none"}
              />
            ))}
          </div>
        </div>
      </Panel>
    </Panel>
  );
}

export function ScoreSubmit({
  pool,
  round,
  totalRounds,
  swapped,
  preset,
  veto,
  lossPenalty,
  bossName,
  overtimeStreak,
  timePenalty,
  immune,
  rosters,
  squads,
  morphs,
  timeInputs,
  submitted,
  onTimeChange,
  onConfirmTime,
  onTimeout,
  pendingRemoval,
  removalSelection,
  onToggleRemoval,
  onConfirmRemoval,
  displayName,
}: ScoreSubmitProps) {
  // A squad can hold Soul Stones / Invitations and, under Armory Swap, the OTHER
  // player's agents, so lookups search both rosters as well as the pool.
  const squadLookup = [...rosters.p1, ...rosters.p2, ...pool];
  const resolved = !!pendingRemoval || (submitted.p1 && submitted.p2);

  // Once one player locks in, the other is capped to the sudden-death window.
  const [suddenDeath, setSuddenDeath] = useState(false);
  const total = suddenDeath
    ? TIMER_CONFIG.scoreSuddenDeathSeconds
    : TIMER_CONFIG.scoreTotalSeconds;
  const turnKey = `score-${round}-${suddenDeath ? "sudden" : "full"}`;
  const timeLeft = useTurnTimer(total, turnKey, !resolved, onTimeout);

  function handleConfirmTime(player: PlayerId) {
    if (!hasTime(timeInputs[player])) return; // nothing entered: don't start the countdown
    onConfirmTime(player);
    const opponent: PlayerId = player === "p1" ? "p2" : "p1";
    if (
      !submitted[opponent] &&
      timeLeft > TIMER_CONFIG.scoreSuddenDeathSeconds
    ) {
      setSuddenDeath(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      {!resolved && (
        <HudStatusPortal>
          <Timer timeLeft={timeLeft} total={total} turnKey={turnKey} />
        </HudStatusPortal>
      )}

      <BossBar
        bossName={bossName}
        overtime={round > totalRounds}
        overtimeStreak={overtimeStreak}
        displayName={displayName}
      />

      <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)]">
        {(["p1", "p2"] as PlayerId[]).map((player) => (
          <PlayerColumn
            key={player}
            player={player}
            roster={rosters[player]}
            pool={squadLookup}
            swapped={swapped}
            preset={preset}
            hasVeto={veto[player]}
            lossCost={lossPenalty[player]}
            penalty={timePenalty[player]}
            squad={squads[player]}
            morphs={morphs[player]}
            immune={immune}
            input={timeInputs[player]}
            locked={submitted[player]}
            displayName={displayName}
            onTimeChange={onTimeChange}
            onConfirmTime={handleConfirmTime}
            pendingRemoval={pendingRemoval}
            removalSelection={removalSelection}
            onToggleRemoval={onToggleRemoval}
            onConfirmRemoval={onConfirmRemoval}
          />
        ))}
      </div>
    </div>
  );
}