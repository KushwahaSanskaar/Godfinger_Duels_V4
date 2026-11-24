import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AgentCard } from "../Components/AgentCard";
import { Panel } from "../Components/Panel";
import type { Agent, PlayerId, RoundLogEntry } from "../types";

const ROSTER_COLUMNS = 6;
const ROSTER_GAP = 12;
const LABEL = "clamp(10px, 0.78vw, 20px)";
const COLUMNS =
  "grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)]";
const BUTTON =
  "text-trim flex w-full items-center justify-center gap-[0.6em] py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors";
const PLAYERS: PlayerId[] = ["p1", "p2"];
const accentOf = (p: PlayerId) => (p === "p1" ? "text-p1" : "text-p2");

const mmss = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(Math.round(total % 60)).padStart(2, "0")}`;

function useViewportHeight() {
  const [height, setHeight] = useState(() => window.innerHeight);
  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return height;
}

function useFittedCardSize(columns: number, gap: number, viewportShare: number) {
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
      160,
    ),
  );
  return { ref, size };
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-trim border-2 border-chrome-strong px-[0.6em] py-[0.4em] font-pixel tracking-widest text-lavender-light"
      style={{ fontSize: LABEL }}
    >
      {children}
    </span>
  );
}

function ResultTag({ result }: { result: "WINNER" | "DEFEAT" | "DRAW" }) {
  if (result !== "WINNER") return <Tag>{result}</Tag>;
  return (
    <span
      className="text-trim bg-event px-[0.8em] py-[0.5em] font-pixel font-bold tracking-widest text-ink"
      style={{ fontSize: LABEL }}
    >
      ◆ WINNER
    </span>
  );
}

function PlayerColumn({
  player,
  name,
  wins,
  result,
  roster,
}: {
  player: PlayerId;
  name: string;
  wins: number;
  result: "WINNER" | "DEFEAT" | "DRAW";
  roster: Agent[];
}) {
  const isP1 = player === "p1";
  const won = result === "WINNER";
  const { ref, size } = useFittedCardSize(ROSTER_COLUMNS, ROSTER_GAP, 0.12);
  return (
    <Panel className={`flex min-w-0 flex-col gap-4 ${won ? "!border-event" : ""}`}>
      <div
        className={`flex items-center justify-between gap-3 px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "flex-row-reverse border-r-[6px] border-r-p2"}`}
      >
        <span
          className={`text-trim truncate font-pixel font-bold text-[clamp(16px,1.6vw,40px)] ${accentOf(player)}`}
        >
          {name}
        </span>
        <ResultTag result={result} />
      </div>

      <div
        className={`flex items-end gap-5 px-5 ${isP1 ? "" : "flex-row-reverse text-right"}`}
      >
        <span
          className={`text-trim font-lexend font-black leading-none text-[clamp(64px,7vw,150px)] ${won ? accentOf(player) : "text-bright"}`}
        >
          {wins}
        </span>
        <div className="flex flex-col gap-2 pb-1">
          <span
            className="text-trim font-pixel tracking-widest text-lavender-light"
            style={{ fontSize: LABEL }}
          >
            ROUNDS WON
          </span>
          <span
            className="text-trim font-pixel tracking-widest text-lavender"
            style={{ fontSize: LABEL }}
          >
            {roster.length} AGENTS SURVIVING
          </span>
        </div>
      </div>

      <Panel className="pointer-events-none mx-5 mb-5 p-4">
        <div ref={ref}>
          {roster.length === 0 ? (
            <div
              className="py-8 text-center font-pixel text-lavender"
              style={{ fontSize: "clamp(12px, 1vw, 22px)" }}
            >
              NO AGENTS LEFT
            </div>
          ) : (
            <div
              className="grid justify-center"
              style={{
                gridTemplateColumns: `repeat(${ROSTER_COLUMNS}, ${size}px)`,
                gap: ROSTER_GAP,
              }}
            >
              {roster.map((agent) => (
                <AgentCard key={agent.id} agent={agent} size={size} selection={player} />
              ))}
            </div>
          )}
        </div>
      </Panel>
    </Panel>
  );
}

function RoundCell({ entry }: { entry: RoundLogEntry }) {
  const edge =
    entry.winner === "p1"
      ? "border-l-p1"
      : entry.winner === "p2"
        ? "border-l-p2"
        : "border-l-chrome-strong";
  const scored = entry.outcome === "score";
  return (
    <div
      className={`flex min-w-0 items-center gap-[0.9em] border-l-[6px] ${edge} bg-ink px-[0.9em] py-[0.7em] font-pixel`}
      style={{ fontSize: LABEL }}
    >
      <span className="text-trim text-bright">R{entry.round}</span>
      <span className="text-trim min-w-0 flex-1 truncate text-lavender-light">
        {entry.boss?.toUpperCase()}
      </span>
      {scored ? (
        <span className="text-trim whitespace-nowrap">
          <span className="text-p1">{mmss(entry.t1)}</span>
          <span className="text-chrome-strong"> / </span>
          <span className="text-p2">{mmss(entry.t2)}</span>
        </span>
      ) : (
        <span className="text-trim text-lavender">TIMEOUT</span>
      )}
    </div>
  );
}

interface GameOverProps {
  winner: PlayerId | null;
  rosters: Record<PlayerId, Agent[]>;
  roundWins: Record<PlayerId, number>;
  roundLog?: RoundLogEntry[];
  displayName: (p: PlayerId | null) => string;
  onReset: () => void;
}

export function GameOver({
  winner,
  rosters,
  roundWins,
  roundLog = [],
  displayName,
  onReset,
}: GameOverProps) {
  const resultOf = (p: PlayerId) =>
    winner === null ? "DRAW" : winner === p ? "WINNER" : "DEFEAT";

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      <div className="flex items-center justify-between gap-3 border-2 border-event bg-event/15 px-5 py-3">
        <span
          className="text-trim font-pixel font-bold tracking-widest text-event"
          style={{ fontSize: "clamp(14px, 1.2vw, 30px)" }}
        >
          ◆ MATCH COMPLETE
        </span>
        <Tag>FINAL RESULT</Tag>
      </div>

      <div className={COLUMNS}>
        {PLAYERS.map((p) => (
          <PlayerColumn
            key={p}
            player={p}
            name={displayName(p).toUpperCase()}
            wins={roundWins[p]}
            result={resultOf(p) as "WINNER" | "DEFEAT" | "DRAW"}
            roster={rosters[p]}
          />
        ))}
      </div>

      {roundLog.length > 0 && (
        <Panel className="flex flex-col gap-4 p-5">
          <span
            className="text-trim font-pixel font-bold tracking-widest text-lavender-light"
            style={{ fontSize: "clamp(12px, 1vw, 24px)" }}
          >
            ROUND LOG
          </span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(clamp(240px,20vw,420px),1fr))] gap-3">
            {roundLog.map((entry, i) => (
              <RoundCell key={`${entry.round}-${i}`} entry={entry} />
            ))}
          </div>
        </Panel>
      )}

      <button
        type="button"
        onClick={onReset}
        className={`${BUTTON} bg-event text-ink hover:bg-event-hover`}
      >
        NEW MATCH
      </button>
    </div>
  );
}