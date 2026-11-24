import { useTurnTimer } from "../Hooks/useTurnTimer";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Agent, PlayerId, RoundEffects } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { MorphPicker } from "../Components/MorphPicker";
import { MORPH_ITEMS, displayForm, isMorphItem } from "../Data/morphItems";
import { TIMER_CONFIG } from "../Data/timers";
import { Notice } from "../Components/Notice";
import { Panel } from "../Components/Panel";
import { Timer } from "../Components/Timer";
import { HudStatusPortal } from "../Components/HudStatusPortal";
import { OVERTIME_STREAK_TO_WIN } from "../Data/modes";
import { SQUAD_SIZE } from "../Logic/squadRules";
import { InfoIcon } from "../Components/Icons";
import { Wipe } from "../Components/Wipe";

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
  // Soul Stone / Invitation popup
  pool: Agent[];
  banned: string[];
  morphChoices: Record<PlayerId, Record<string, string>>;
  morphOptionsFor: (player: PlayerId, itemId: string) => Agent[];
  onChooseMorph: (player: PlayerId, itemId: string, agentId: string) => void;
  // opponent-chosen last slot (Puppeteer / Mind Control)
  effects: RoundEffects;
  squadPlan: {
    mainSize: Record<PlayerId, number>;
    hasControlSlot: Record<PlayerId, boolean>;
    controlOpen: Record<PlayerId, boolean>;
    controlPicks: Record<PlayerId, string | null>;
    controlLocked: Record<PlayerId, boolean>;
    forced: Record<PlayerId, string | null>;
  };
  isControlEligible: (controller: PlayerId, agentId: string) => boolean;
  onToggleControl: (controller: PlayerId, agent: Agent) => void;
  onConfirmControl: (controller: PlayerId) => void;
  onControlTimeout: (controller: PlayerId) => void;
  bossName: string | undefined;
  totalRounds: number;
  overtimeStreak: Record<PlayerId, number>;
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
  horizontalActive: Record<PlayerId, boolean>; // Horizontal Investment still restricting
  tiers: Record<PlayerId, Record<string, number>>; // 0 free, 1 already played, 2 cooldown / fatigue
  secretHint?: string | null;
}

const TIP_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.03) 10px 12px)";

// A header chip with an (i) that shows `tip` on hover. `align` keeps the popup
// inside the panel: "left" for P1's header, "right" for P2's.
function InfoChip({
  label,
  tip,
  tone,
  align,
}: {
  label: string;
  tip: string;
  tone: string;
  align: "left" | "right";
}) {
  return (
    <span
      className={`group relative flex items-center gap-[0.5em] border-2 px-[0.6em] py-[0.4em] font-pixel ${tone}`}
      style={{ fontSize: TAG_SIZE }}
      tabIndex={0}
    >
      <span className="text-trim">{label}</span>
      <InfoIcon />
      <span
        role="tooltip"
        className={`pointer-events-none absolute top-full z-30 mt-[6px] hidden w-[clamp(240px,18vw,400px)] flex-col gap-[0.7em] border-2 bg-ink px-[1em] py-[0.9em] group-hover:flex group-focus:flex ${tone} ${align === "left" ? "left-[-2px]" : "right-[-2px]"
          }`}
      >
        <span className="text-trim font-pixel tracking-widest">◆ {label}</span>
        <span
          className="font-sans leading-snug text-text-primary"
          style={{ fontSize: "clamp(12px, 0.85vw, 20px)" }}
        >
          {tip}
        </span>
      </span>
    </span>
  );
}

// Strips shown on an agent: Overtime Contract, revived by Necromancy, and a
// fatigued agent that may be picked only because too few rested ones are left.
function tagsFor(
  id: string,
  overtime: string[],
  revived: string[],
  lastResort = false,
  played = false,
) {
  return [
    lastResort && "LAST RESORT",
    played && "PLAYED",
    overtime.includes(id) && "OVERTIME",
    revived.includes(id) && "REVIVED",
  ].filter(Boolean) as string[];
}

