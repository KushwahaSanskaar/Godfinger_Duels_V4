import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AgentCard } from "../Components/AgentCard";
import { ArrowIcon } from "../Components/Icons";
import { Panel } from "../Components/Panel";
import type { Agent, PlayerId } from "../types";

const CARD_GAP = 12;
const LABEL = "clamp(9px, 0.7vw, 18px)";
const COLUMNS =
  "grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)]";
const BUTTON =
  "text-trim flex w-full items-center justify-center gap-[0.6em] py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors";
const GOLD_BUTTON = "bg-event text-ink hover:bg-event-hover";
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

function useFittedCardSize(
  columns: number,
  gap: number,
  viewportShare: number,
  max: number,
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
      max,
    ),
  );
  return { ref, size };
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

function CardRow({
  agents,
  viewportShare,
  max,
  testId,
}: {
  agents: (Agent | undefined)[];
  viewportShare: number;
  max: number;
  testId?: string;
}) {
  const { ref, size } = useFittedCardSize(Math.max(agents.length, 1), CARD_GAP, viewportShare, max);
  return (
    <div ref={ref} data-testid={testId}>
      <div className="flex justify-center" style={{ gap: CARD_GAP }}>
        {agents.map((a) => (a ? <AgentCard key={a.id} agent={a} size={size} /> : null))}
      </div>
    </div>
  );
}

function PlayerColumn({
  player,
  name,
  agents,
}: {
  player: PlayerId;
  name: string;
  agents: (Agent | undefined)[];
}) {
  const isP1 = player === "p1";
  return (
    <Panel className="flex min-w-0 flex-col gap-4">
      <div
        className={`flex items-center justify-between gap-3 px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "flex-row-reverse border-r-[6px] border-r-p2"}`}
      >
        <span
          className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accentOf(player)}`}
        >
          {name}
        </span>
        <Tag gold>PICKED</Tag>
      </div>
      <Panel className="pointer-events-none mx-5 mb-5 p-4">
        <CardRow agents={agents} viewportShare={0.14} max={180} />
      </Panel>
    </Panel>
  );
}

interface PresetScreenProps {
  team: string[]; // the rolled team both players play
  title: string;
  subtitle: string;
  squads: Record<PlayerId, string[]>; // what each player picked (still at stake)
  lookup: Agent[]; // pool plus both rosters
  morphs: Record<PlayerId, Record<string, string>>;
  displayName: (p: PlayerId | null) => string;
  onAcknowledge: () => void;
}

// Preset Teams: after the reveal, the randomly rolled team is shown. It is what both
// players fight with; the squads they picked first are what is lost if they lose.
export function PresetScreen({
  team,
  title,
  subtitle,
  squads,
  lookup,
  morphs,
  displayName,
  onAcknowledge,
}: PresetScreenProps) {
  const find = (id: string) => lookup.find((a) => a.id === id);
  const form = (p: PlayerId, id: string) => find(morphs[p]?.[id] ?? id) ?? find(id);

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      <div className="flex justify-center">
        <div className="flex w-[min(100%,1200px)] flex-col border-2 border-event bg-ink">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-event bg-event/15 px-5 py-3">
            <span
              className="text-trim font-pixel font-bold tracking-widest text-event"
              style={{ fontSize: "clamp(14px, 1.2vw, 30px)" }}
            >
              ◆ {title}
            </span>
          </div>

          <div className="flex flex-col gap-5 px-6 py-6">
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-8">
              <div className="flex flex-col gap-4">
                <span className="text-trim font-pixel font-bold text-bright text-[clamp(20px,2vw,50px)]">
                  {subtitle}
                </span>
                <span className="block leading-snug text-text-primary text-[clamp(14px,1.05vw,26px)]">
                  A loss still costs agents from the squads you picked.
                </span>
              </div>
              <Panel className="pointer-events-none p-4">
                <CardRow
                  agents={team.map(find)}
                  viewportShare={0.27}
                  max={240}
                  testId="preset-team"
                />
              </Panel>
            </div>
            <button onClick={onAcknowledge} className={`${BUTTON} ${GOLD_BUTTON}`}>
              START ROUND
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>

      <div className={COLUMNS}>
        {PLAYERS.map((p) => (
          <PlayerColumn
            key={p}
            player={p}
            name={displayName(p).toUpperCase()}
            agents={squads[p].map((id) => form(p, id))}
          />
        ))}
      </div>
    </div>
  );
}