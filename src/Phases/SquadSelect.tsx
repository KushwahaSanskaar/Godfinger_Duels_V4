import { useTurnTimer } from "../Hooks/useTurnTimer";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Agent, PlayerId, RoundEffects } from "../types";
import { AgentCard } from "../Components/AgentCard";
import { MorphPicker } from "../Components/MorphPicker";
import { MORPH_ITEMS, displayForm, isMorphItem } from "../Data/morphItems";
import { TIMER_CONFIG } from "../Data/timers";
import { roundLabel } from "../Data/modes";

interface SquadSelectProps {
  round: number;
  totalRounds: number;
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
}

// "Choose your opponent's last agent". `controller` picks from `target`'s roster.
function ControlPanel({
  round,
  controller,
  target,
  targetRoster,
  grayed,
  selectedId,
  eligible,
  displayName,
  onToggle,
  onConfirm,
  onTimeout,
}: {
  round: number;
  controller: PlayerId;
  target: PlayerId;
  targetRoster: Agent[];
  grayed: Record<string, number>;
  selectedId: string | null;
  eligible: (agentId: string) => boolean;
  displayName: (p: PlayerId | null) => string;
  onToggle: (controller: PlayerId, agent: Agent) => void;
  onConfirm: (controller: PlayerId) => void;
  onTimeout: (controller: PlayerId) => void;
}) {
  const timeLeft = useTurnTimer(
    TIMER_CONFIG.squadSeconds,
    `control-${round}-${controller}`,
    true,
    () => onTimeout(controller),
  );
  const targetAccent = target === "p1" ? "text-p1" : "text-p2";
  const bg = controller === "p1" ? "bg-p1" : "bg-p2";
  return (
    <div className="mx-5 mb-5 border-2 border-event bg-[#29251C] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-pixel text-sm text-event">
          CHOOSE <span className={targetAccent}>{displayName(target).toUpperCase()}</span>’S LAST AGENT
        </span>
        <span className={`font-pixel text-lg ${timeLeft <= 10 ? "text-p2" : "text-text-primary"}`}>
          0:{timeLeft.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-3 w-fit mx-auto">
        {targetRoster.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            size={96}
            unavailable={selectedId !== agent.id && !eligible(agent.id)}
            cooldown={grayed[agent.id] ?? 0}
            selection={selectedId === agent.id ? target : "none"}
            onClick={() => onToggle(controller, agent)}
          />
        ))}
      </div>
      <button
        onClick={() => onConfirm(controller)}
        disabled={!selectedId}
        className={`w-full py-3 font-pixel font-bold text-sm tracking-widest text-white ${bg} ${
          selectedId ? "hover:opacity-80" : "opacity-20 cursor-not-allowed"
        }`}
      >
        LOCK IT IN
      </button>
    </div>
  );
}

