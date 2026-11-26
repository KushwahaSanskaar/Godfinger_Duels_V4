import type { Agent, Mode, PlayerId } from "../types";
import { agentArtUrl } from "../Logic/agentArt";
import { MODES } from "../Data/modes";
import { useLayoutEffect, useRef, useState } from "react";
import { Wipe } from "../Components/Wipe";


function getGlobalPickNumbers(mode: Mode, player: PlayerId): number[] {
  const result: number[] = [];
  let global = 1;
  for (const segment of MODES[mode].draftScript) {
    if (segment.type !== "pick") continue;
    for (let i = 0; i < (segment.count ?? 0); i++) {
      if (segment.player === player) result.push(global);
      global++;
    }
  }
  return result;
}

function useNewlyFilledSlots(roster: Agent[]): {
  animating: Set<number>;
  revealed: Set<number>;
} {
  const prevLengthRef = useRef(roster.length);
  const [animating, setAnimating] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  useLayoutEffect(() => {
    const prev = prevLengthRef.current;
    const curr = roster.length;
    if (curr > prev) {
      const filled = new Set<number>();
      for (let i = prev; i < curr; i++) filled.add(i);
      setAnimating(filled);
      const revealTimer = setTimeout(() => setRevealed(filled), 600);
      const clearTimer = setTimeout(() => {
        setAnimating(new Set());
        setRevealed(new Set());
      }, 800);
      prevLengthRef.current = curr;
      return () => {
        clearTimeout(revealTimer);
        clearTimeout(clearTimer);
      };
    }
    prevLengthRef.current = curr;
  }, [roster.length]);

  return { animating, revealed };
}

interface SlotProps {
  index: number;
  agent: Agent | null;
  globalPickNumber: number;
  player: PlayerId;
  animating?: boolean;
  revealed?: boolean;
  pendingAgent: Agent | null;
  nextUp: boolean;
  picking: boolean;
}

function Slot({
  index,
  agent,
  globalPickNumber,
  player,
  animating,
  revealed,
  pendingAgent,
  nextUp,
  picking,
}: SlotProps) {
  const isP1 = player === "p1";
  const filled = agent !== null;
  const showFilled = filled && (!animating || revealed);
  const placeholder = pendingAgent ?? agent;
  const showPending = !showFilled && placeholder != null;
  const peeking = picking || (filled && animating);
  const slotNumber = String(index + 1).padStart(2, "0");
  const pickNumber = String(globalPickNumber).padStart(2, "0");
  const accentColor = isP1 ? "#3A8EF6" : "#E63946";
  const borderColor = isP1 ? "border-p1" : "border-p2";
  const stateLabel =
    showFilled || showPending
      ? null
      : picking
        ? "PICKING"
        : nextUp
          ? "NEXT UP"
          : null;

  return (
    <div
      className={`relative flex items-stretch h-[clamp(48px,3.6vw,136px)] overflow-hidden transition-transform duration-[250ms] ease-out ${peeking ? (isP1 ? "translate-x-3" : "-translate-x-3") : ""} ${showFilled ? `border-2 ${borderColor}` : picking ? "border-2 border-event" : filled ? "border-2 border-transparent" : nextUp ? "" : "opacity-40"}`}
    >
      <div className="absolute inset-0 bg-unavailable" />

      {animating && <Wipe tone={isP1 ? "text-p1" : "text-p2"} duration={800} reverse={!isP1} />}

      <span
        className={`text-trim relative z-10 text-[clamp(11px,0.85vw,32px)] text-text-muted flex-shrink-0 w-[clamp(20px,1.5vw,58px)] flex items-center font-sans ${isP1 ? "justify-start pl-[clamp(3px,0.4vw,16px)]" : "justify-end pr-[clamp(3px,0.4vw,16px)] order-last"}`}
      >
        {slotNumber}
      </span>

      <div
        className={`relative z-10 flex-1 flex flex-col justify-center px-[clamp(4px,0.55vw,22px)] ${isP1 ? "text-left" : "text-right"}`}
      >
        {stateLabel ? (
          <span
            className={`text-trim font-pixel tracking-wider px-[clamp(5px,.5vw,14px)] py-[clamp(3px,.3vw,8px)] text-[clamp(9px,.7vw,26px)] ${isP1 ? "self-start" : "self-end"} ${picking ? "border-2 border-event bg-event text-ink" : "border-2 border-event bg-event/10 text-event"}`}
          >
            {stateLabel}
          </span>
        ) : (
          <p
            className={`text-trim ${showFilled || showPending ? "text-[clamp(10px,0.78vw,30px)]" : "text-[clamp(12px,0.95vw,36px)]"} font-bold leading-none ${showPending && !showFilled ? "text-text-muted" : filled ? "text-text-primary" : "text-text-muted"} font-sans`}
          >
            {showFilled
              ? agent!.name
              : showPending
                ? placeholder!.name
                : (player === "p1" ? "\\".repeat(10) : "/".repeat(10))}
          </p>
        )}
        {(showFilled || showPending) && (
          <p className="text-trim text-[clamp(9px,0.67vw,26px)] text-text-muted leading-none mt-[clamp(3px,0.45vw,16px)]">
            {showFilled ? agent!.specialty : placeholder!.specialty}
          </p>
        )}
      </div>

      <div
        className={`relative z-10 w-[clamp(66px,5vw,192px)] flex-shrink-0 overflow-hidden ${isP1 ? "order-last" : "order-first"}`}
        style={{
          clipPath: isP1
            ? "polygon(0% 0%, 100% 0%, 100% 100%, 25% 100%)"
            : "polygon(0% 0%, 100% 0%, 75% 100%, 0% 100%)",
          backgroundColor: accentColor + "33",
        }}
      >
        {showFilled ? (
          <img
            src={agentArtUrl(agent!)}
            alt={agent!.name}
            className="w-full h-full object-cover object-center scale-150"
          />
        ) : showPending ? (
          <img
            src={agentArtUrl(placeholder!)}
            alt={placeholder!.name}
            className="w-full h-full object-cover object-center scale-150 grayscale opacity-50"
          />
        ) : (
          <span
            className="text-trim absolute inset-0 flex items-center justify-center text-[clamp(38px,3.75vw,144px)] leading-none font-black text-text-primary"
            style={{ fontFamily: "Lexend, sans-serif" }}
          >
            {pickNumber}
          </span>
        )}
      </div>
    </div>
  );
}