const ROSTER_COLUMNS = 6;
const ROSTER_GAP = 12;
const EMPTY_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.05) 10px 12px)";
const CONTROL_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(245,197,24,0.1) 10px 12px)";
const STRIP =
  "text-trim bg-ink/90 py-[0.6em] text-center font-pixel tracking-wider text-lavender-bright";
const CHAMFER_VARS = {
  "--c": "clamp(12px, 1.1vw, 26px)",
} as React.CSSProperties;
const CHAMFER =
  "polygon(0 0, calc(100% - var(--c)) 0, 100% var(--c), 100% 100%, var(--c) 100%, 0 calc(100% - var(--c)))";
const CHAMFER_INNER =
  "polygon(0 0, calc(100% - var(--c) + 1px) 0, 100% calc(var(--c) - 1px), 100% 100%, calc(var(--c) - 1px) 100%, 0 calc(100% + 1px - var(--c)))";
const TAG_SIZE = "clamp(9px, 0.7vw, 18px)";
const WIPE_MS = 1000;
const WIPE_SWAP_MS = 500;
const WIPE_STAGGER_MS = 150;

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

// "Choose your opponent's last agent". `controller` picks from `target`'s roster.
function ControlPanel({
  controller,
  target,
  targetRoster,
  grayed,
  tiers,
  overtime,
  revived,
  selectedId,
  eligible,
  displayName,
  onToggle,
  onConfirm,
}: {
  controller: PlayerId;
  target: PlayerId;
  targetRoster: Agent[];
  grayed: Record<string, number>;
  tiers: Record<string, number>;
  overtime: string[];
  revived: string[];
  selectedId: string | null;
  eligible: (agentId: string) => boolean;
  displayName: (p: PlayerId | null) => string;
  onToggle: (controller: PlayerId, agent: Agent) => void;
  onConfirm: (controller: PlayerId) => void;
}) {
  const targetAccent = target === "p1" ? "text-p1" : "text-p2";
  const { ref, size } = useFittedCardSize(ROSTER_COLUMNS, ROSTER_GAP, 0.075);
  return (
    <div className="mx-5 mb-4 flex flex-col gap-3 border-2 border-event bg-event-plate p-4">
      <span className="text-trim font-pixel text-[clamp(11px,0.9vw,24px)] tracking-wider text-event">
        CHOOSE{" "}
        <span className={targetAccent}>{displayName(target).toUpperCase()}</span>
        'S LAST AGENT
      </span>
      <div ref={ref}>
        <div
          className="grid justify-center"
          style={{
            gridTemplateColumns: `repeat(${ROSTER_COLUMNS}, ${size}px)`,
            gap: ROSTER_GAP,
          }}
        >
          {targetRoster.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              size={size}
              unavailable={selectedId !== agent.id && !eligible(agent.id)}
              cooldown={grayed[agent.id] ?? 0}
              cooldownUsable={(tiers[agent.id] ?? 0) > 0 && eligible(agent.id)}
              tags={tagsFor(
                agent.id,
                overtime,
                revived,
                (tiers[agent.id] ?? 0) > 0 && eligible(agent.id),
                tiers[agent.id] === 1 && !eligible(agent.id),
              )}
              selection={selectedId === agent.id ? target : "none"}
              onClick={() => onToggle(controller, agent)}
            />
          ))}
        </div>
      </div>
      <button
        onClick={() => onConfirm(controller)}
        disabled={!selectedId}
        className={`text-trim w-full py-4 font-pixel font-bold tracking-widest text-[clamp(12px,0.95vw,24px)] transition-colors ${selectedId
          ? "bg-event text-ink hover:bg-event-hover"
          : "cursor-not-allowed border-2 border-chrome bg-chrome-fill text-lavender"
          }`}
      >
        LOCK IT IN
      </button>
    </div>
  );
}

