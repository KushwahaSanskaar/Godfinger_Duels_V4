import { useEffect, useState } from "react";
import type {
  Agent,
  AffixChoice,
  AffixPickSpec,
  PendingRemoval,
  PlayerId,
  RoundEffects,
  RoundLogEntry,
  RoundStage,
} from "../types";
import type { Boss } from "../Data/bosses";
import type { ModifierDef } from "../Data/Events/universalModifiers";
import type { AffixOffer } from "../Logic/interludeRules";
import { BossRoll } from "./BossRoll";
import { SquadSelect } from "./SquadSelect";
import { ScoreSubmit } from "./ScoreSubmit";
import { AffixScreen } from "./AffixScreen";
import { ModifierScreen } from "./ModifierScreen";
import { PresetScreen } from "./PresetScreen";
import { DejaVuScreen } from "./DejaVuScreen";
import { UNIVERSAL_MODIFIERS, SECRET_HINTS } from "../Data/Events/universalModifiers";
import { Notice } from "../Components/Notice";

// Keeps Squad Select up after the last lock-in so its reveal wipe can finish.
const SQUAD_OUTRO_MS = 1700;

interface GameplayPhaseProps {
  pool: Agent[];
  banned: string[];
  round: number;
  totalRounds: number;
  roundStage: RoundStage;
  currentBoss: Boss | null;
  roundWins: Record<PlayerId, number>;
  overtimeStreak: Record<PlayerId, number>;
  rosters: Record<PlayerId, Agent[]>;
  eliminatedPool: Record<PlayerId, Agent[]>;
  immune: Record<PlayerId, string[]>; // Overtime Contract agents
  horizontalActive: Record<PlayerId, boolean>; // Horizontal Investment still restricting
  squadTiers: Record<PlayerId, Record<string, number>>; // who is held back from squads
  lossPenalty: Record<PlayerId, number>; // Emergency Reinforcements: agents lost on a loss
  squads: Record<PlayerId, string[]>;
  squadsConfirmed: Record<PlayerId, boolean>;
  grayedOut: Record<PlayerId, Record<string, number>>;
  submitted: Record<PlayerId, boolean>;
  isSquadEligible: (player: PlayerId, agentId: string) => boolean;
  timeInputs: Record<PlayerId, { minutes: string; seconds: string }>;
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
  roundLog: RoundLogEntry[];
  displayName: (p: PlayerId | null) => string;
  onRollBoss: () => void;
  onContinueFromBoss: () => void;
  onToggleSquadAgent: (player: PlayerId, agent: Agent) => void;
  onConfirmSquad: (player: PlayerId) => void;
  onSquadTimeout: (player: PlayerId) => void;
  squadPlan: {
    mainSize: Record<PlayerId, number>;
    hasControlSlot: Record<PlayerId, boolean>;
    controlOpen: Record<PlayerId, boolean>;
    controlPicks: Record<PlayerId, string | null>;
    controlLocked: Record<PlayerId, boolean>;
    forced: Record<PlayerId, string | null>;
  };
  battleSquads: Record<PlayerId, string[]>;
  morphChoices: Record<PlayerId, Record<string, string>>;
  battleMorphs: Record<PlayerId, Record<string, string>>;
  morphOptionsFor: (player: PlayerId, itemId: string) => Agent[];
  onChooseMorph: (player: PlayerId, itemId: string, agentId: string) => void;
  isControlEligible: (controller: PlayerId, agentId: string) => boolean;
  onToggleControl: (controller: PlayerId, agent: Agent) => void;
  onConfirmControl: (controller: PlayerId) => void;
  onControlTimeout: (controller: PlayerId) => void;
  // between-round screens
  effects: RoundEffects;
  affixOffer: AffixOffer | null;
  affixChoice: AffixChoice | null;
  affixPick: AffixPickSpec | null;
  affixSelection: string[];
  necroStage: "sacrifice" | "revive";
  modifierRoll: ModifierDef | null;
  onChooseAffix: (kind: "positive" | "negative") => void;
  onTogglePick: (agentId: string) => void;
  onConfirmAffix: () => void;
  onAcknowledgeModifier: () => void;
  onAcknowledgeReveal: () => void;
  presetTeam: string[] | null;
  veto: Record<PlayerId, boolean>;
  onAcknowledgePreset: () => void;
  dejaVuPicks: Record<PlayerId, string[]>;
  dejaVuLocked: Record<PlayerId, boolean>;
  dejaVuCandidates: (player: PlayerId) => Agent[];
  onToggleDejaVu: (player: PlayerId, agentId: string) => void;
  onConfirmDejaVu: (player: PlayerId) => void;
  onDejaVuTimeout: (player: PlayerId) => void;
}