interface PlayerListProps {
  player: PlayerId;
  roster: Agent[];
  globalPickNumbers: number[];
  picksPerPlayer: number;
  displayName: string;
  pendingAgent: Agent | null;
  nextUpIndex: number | null;
  pickingIndex: number | null;
}

function PlayerList({
  player,
  roster,
  globalPickNumbers,
  picksPerPlayer,
  displayName,
  pendingAgent,
  nextUpIndex,
  pickingIndex,
}: PlayerListProps) {
  const isP1 = player === "p1";
  const accentColor = isP1 ? "#3A8EF6" : "#E63946";
  const textColor = isP1 ? "text-p1" : "text-p2";
  const { animating: newlyFilled, revealed: newlyRevealed } =
    useNewlyFilledSlots(roster);
  const slots = Array.from(
    { length: picksPerPlayer },
    (_, i) => roster[i] ?? null,
  );
  const nextEmptyIndex = roster.length;

  return (
    <div className="flex flex-col gap-[clamp(4px,0.3vw,12px)]">
      <div
        className={`relative mb-[clamp(4px,0.3vw,12px)] flex h-[clamp(30px,2vw,76px)] items-center justify-between overflow-hidden px-[clamp(10px,0.9vw,34px)] ${isP1 ? "pr-[clamp(20px,1.7vw,64px)]" : "flex-row-reverse pl-[clamp(20px,1.7vw,64px)]"}`}
        style={{
          backgroundColor: accentColor,
          clipPath: isP1
            ? "polygon(0% 0%, 92.5% 0%, 100% 100%, 0% 100%)"
            : "polygon(7.5% 0%, 100% 0%, 100% 100%, 0% 100%)",
        }}
      >
        <span className="text-trim font-sans font-bold text-ink text-[clamp(12px,0.95vw,36px)] tracking-tighest">
          {displayName.toUpperCase()}
        </span>
        <span className="text-trim font-pixel text-ink text-[clamp(10px,0.75vw,28px)]">
          {String(roster.length).padStart(2, "0")}/{picksPerPlayer}
        </span>
      </div>

      {slots.map((agent, i) => (
        <Slot
          key={i}
          index={i}
          agent={agent}
          globalPickNumber={globalPickNumbers[i] ?? i + 1}
          animating={newlyFilled.has(i)}
          revealed={newlyRevealed.has(i)}
          player={player}
          pendingAgent={i === nextEmptyIndex ? pendingAgent : null}
          nextUp={i === nextUpIndex}
          picking={i === pickingIndex}
        />
      ))}
    </div>
  );
}

export function PickList({
  rosters,
  mode,
  picksPerPlayer,
  displayName,
  player,
  pendingAgent,
  nextUpIndex,
  pickingIndex,
}: {
  rosters: Record<PlayerId, Agent[]>;
  mode: Mode;
  picksPerPlayer: number;
  displayName: (p: PlayerId | null) => string;
  player: PlayerId;
  pendingAgent?: Agent | null;
  nextUpIndex: number | null;
  pickingIndex: number | null;
}) {
  const picks = getGlobalPickNumbers(mode, player);

  return (
    <PlayerList
      player={player}
      roster={rosters[player]}
      globalPickNumbers={picks}
      picksPerPlayer={picksPerPlayer}
      displayName={displayName(player)}
      pendingAgent={pendingAgent ?? null}
      nextUpIndex={nextUpIndex}
      pickingIndex={pickingIndex}
    />
  );
}