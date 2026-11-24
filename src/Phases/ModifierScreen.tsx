import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AgentCard } from "../Components/AgentCard";
import { ArrowIcon } from "../Components/Icons";
import { Panel } from "../Components/Panel";
import type { Agent, PlayerId } from "../types";
import type { ModifierDef } from "../Data/Events/universalModifiers";

const ROSTER_COLUMNS = 6;
const ROSTER_GAP = 12;
const LABEL = "clamp(9px, 0.7vw, 18px)";
const COLUMNS =
  "grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)]";
const BUTTON =
  "text-trim flex w-full items-center justify-center gap-[0.6em] py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors";
const GOLD_BUTTON = "bg-event text-ink hover:bg-event-hover";
const SECRET_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(245,197,24,0.12) 10px 12px)";
const PLAYERS: PlayerId[] = ["p1", "p2"];
const accentOf = (p: PlayerId) => (p === "p1" ? "text-p1" : "text-p2");

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

function RosterGrid({
  roster,
  eliminated,
  overtime,
}: {
  roster: Agent[];
  eliminated: Agent[];
  overtime: string[]; // agents on an Overtime Contract
}) {
  const { ref, size } = useFittedCardSize(ROSTER_COLUMNS, ROSTER_GAP, 0.12);
  // Eliminated agents follow the live ones, greyed. Revived agents are back in the roster.
  const out = eliminated.filter(
    (a, i) =>
      eliminated.findIndex((b) => b.id === a.id) === i &&
      !roster.some((r) => r.id === a.id),
  );
  return (
    <Panel className="pointer-events-none mx-5 mb-5 p-4">
      <div ref={ref}>
        <div
          className="grid justify-center"
          style={{
            gridTemplateColumns: `repeat(${ROSTER_COLUMNS}, ${size}px)`,
            gap: ROSTER_GAP,
          }}
        >
          {roster.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              size={size}
              tags={overtime.includes(agent.id) ? ["OVERTIME"] : undefined}
            />
          ))}
          {out.map((agent) => (
            <AgentCard key={agent.id} agent={agent} size={size} unavailable />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function PlayerColumn({
  player,
  name,
  children,
}: {
  player: PlayerId;
  name: string;
  children: ReactNode;
}) {
  const isP1 = player === "p1";
  return (
    <Panel className="flex min-w-0 flex-col gap-4">
      <div
        className={`flex items-center px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "justify-end border-r-[6px] border-r-p2"}`}
      >
        <span
          className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accentOf(player)}`}
        >
          {name}
        </span>
      </div>
      {children}
    </Panel>
  );
}

function Tag({ children, gold = false }: { children: ReactNode; gold?: boolean }) {
  return (
    <span
      className={`text-trim border-2 px-[0.6em] py-[0.4em] font-pixel tracking-widest ${gold ? "border-event bg-event/15 text-event" : "border-chrome-strong text-lavender-light"
        }`}
      style={{ fontSize: LABEL }}
    >
      {children}
    </span>
  );
}

export function ModifierScreen({
  modifier,
  onAcknowledge,
  revealed = false,
  rosters,
  eliminated,
  immune,
  displayName,
}: {
  modifier: ModifierDef;
  onAcknowledge: () => void;
  revealed?: boolean; // the second showing of a secret modifier: full name and description
  rosters: Record<PlayerId, Agent[]>;
  eliminated: Record<PlayerId, Agent[]>;
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
  displayName: (p: PlayerId | null) => string;
}) {
  // A secret modifier is only "???" the first time round.
  const hidden = !!modifier.secret && !revealed;

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      <div className="flex justify-center">
        <div className="flex w-[min(100%,1200px)] flex-col border-2 border-event bg-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-event bg-event/15 px-5 py-3">
            <span
              className="text-trim font-pixel font-bold tracking-widest text-event"
              style={{ fontSize: "clamp(14px, 1.2vw, 30px)" }}
            >
              ◆ MODIFIER
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {modifier.secret && <Tag gold>{hidden ? "SECRET" : "REVEALED"}</Tag>}
            </div>
          </div>

          <div className="flex flex-col gap-5 px-6 py-6">
            {hidden ? (
              <>
                <div
                  className="flex min-h-[clamp(90px,12vh,200px)] items-center justify-center border-2 border-event/40"
                  style={{ backgroundImage: SECRET_TEXTURE }}
                >
                  <span className="text-trim font-pixel font-bold text-event text-[clamp(40px,4.5vw,120px)]">
                    ???
                  </span>
                </div>
                <span className="text-trim text-text-primary text-[clamp(14px,1.05vw,26px)]">
                  Something unusual might happen...
                </span>
              </>
            ) : (
              <>
                <span className="text-trim font-pixel font-bold text-bright text-[clamp(26px,2.6vw,68px)]">
                  {modifier.title.toUpperCase()}
                </span>
                <span className="block leading-snug text-text-primary text-[clamp(14px,1.15vw,28px)]">
                  {modifier.desc}
                </span>
              </>
            )}
            <button onClick={onAcknowledge} className={`${BUTTON} ${GOLD_BUTTON}`}>
              {revealed ? "START ROUND" : "GOT IT"}
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>

      <div className={COLUMNS}>
        {PLAYERS.map((p) => (
          <PlayerColumn key={p} player={p} name={displayName(p).toUpperCase()}>
            <RosterGrid
              roster={rosters[p]}
              eliminated={eliminated[p]}
              overtime={immune[p]}
            />
          </PlayerColumn>
        ))}
      </div>
    </div>
  );
}