export function GameplayPhase({
  pool,
  banned,
  round,
  totalRounds,
  roundStage,
  currentBoss,
  roundWins,
  overtimeStreak,
  rosters,
  eliminatedPool,
  immune,
  horizontalActive,
  squadTiers,
  lossPenalty,
  squads,
  squadsConfirmed,
  grayedOut,
  submitted,
  isSquadEligible,
  timeInputs,
  onTimeChange,
  onConfirmTime,
  onTimeout,
  pendingRemoval,
  removalSelection,
  onToggleRemoval,
  onConfirmRemoval,
  roundLog,
  displayName,
  onRollBoss,
  onContinueFromBoss,
  onToggleSquadAgent,
  onConfirmSquad,
  onSquadTimeout,
  squadPlan,
  battleSquads,
  morphChoices,
  battleMorphs,
  morphOptionsFor,
  onChooseMorph,
  isControlEligible,
  onToggleControl,
  onConfirmControl,
  onControlTimeout,
  effects,
  affixOffer,
  affixChoice,
  affixPick,
  affixSelection,
  necroStage,
  modifierRoll,
  onChooseAffix,
  onTogglePick,
  onConfirmAffix,
  onAcknowledgeModifier,
  onAcknowledgeReveal,
  presetTeam,
  veto,
  onAcknowledgePreset,
  dejaVuPicks,
  dejaVuLocked,
  dejaVuCandidates,
  onToggleDejaVu,
  onConfirmDejaVu,
  onDejaVuTimeout,
}: GameplayPhaseProps) {
  // Set during render (not in an effect) so Squad Select is never unmounted in between.
  const [lastStage, setLastStage] = useState(roundStage);
  const [squadOutro, setSquadOutro] = useState(false);
  if (roundStage !== lastStage) {
    setLastStage(roundStage);
    setSquadOutro(lastStage === "squad");
  }

  useEffect(() => {
    if (!squadOutro) return;
    const timer = setTimeout(() => setSquadOutro(false), SQUAD_OUTRO_MS);
    return () => clearTimeout(timer);
  }, [squadOutro]);

  const [hintSalt] = useState(() => Math.floor(Math.random() * SECRET_HINTS.length));
  const secretHint = effects.modifier?.hidden
    ? SECRET_HINTS[(hintSalt + round) % SECRET_HINTS.length]
    : null;

  // The screens that come BEFORE the boss roll.
  if (roundStage === "affix" && affixOffer) {
    return (
      <AffixScreen
        offer={affixOffer}
        rosters={rosters}
        eliminated={eliminatedPool}
        immune={immune}
        choice={affixChoice}
        pick={affixPick}
        selection={affixSelection}
        necroStage={necroStage}
        displayName={displayName}
        onChoose={onChooseAffix}
        onTogglePick={onTogglePick}
        onConfirm={onConfirmAffix}
      />
    );
  }
  if (roundStage === "modifier" && modifierRoll) {
    return (
      <ModifierScreen
        modifier={modifierRoll}
        onAcknowledge={onAcknowledgeModifier}
        rosters={rosters}
        eliminated={eliminatedPool}
        immune={immune}
        displayName={displayName}
      />
    );
  }

  // A secret modifier is announced after squad select, right before the round.
  if (roundStage === "reveal" && !squadOutro) {
    const def = UNIVERSAL_MODIFIERS.find((m) => m.id === effects.modifier?.id);
    if (def)
      return (
        <ModifierScreen
          modifier={def}
          revealed
          onAcknowledge={onAcknowledgeReveal}
          rosters={rosters}
          eliminated={eliminatedPool}
          immune={immune}
          displayName={displayName}
        />
      );
  }

  // Deja Vu: each player builds a new team from the opponent's eliminated agents.
  if (roundStage === "dejavu" && !squadOutro) {
    return (
      <DejaVuScreen
        round={round}
        picks={dejaVuPicks}
        locked={dejaVuLocked}
        candidatesFor={dejaVuCandidates}
        displayName={displayName}
        onToggle={onToggleDejaVu}
        onConfirm={onConfirmDejaVu}
        onTimeout={onDejaVuTimeout}
      />
    );
  }

  // Preset Teams: the rolled team that is actually played.
  if (roundStage === "preset" && presetTeam && !squadOutro) {
    return (
      <PresetScreen
        team={presetTeam}
        title={(
          UNIVERSAL_MODIFIERS.find((m) => m.id === effects.modifier?.id)?.title ?? "PRESET TEAM"
        ).toUpperCase()}
        subtitle="BOTH PLAYERS FIGHT WITH THIS TEAM"
        squads={squads}
        lookup={[...rosters.p1, ...rosters.p2, ...pool]}
        morphs={morphChoices}
        displayName={displayName}
        onAcknowledge={onAcknowledgePreset}
      />
    );
  }

  // Everything that follows shows what is in force for this battle. A secret modifier
  // is only "???" until its reveal, so nothing before that may give it away.
  const shown: RoundEffects = effects.modifier?.hidden
    ? { ...effects, modifier: { id: "hidden", title: "???" } }
    : effects;

  if (roundStage === "boss") {
    return (
      <>
        {secretHint && (
          <div className="mb-4 flex">
            <Notice className="border-event bg-event-plate text-event-light" title={secretHint} icon="◆" />
          </div>
        )}
        <BossRoll
          currentBoss={currentBoss}
          onRoll={onRollBoss}
          onContinue={onContinueFromBoss}
        />
      </>
    );
  }

  if (roundStage === "squad" || squadOutro) {
    return (
      <>
        <SquadSelect
          round={round}
          totalRounds={totalRounds}
          bossName={currentBoss?.name}
          overtimeStreak={overtimeStreak}
          immune={immune}
          horizontalActive={horizontalActive}
          tiers={squadTiers}
          rosters={rosters}
          squads={squads}
          squadsConfirmed={squadsConfirmed}
          grayedOut={grayedOut}
          isSquadEligible={isSquadEligible}
          displayName={displayName}
          onToggleAgent={onToggleSquadAgent}
          onConfirmSquad={onConfirmSquad}
          onTimeoutForPlayer={onSquadTimeout}
          pool={pool}
          banned={banned}
          morphChoices={morphChoices}
          morphOptionsFor={morphOptionsFor}
          onChooseMorph={onChooseMorph}
          effects={shown}
          squadPlan={squadPlan}
          isControlEligible={isControlEligible}
          onToggleControl={onToggleControl}
          onConfirmControl={onConfirmControl}
          onControlTimeout={onControlTimeout}
          secretHint={secretHint}
        />
      </>
    );
  }

  return (
    <>
      <ScoreSubmit
        pool={pool}
        round={round}
        totalRounds={totalRounds}
        bossName={currentBoss?.name}
        overtimeStreak={overtimeStreak}
        timePenalty={effects.timePenalty}
        immune={immune}
        rosters={rosters}
        squads={battleSquads}
        morphs={battleMorphs}
        swapped={effects.modifier?.id === "armory-swap"}
        preset={
          effects.modifier?.id === "mirror-match" ||
          effects.modifier?.id === "deja-vu" ||
          effects.modifier?.id === "armory-swap"
        }
        veto={veto}
        lossPenalty={lossPenalty}
        timeInputs={timeInputs}
        submitted={submitted}
        onTimeChange={onTimeChange}
        onConfirmTime={onConfirmTime}
        onTimeout={onTimeout}
        pendingRemoval={pendingRemoval}
        removalSelection={removalSelection}
        onToggleRemoval={onToggleRemoval}
        onConfirmRemoval={onConfirmRemoval}
        displayName={displayName}
      />
    </>
  );
}