function SquadColumn({
  player,
  roster,
  squad,
  mainSize,
  hasControlSlot,
  forcedId,
  overtime,
  revived,
  horizontal,
  tiers,
  controlPanel,
  confirmed,
  grayed,
  eligible,
  displayName,
  onToggleAgent,
  onConfirmSquad,
  pool,
  banned,
  morphChoices,
  morphOptionsFor,
  onChooseMorph,
}: {
  pool: Agent[];
  banned: string[];
  morphChoices: Record<string, string>; // this player's: item id -> chosen agent id
  morphOptionsFor: (player: PlayerId, itemId: string) => Agent[];
  onChooseMorph: (player: PlayerId, itemId: string, agentId: string) => void;
  player: PlayerId;
  roster: Agent[];
  squad: string[];
  mainSize: number; // how many agents this player picks themselves
  hasControlSlot: boolean; // the last slot is chosen by the opponent
  forcedId: string | null; // Tunnel Vision: this agent is locked into the squad
  overtime: string[]; // agents on an Overtime Contract
  revived: string[]; // Necromancy: at most one of these per squad
  horizontal: boolean; // Horizontal Investment: played agents wait for the rest
  tiers: Record<string, number>; // 0 free, 1 already played, 2 cooldown / fatigue
  controlPanel?: ReactNode;
  confirmed: boolean;
  grayed: Record<string, number>;
  eligible: (agentId: string) => boolean;
  displayName: (p: PlayerId | null) => string;
  onToggleAgent: (player: PlayerId, agent: Agent) => void;
  onConfirmSquad: (player: PlayerId) => void;
}) {
  const isP1 = player === "p1";

  const accent = isP1 ? "text-p1" : "text-p2";
  const border = isP1 ? "border-p1" : "border-p2";
  const background = isP1 ? "bg-p1" : "bg-p2";

  const selectedAgents = squad.map((id) =>
    roster.find((agent) => agent.id === id),
  );
  // which Soul Stone / Invitation the popup is open for
  const [morphFor, setMorphFor] = useState<string | null>(null);
  const morphItem = morphFor
    ? roster.find((a) => a.id === morphFor)
    : undefined;
  const needsForm = squad.some((id) => isMorphItem(id) && !morphChoices[id]);
  const { ref: rosterRef, size: rosterCardSize } = useFittedCardSize(
    ROSTER_COLUMNS,
    ROSTER_GAP,
    0.12,
  );
  const hideRoster = confirmed && !!controlPanel;
  // A held-back agent (played / fatigued) that's in the squad, or may be picked
  // right now because there aren't enough free agents to fill it.
  const lastResort = (id: string) =>
    (tiers[id] ?? 0) > 0 &&
    (squad.includes(id) || (!confirmed && eligible(id)));
  const played = (id: string) =>
    tiers[id] === 1 && !squad.includes(id) && !eligible(id);
  const freeCount = roster.filter((a) => !(tiers[a.id] > 0)).length;
  const fullRoster = roster.length <= SQUAD_SIZE;
  const shortOnFree = !fullRoster && freeCount < mainSize; const canConfirm = !confirmed && squad.length === mainSize && !needsForm;

  const [wipingSlots, setWipingSlots] = useState<number[]>([]);
  const [litSlots, setLitSlots] = useState(confirmed ? 3 : 0);
  const wasConfirmed = useRef(confirmed);

  useLayoutEffect(() => {
    if (confirmed === wasConfirmed.current) return;
    wasConfirmed.current = confirmed;
    if (!confirmed) {
      setWipingSlots([]);
      setLitSlots(0);
      return;
    }
    const timers = [0, 1, 2].flatMap((i) => {
      const start = i * WIPE_STAGGER_MS;
      return [
        setTimeout(() => setWipingSlots((s) => [...s, i]), start),
        setTimeout(() => setLitSlots(i + 1), start + WIPE_SWAP_MS),
        setTimeout(
          () => setWipingSlots((s) => s.filter((n) => n !== i)),
          start + WIPE_MS,
        ),
      ];
    });
    return () => timers.forEach(clearTimeout);
  }, [confirmed]);

  return (
    <Panel className="flex min-w-0 flex-col">
      {/* PLAYER HEADER */}
      <div
        className={`flex items-center gap-3 px-5 py-3 ${isP1 ? "border-l-[6px] border-l-p1" : "flex-row-reverse border-r-[6px] border-r-p2"}`}
      >
        <span
          className={`text-trim font-pixel font-bold text-[clamp(14px,1.2vw,32px)] ${accent}`}
        >
          {displayName(player).toUpperCase()}
        </span>
        {fullRoster && (
          <InfoChip
            label="FULL ROSTER"
            tip="Only 3 agents left; cooldowns and fatigue will no longer apply."
            tone="border-chrome-strong text-lavender-light"
            align={isP1 ? "left" : "right"}
          />
        )}
        {shortOnFree && (
          <InfoChip
            label="NOT ENOUGH FREE AGENTS"
            tip="Pick the free agents first, then the remaining agents unlock as a last resort."
            tone="border-chrome-strong text-lavender-light"
            align={isP1 ? "left" : "right"}
          />
        )}
        {horizontal && (
          <InfoChip
            label="HORIZONTAL INVESTMENT"
            tip="Agents who have already played can’t be re-deployed until the rest of the roster has played."
            tone="border-p2-alt2 text-p2-alt2"
            align={isP1 ? "left" : "right"}
          />
        )}
      </div>

      {/* SELECTED SQUAD */}
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {[0, 1, 2].map((index) => {
          const agent = selectedAgents[index];
          const shown = agent ? displayForm(agent, morphChoices, pool) : null;
          const isItem = !!agent && isMorphItem(agent.id);
          const controlSlot = hasControlSlot && index === 2;

          return (
            <div
              key={index}
              onClick={
                !confirmed && isItem ? () => setMorphFor(agent!.id) : undefined
              }
              className={`relative h-[clamp(170px,32vh,520px)] min-w-0 ${agent ? background : controlSlot ? "bg-event/60" : "bg-chrome"
                } ${!confirmed && isItem ? "cursor-pointer" : ""}`}
              style={{ ...CHAMFER_VARS, clipPath: CHAMFER }}
            >
              <div
                className={`absolute inset-[2px] overflow-hidden ${controlSlot && !agent ? "bg-event-plate" : agent ? "bg-chrome" : "bg-chrome-fill"
                  }`}
                style={{
                  clipPath: CHAMFER_INNER,
                  backgroundImage:
                    controlSlot && !agent ? CONTROL_TEXTURE : EMPTY_TEXTURE,
                }}
              >
                {agent ? (
                  <>
                    {index < litSlots ? (
                      <img
                        src={`/agents/agents_full/${shown!.agent.art ?? shown!.agent.id}_full.webp`}
                        alt={shown!.agent.name}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 bg-plate"
                        style={{
                          WebkitMaskImage: `url(/agents/agents_full/${shown!.agent.art ?? shown!.agent.id}_full.webp)`,
                          maskImage: `url(/agents/agents_full/${shown!.agent.art ?? shown!.agent.id}_full.webp)`,
                          WebkitMaskSize: "cover",
                          maskSize: "cover",
                          WebkitMaskPosition: "top",
                          maskPosition: "top",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                        }}
                      />
                    )}

                    <div className="absolute inset-x-0 bottom-0 flex flex-col">
                      {agent.id === forcedId && (
                        <span className={STRIP} style={{ fontSize: TAG_SIZE }}>
                          ◆ FORCED
                        </span>
                      )}
                      {tagsFor(agent.id, overtime, revived, (tiers[agent.id] ?? 0) > 0).map((tag) => (
                        <span key={tag} className={STRIP} style={{ fontSize: TAG_SIZE }}>
                          ◆ {tag}
                        </span>
                      ))}
                      {isItem && (
                        <span
                          className={`${STRIP} ${shown!.via ? "" : "!text-event"}`}
                          style={{ fontSize: TAG_SIZE }}
                        >
                          ◆ {shown!.via ? shown!.via.toUpperCase() : "CHOOSE FORM"}
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span
                      className={`text-trim font-pixel text-[clamp(28px,2.6vw,72px)] ${controlSlot ? "text-event" : "text-chrome-strong"}`}
                    >
                      {controlSlot ? "?" : "+"}
                    </span>
                    <span
                      className={`text-trim text-center font-pixel text-[clamp(9px,0.7vw,18px)] ${controlSlot ? "text-event" : "text-lavender"}`}
                    >
                      {controlSlot ? "OPPONENT PICKS" : `SLOT ${index + 1}`}
                    </span>
                  </div>
                )}
                {agent && wipingSlots.includes(index) && (
                  <Wipe tone={isP1 ? "text-p1" : "text-p2"} duration={WIPE_MS} reverse={!isP1} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {controlPanel}

      {/* ROSTER */}
      <Panel className={`mx-5 mb-4 p-4 ${hideRoster ? "hidden" : ""}`}>
        <div ref={rosterRef}>
          <div
            className="grid justify-center"
            style={{
              gridTemplateColumns: `repeat(${ROSTER_COLUMNS}, ${rosterCardSize}px)`,
              gap: ROSTER_GAP,
            }}
          >
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
                    (!isEligible || squad.length >= mainSize)
                  }
                  cooldown={grayed[agent.id] ?? 0}
                  cooldownUsable={lastResort(agent.id)}
                  tags={tagsFor(
                    agent.id,
                    overtime,
                    revived,
                    lastResort(agent.id),
                    !confirmed && played(agent.id),
                  )}
                  selection={inSquad ? player : "none"}
                  onClick={
                    confirmed
                      ? undefined
                      : () => {
                        // Soul Stone / Invitation: the popup decides what it becomes. Taking
                        // one out of the squad again is a normal click.
                        if (
                          isMorphItem(agent.id) &&
                          (!inSquad || agent.id === forcedId)
                        ) {
                          setMorphFor(agent.id);
                        } else {
                          onToggleAgent(player, agent);
                        }
                      }
                  }
                  size={rosterCardSize}
                />
              );
            })}
          </div>
        </div>
      </Panel>

      {/* CONFIRM BUTTON */}
      <div className="px-5 pb-5 pt-1">
        <button
          onClick={() => onConfirmSquad(player)}
          disabled={!canConfirm}
          className={`text-trim w-full py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors ${canConfirm
            ? "bg-event text-ink hover:bg-event-hover"
            : confirmed
              ? "border-2 border-event bg-event/10 text-event"
              : "cursor-not-allowed border-2 border-chrome bg-chrome-fill text-lavender"
            }`}
        >
          {confirmed
            ? "LOCKED IN"
            : needsForm && squad.length === mainSize
              ? "CHOOSE A FORM FIRST"
              : "CONFIRM SQUAD"}
        </button>
      </div>

      {morphFor && morphItem && !confirmed && MORPH_ITEMS[morphFor] && (
        <MorphPicker
          item={morphItem}
          note={MORPH_ITEMS[morphFor].note}
          options={morphOptionsFor(player, morphFor)}
          banned={banned}
          player={player}
          playerName={displayName(player)}
          currentId={morphChoices[morphFor]}
          onPick={(agentId) => {
            onChooseMorph(player, morphFor, agentId);
            setMorphFor(null);
          }}
          onClose={() => setMorphFor(null)}
        />
      )}
    </Panel>
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
  pool,
  banned,
  morphChoices,
  morphOptionsFor,
  onChooseMorph,
  effects,
  squadPlan,
  isControlEligible,
  onToggleControl,
  onConfirmControl,
  onControlTimeout,
  bossName,
  totalRounds,
  overtimeStreak,
  immune,
  horizontalActive,
  tiers,
  secretHint,
}: SquadSelectProps) {
  const players: PlayerId[] = ["p1", "p2"];
  const unconfirmed = players.filter((p) => !squadsConfirmed[p]);
  const controllers = players.filter(
    (p) => squadPlan.controlOpen[p === "p1" ? "p2" : "p1"],
  );
  const squadTimeLeft = useTurnTimer(
    TIMER_CONFIG.squadSeconds,
    `squad-${round}`,
    unconfirmed.length > 0,
    () => unconfirmed.forEach(onTimeoutForPlayer),
  );
  const controlTimeLeft = useTurnTimer(
    TIMER_CONFIG.squadSeconds,
    `control-${round}`,
    controllers.length > 0,
    () => controllers.forEach(onControlTimeout),
  );
  const showControlTimer =
    controllers.length > 0 &&
    (unconfirmed.length === 0 || controlTimeLeft <= squadTimeLeft);
  const mod = effects.modifier?.id;
  const mc = effects.affix?.id === "mind-control" ? effects.affix.target : null;
  const otherName = (p: PlayerId) =>
    displayName(p === "p1" ? "p2" : "p1").toUpperCase();
  const hint =
    mod === "tunnel-vision"
      ? {
        title: "TUNNEL VISION",
        body: "1 AGENT IS FORCED ON EACH SQUAD",
      }
      : mc
        ? {
          title: "MIND CONTROL",
          body: `${displayName(mc).toUpperCase()} LOCKS 2 AGENTS, THEN ${otherName(mc)} CHOOSES THEIR 3RD`,
        }
        : secretHint
          ? { title: secretHint, body: null }
          : null;

  const panelFor = (p: PlayerId) => {
    const target: PlayerId = p === "p1" ? "p2" : "p1";
    if (!squadPlan.controlOpen[target]) return undefined;
    return (
      <ControlPanel
        controller={p}
        target={target}
        targetRoster={rosters[target]}
        grayed={grayedOut[target]}
        tiers={tiers[target]}
        overtime={immune[target]}
        revived={effects.revivedLock[target]}
        selectedId={squadPlan.controlPicks[target]}
        eligible={(id) => isControlEligible(p, id)}
        displayName={displayName}
        onToggle={onToggleControl}
        onConfirm={onConfirmControl}
      />
    );
  };
  return (
    <div className="w-full flex flex-col gap-4 pb-3">
      <BossBar
        bossName={bossName}
        overtime={round > totalRounds}
        overtimeStreak={overtimeStreak}
        displayName={displayName}
      />
      <HudStatusPortal>
        <Timer
          timeLeft={showControlTimer ? controlTimeLeft : squadTimeLeft}
          total={TIMER_CONFIG.squadSeconds}
          turnKey={showControlTimer ? `control-${round}` : `squad-${round}`}
        />
      </HudStatusPortal>
      {hint && (
        <div className="flex">
          <Notice
            className="border-event bg-event-plate text-event-light"
            title={hint.title}
            icon="◆"
          >
            {hint.body}
          </Notice>
        </div>
      )}

      {/* TWO PLAYER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-[clamp(48px,7vw,200px)] gap-6 w-full items-stretch">
        <SquadColumn
          player="p1"
          roster={rosters.p1}
          squad={squads.p1}
          mainSize={squadPlan.mainSize.p1}
          hasControlSlot={squadPlan.hasControlSlot.p1}
          forcedId={squadPlan.forced.p1}
          overtime={immune.p1}
          revived={effects.revivedLock.p1}
          horizontal={horizontalActive.p1}
          tiers={tiers.p1}
          controlPanel={panelFor("p1")}
          confirmed={squadsConfirmed.p1}
          grayed={grayedOut.p1}
          eligible={(id) => isSquadEligible("p1", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          pool={pool}
          banned={banned}
          morphChoices={morphChoices.p1}
          morphOptionsFor={morphOptionsFor}
          onChooseMorph={onChooseMorph}
        />
        <SquadColumn
          player="p2"
          roster={rosters.p2}
          squad={squads.p2}
          mainSize={squadPlan.mainSize.p2}
          hasControlSlot={squadPlan.hasControlSlot.p2}
          forcedId={squadPlan.forced.p2}
          overtime={immune.p2}
          revived={effects.revivedLock.p2}
          horizontal={horizontalActive.p2}
          tiers={tiers.p2}
          controlPanel={panelFor("p2")}
          confirmed={squadsConfirmed.p2}
          grayed={grayedOut.p2}
          eligible={(id) => isSquadEligible("p2", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          pool={pool}
          banned={banned}
          morphChoices={morphChoices.p2}
          morphOptionsFor={morphOptionsFor}
          onChooseMorph={onChooseMorph}
        />
      </div>
    </div>
  );
}