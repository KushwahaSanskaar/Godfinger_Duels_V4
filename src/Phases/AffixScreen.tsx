import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AgentCard } from "../Components/AgentCard";
import { ArrowIcon } from "../Components/Icons";
import { Notice } from "../Components/Notice";
import { Panel } from "../Components/Panel";
import type { Agent, AffixChoice, AffixPickSpec, PlayerId } from "../types";
import { describeAffix } from "../Data/Events/affixes";
import type { AffixDef, AffixParties } from "../Data/Events/affixes";
import type { AffixOffer } from "../Logic/interludeRules";
import { PolarityIcon } from "../Components/Icons";

// Each affix sits in the column of the player it lands on, so where a card is says
// who it hits. Polarity only gets its own colour (never blue / red-as-player).
const POLARITY = {
  positive: {
    word: "BOON",
    border: "border-buff",
    header: "border-buff bg-buff/20",
    hover: "hover:bg-buff/20",
    text: "text-buff-light",
    texture:
      "repeating-linear-gradient(135deg, transparent 0 12px, rgba(79,195,204,0.05) 12px 14px)",
  },
  negative: {
    word: "CURSE",
    border: "border-p2-alt2",
    header: "border-p2-alt2 bg-p2-alt2/15",
    hover: "hover:bg-p2-alt2/15",
    text: "text-p2-alt2",
    texture:
      "repeating-linear-gradient(135deg, transparent 0 12px, rgba(255,108,119,0.05) 12px 14px)",
  },
} as const;

const ROSTER_COLUMNS = 6;
const ROSTER_GAP = 12;
const LABEL = "clamp(9px, 0.7vw, 18px)";
const COLUMNS =
  "grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)]";
const BUTTON =
  "text-trim flex w-full items-center justify-center gap-[0.6em] py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors";
const GOLD_BUTTON = "bg-event text-ink hover:bg-event-hover";
const DISABLED_BUTTON =
  "cursor-not-allowed border-2 border-chrome bg-chrome-fill text-lavender";

const accentOf = (p: PlayerId) => (p === "p1" ? "text-p1" : "text-p2");
const PLAYERS: PlayerId[] = ["p1", "p2"];

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