function SquadColumn({
  round,
  player,
  roster,
  squad,
  mainSize,
  hasControlSlot,
  forcedId,
  controlPanel,
  confirmed,
  grayed,
  eligible,
  displayName,
  onToggleAgent,
  onConfirmSquad,
  onTimeout,
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
  round: number;
  player: PlayerId;
  roster: Agent[];
  squad: string[];
  mainSize: number; // how many agents this player picks themselves
  hasControlSlot: boolean; // the last slot is chosen by the opponent
  forcedId: string | null; // Tunnel Vision: this agent is locked into the squad
  controlPanel?: ReactNode;
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

  const timeLeft = useTurnTimer(
    TIMER_CONFIG.squadSeconds,
    `squad-${round}-${player}`,
    !confirmed,
    () => onTimeout(player),
  );
  const selectedAgents = squad.map(
    (id) => roster.find((agent) => agent.id === id)
  );
  // which Soul Stone / Invitation the popup is open for
  const [morphFor, setMorphFor] = useState<string | null>(null);
  const morphItem = morphFor ? roster.find((a) => a.id === morphFor) : undefined;
  const needsForm = squad.some((id) => isMorphItem(id) && !morphChoices[id]);
  const canConfirm = !confirmed && squad.length === mainSize && !needsForm;

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
            {squad.length}/{mainSize}
            {hasControlSlot && " + 1 CHOSEN BY OPPONENT"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-[600px] mx-auto w-full">
          {[0, 1, 2].map((index) => {
            const agent = selectedAgents[index];
            const shown = agent ? displayForm(agent, morphChoices, pool) : null;
            const isItem = !!agent && isMorphItem(agent.id);

            return (
              <div
                key={index}
                onClick={!confirmed && isItem ? () => setMorphFor(agent!.id) : undefined}
                className={`
                  relative min-w-0 aspect-[3/4]
                  ${!confirmed && isItem ? "cursor-pointer" : ""}
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
                      src={`/agents/agents_full/${shown!.agent.art ?? shown!.agent.id}_full.webp`}
                      alt={shown!.agent.name}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />

                    {isItem && (
                      <span className="absolute top-1 right-1 bg-event text-[#141420] font-pixel text-[10px] px-1">
                        {shown!.via ? shown!.via.toUpperCase() : "CHOOSE FORM"}
                      </span>
                    )}

                    {agent.id === forcedId && (
                      <span className="absolute top-1 left-1 bg-event text-[#141420] font-pixel text-[10px] px-1">
                        FORCED
                      </span>
                    )}

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
                        {shown!.agent.name}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="font-pixel text-4xl text-[#45455C]">
                      +
                    </span>

                    <span className="font-pixel text-[10px] text-[#66667D] text-center">
                      {hasControlSlot && index === 2 ? "OPPONENT PICKS" : `SLOT ${index + 1}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {controlPanel}

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
                  (!isEligible || squad.length >= mainSize)
                }
                cooldown={grayed[agent.id] ?? 0}
                selection={inSquad ? player : "none"}
                onClick={
                  confirmed
                    ? undefined
                    : () => {
                        // Soul Stone / Invitation: the popup decides what it becomes. Taking
                        // one out of the squad again is a normal click.
                        if (isMorphItem(agent.id) && (!inSquad || agent.id === forcedId)) {
                          setMorphFor(agent.id);
                        } else {
                          onToggleAgent(player, agent);
                        }
                      }
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
          disabled={!canConfirm}
          className={`
            w-full py-4
            font-pixel font-bold text-sm
            tracking-widest text-white
            transition-opacity
            ${background}
            ${canConfirm ? "hover:opacity-80" : "opacity-20 cursor-not-allowed"}
          `}
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
    </section>
  );
}

export function SquadSelect({
  round,
  totalRounds,
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
}: SquadSelectProps) {
  const mod = effects.modifier?.id;
  const mc = effects.affix?.id === "mind-control" ? effects.affix.target : null;
  const hint =
    mod === "tunnel-vision"
      ? "TUNNEL VISION — 1 AGENT IS FORCED ON EACH SQUAD · CHOOSE THE OTHER 2"
      : mod === "puppeteer"
      ? "PUPPETEER — LOCK IN 2 AGENTS, THEN CHOOSE 1 FOR YOUR OPPONENT"
      : mod === "armory-swap"
      ? "ARMORY SWAP — PICK 3, THEN THE SQUADS SWAP FOR THE BATTLE"
      : mc
      ? `MIND CONTROL — ${displayName(mc).toUpperCase()} LOCKS 2 AGENTS, THEN ${displayName(
          mc === "p1" ? "p2" : "p1",
        ).toUpperCase()} CHOOSES THEIR 3RD`
      : null;
  const panelFor = (p: PlayerId) => {
    const target: PlayerId = p === "p1" ? "p2" : "p1";
    if (!squadPlan.controlOpen[target]) return undefined;
    return (
      <ControlPanel
        round={round}
        controller={p}
        target={target}
        targetRoster={rosters[target]}
        grayed={grayedOut[target]}
        selectedId={squadPlan.controlPicks[target]}
        eligible={(id) => isControlEligible(p, id)}
        displayName={displayName}
        onToggle={onToggleControl}
        onConfirm={onConfirmControl}
        onTimeout={onControlTimeout}
      />
    );
  };
  return (
    <div className="w-full flex flex-col gap-6 py-3">
      {/* ROUND HEADING */}
      <div className="flex flex-col items-center gap-1">
        <span className="font-pixel text-lg text-text-primary text-center">
          {roundLabel(round, totalRounds)}
        </span>

        <span className="font-pixel text-sm text-text-muted tracking-widest">
          SQUAD SELECTION
        </span>
        {hint && <span className="font-pixel text-xs text-event text-center">{hint}</span>}
      </div>

      {/* TWO PLAYER PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
        <SquadColumn
          round={round}
          player="p1"
          roster={rosters.p1}
          squad={squads.p1}
          mainSize={squadPlan.mainSize.p1}
          hasControlSlot={squadPlan.hasControlSlot.p1}
          forcedId={squadPlan.forced.p1}
          controlPanel={panelFor("p1")}
          confirmed={squadsConfirmed.p1}
          grayed={grayedOut.p1}
          eligible={(id) => isSquadEligible("p1", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          onTimeout={onTimeoutForPlayer}
          pool={pool}
          banned={banned}
          morphChoices={morphChoices.p1}
          morphOptionsFor={morphOptionsFor}
          onChooseMorph={onChooseMorph}
        />
        <SquadColumn
          round={round}
          player="p2"
          roster={rosters.p2}
          squad={squads.p2}
          mainSize={squadPlan.mainSize.p2}
          hasControlSlot={squadPlan.hasControlSlot.p2}
          forcedId={squadPlan.forced.p2}
          controlPanel={panelFor("p2")}
          confirmed={squadsConfirmed.p2}
          grayed={grayedOut.p2}
          eligible={(id) => isSquadEligible("p2", id)}
          displayName={displayName}
          onToggleAgent={onToggleAgent}
          onConfirmSquad={onConfirmSquad}
          onTimeout={onTimeoutForPlayer}
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