function AffixCard({
  def,
  parties,
  selected = false,
  passed = false,
  wasted = false,
  onSelect,
  action,
}: {
  def: AffixDef | null;
  parties: AffixParties; // whose names / "you" go into the description
  selected?: boolean;
  passed?: boolean; // the option that was not taken (step 2)
  wasted?: boolean; // giving it would do nothing this round
  onSelect?: () => void;
  action?: { label: string; onConfirm: () => void }; // gold bar once selected
}) {
  if (!def) {
    return (
      <div className="mx-5 flex min-h-[clamp(200px,25vh,420px)] items-center justify-center border-2 border-chrome bg-chrome-fill">
        <span
          className="text-trim font-pixel tracking-widest text-lavender"
          style={{ fontSize: LABEL }}
        >
          NOTHING AVAILABLE
        </span>
      </div>
    );
  }
  const t = POLARITY[def.polarity];
  const pickable = !!onSelect;
  return (
    <div
      className={`mx-5 flex flex-col border-2 bg-ink transition-colors ${action ? "min-h-[clamp(240px,34vh,600px)] flex-1" : ""
        } ${selected ? "border-event" : t.border
        } ${passed ? "opacity-40 grayscale" : ""}`}
      style={{ backgroundImage: t.texture }}
    >
      <div
        className={`flex items-center justify-between gap-3 border-b-2 px-5 py-3 ${selected ? "border-event bg-event/15" : t.header}`}
      >
        <span
          className={`text-trim flex items-center gap-[0.6em] font-pixel font-bold tracking-widest ${selected ? "text-event" : t.text}`}
          style={{ fontSize: "clamp(14px, 1.2vw, 30px)" }}
        >
          <PolarityIcon positive={def.polarity === "positive"} />
          {t.word}
        </span>
        <div className="flex items-center gap-3">
          {wasted && (
            <span
              className="text-trim border-2 border-chrome-strong bg-ink px-[0.6em] py-[0.4em] font-pixel tracking-widest text-lavender-light"
              style={{ fontSize: LABEL }}
            >
              NO EFFECT THIS ROUND
            </span>
          )}
          {(selected || passed) && (
            <span
              className={`text-trim font-pixel tracking-widest ${selected ? "text-event" : "text-lavender"}`}
              style={{ fontSize: LABEL }}
            >
              {selected ? "SELECTED" : "PASSED"}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5 py-5">
        <span className="text-trim font-pixel font-bold text-bright text-[clamp(20px,1.9vw,50px)] tracking-tighter">
          {def.title.toUpperCase()}
        </span>
        <span className="block flex-1 leading-snug text-text-primary text-[clamp(13px,1vw,24px)]">
          {describeAffix(def, parties)}
        </span>
        {action &&
          (selected ? (
            <button onClick={action.onConfirm} className={`${BUTTON} ${GOLD_BUTTON}`}>
              {action.label}
            </button>
          ) : (
            <button
              onClick={onSelect}
              disabled={!pickable}
              className={`${BUTTON} border-2 bg-ink/60 ${t.border} ${t.text} ${t.hover}`}
            >
              SELECT
            </button>
          ))}
      </div>
    </div>
  );
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
  role,
  children,
}: {
  player: PlayerId;
  name: string;
  role: string;
  children: ReactNode;
}) {
  const isP1 = player === "p1";
  return (
    <Panel className="flex min-w-0 flex-col gap-4">
      <div
        className={`flex items-center gap-3 px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "flex-row-reverse border-r-[6px] border-r-p2"}`}
      >
        <span
          className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accentOf(player)}`}
        >
          {name}
        </span>
        <span
          className="text-trim border-2 border-chrome px-[0.6em] py-[0.4em] font-pixel tracking-widest text-lavender-light"
          style={{ fontSize: LABEL }}
        >
          {role}
        </span>
      </div>
      {children}
    </Panel>
  );
}

function PickPanel({
  pick,
  target,
  selection,
  onTogglePick,
  confirmButton,
}: {
  pick: AffixPickSpec;
  target: PlayerId;
  selection: string[];
  onTogglePick: (agentId: string) => void;
  confirmButton: ReactNode;
}) {
  const { ref, size } = useFittedCardSize(ROSTER_COLUMNS, ROSTER_GAP, 0.1);
  const full = selection.length >= pick.max;
  return (
    <div className="mx-5 mb-5 flex flex-col gap-3 border-2 border-event bg-event-plate p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-trim font-pixel tracking-wider text-event text-[clamp(11px,0.9vw,24px)]">
          ◆ {pick.label.toUpperCase()}
        </span>
        {pick.max > 0 && (
          <div className="flex shrink-0 gap-[0.4em] text-[clamp(10px,0.8vw,20px)]">
            {Array.from({ length: pick.max }, (_, i) => (
              <span
                key={i}
                className={`h-[1em] w-[1em] border-2 ${i < selection.length
                    ? target === "p1"
                      ? "border-p1 bg-p1"
                      : "border-p2 bg-p2"
                    : "border-event"
                  }`}
              />
            ))}
          </div>
        )}
      </div>
      <div ref={ref}>
        <div className="flex flex-wrap justify-center" style={{ gap: ROSTER_GAP }}>
          {pick.candidates.map((agent) => {
            const selected = selection.includes(agent.id);
            return (
              <AgentCard
                key={agent.id}
                agent={agent}
                size={size}
                // once the list is full, every other agent greys out
                unavailable={full && !selected}
                selection={selected ? target : "none"}
                onClick={() => onTogglePick(agent.id)}
              />
            );
          })}
        </div>
      </div>
      {confirmButton}
    </div>
  );
}

interface AffixScreenProps {
  offer: AffixOffer;
  rosters: Record<PlayerId, Agent[]>;
  eliminated: Record<PlayerId, Agent[]>; // agents knocked out of each roster so far
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
  choice: AffixChoice | null;
  pick: AffixPickSpec | null;
  selection: string[];
  necroStage: "sacrifice" | "revive";
  displayName: (p: PlayerId | null) => string;
  onChoose: (kind: "positive" | "negative") => void;
  onTogglePick: (agentId: string) => void;
  onConfirm: () => void;
}

export function AffixScreen({
  offer,
  rosters,
  eliminated,
  immune,
  choice,
  pick,
  selection,
  necroStage,
  displayName,
  onChoose,
  onTogglePick,
  onConfirm,
}: AffixScreenProps) {
  const { chooser, leader } = offer;
  const name = (p: PlayerId) => displayName(p).toUpperCase();
  // Picking is done from the trailing player's side; once chosen, the shared
  // screen names both players.
  const parties = (viewer: AffixParties["viewer"]): AffixParties => ({
    leader: displayName(leader),
    trailer: displayName(chooser),
    viewer,
  });
  const [picked, setPicked] = useState<"positive" | "negative" | null>(null);

  // ---------- step 1: the losing player chooses ----------
  if (!choice) {
    const cardFor = (p: PlayerId) =>
      p === chooser ? (
        <AffixCard
          def={offer.positive}
          parties={parties("trailer")}
          selected={picked === "positive"}
          onSelect={offer.positive ? () => setPicked("positive") : undefined}
          action={{ label: "KEEP IT", onConfirm: () => onChoose("positive") }}
        />
      ) : (
        <AffixCard
          def={offer.negative}
          parties={parties("trailer")}
          wasted={offer.negativeWasted}
          selected={picked === "negative"}
          onSelect={offer.negative ? () => setPicked("negative") : undefined}
          action={{
            label: `SEND TO ${name(leader)}`,
            onConfirm: () => onChoose("negative"),
          }}
        />
      );

    return (
      <div className="flex w-full flex-col gap-4 pb-3">
        <div className="flex justify-center">
          <Panel className="px-5 py-3">
            <span className="text-trim font-pixel font-bold tracking-wide text-bright text-[clamp(16px,1.5vw,40px)]">
              <span className={accentOf(chooser)}>{name(chooser)}</span>, TAKE A
              BOON OR HIT{" "}
              <span className={accentOf(leader)}>{name(leader)}</span>
            </span>
          </Panel>
        </div>

        <div className={COLUMNS}>
          {PLAYERS.map((p) => (
            <PlayerColumn
              key={p}
              player={p}
              name={name(p)}
              role={p === chooser ? "CHOOSING" : "LEADING"}
            >
              {cardFor(p)}
              <RosterGrid roster={rosters[p]} eliminated={eliminated[p]}
                overtime={immune[p]}
              />
            </PlayerColumn>
          ))}
        </div>
      </div>
    );
  }

  // ---------- step 2: the chosen affix, plus any pick it needs ----------
  const { def, target } = choice;
  const isNecroSacrifice =
    def.id === "spell-of-necromancy" && necroStage === "sacrifice";
  const picking = !!pick && !pick.noEffect;

  let buttonLabel = "CONTINUE";
  let canConfirm = true;
  if (picking) {
    if (isNecroSacrifice) {
      buttonLabel = selection.length === 0 ? "SKIP" : "CONFIRM";
    } else {
      buttonLabel = "CONFIRM";
      canConfirm = selection.length >= pick.min;
    }
  }

  const confirmButton = (
    <button
      onClick={onConfirm}
      disabled={!canConfirm}
      className={`${BUTTON} ${canConfirm ? GOLD_BUTTON : DISABLED_BUTTON}`}
    >
      {buttonLabel}
      {buttonLabel === "CONTINUE" && <ArrowIcon />}
    </button>
  );

  // The option that was not taken stays visible, dimmed, in its own column.
  const passedDef = def.polarity === "positive" ? offer.negative : offer.positive;
  const passedColumn: PlayerId = def.polarity === "positive" ? leader : chooser;

  return (
    <div className="flex w-full flex-col gap-4 pb-3">
      <div className="flex justify-center">
        <Panel className="px-5 py-3">
          <span className="text-trim font-pixel font-bold tracking-wide text-bright text-[clamp(16px,1.5vw,40px)]">
            <span className={accentOf(target)}>{name(target)}</span>
            {def.polarity === "positive" ? " POWERS UP" : " GETS HIT"}
          </span>
        </Panel>
      </div>
      <div className={COLUMNS}>
        {PLAYERS.map((p) => (
          <PlayerColumn
            key={p}
            player={p}
            name={name(p)}
            role={p === target ? "AFFECTED" : "UNAFFECTED"}
          >
            {p === target ? (
              <>
                <AffixCard def={def} parties={parties(null)} />
                {picking ? (
                  <PickPanel
                    pick={pick}
                    target={target}
                    selection={selection}
                    onTogglePick={onTogglePick}
                    confirmButton={confirmButton}
                  />
                ) : (
                  <>
                    {pick?.noEffect && (
                      <div className="mx-5 flex">
                        <Notice
                          className="border-chrome-strong bg-chrome-fill text-lavender-light"
                          title="NO EFFECT"
                          icon="◆"
                        >
                          {pick.label}
                        </Notice>
                      </div>
                    )}
                    <div className="mx-5">{confirmButton}</div>
                    <RosterGrid roster={rosters[p]} eliminated={eliminated[p]}
                      overtime={immune[p]}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {p === passedColumn && passedDef && (
                  <AffixCard def={passedDef} parties={parties(null)} passed />
                )}
                <RosterGrid roster={rosters[p]} eliminated={eliminated[p]}
                  overtime={immune[p]}
                />
              </>
            )}
          </PlayerColumn>
        ))}
      </div>
    </div>
  );
}