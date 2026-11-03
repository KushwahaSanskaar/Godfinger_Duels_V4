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
import { UNIVERSAL_MODIFIERS } from "../Data/Events/universalModifiers";
import { ActiveEffects } from "../Components/ActiveEffects";

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
  squads: Record<PlayerId, string[]>;
  squadsConfirmed: Record<PlayerId, boolean>;
  grayedOut: Record<PlayerId, Record<string, number>>;
  submitted: Record<PlayerId, boolean>;
  isSquadEligible: (player: PlayerId, agentId: string) => boolean;
  timeInputs: Record<PlayerId, { minutes: string; seconds: string }>;
  onTimeChange: (player: PlayerId, field: "minutes" | "seconds", value: string) => void;
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
}: GameplayPhaseProps) {
  // The screens that come BEFORE the boss roll.
  if (roundStage === "affix" && affixOffer) {
    return (
      <AffixScreen
        offer={affixOffer}
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
    return <ModifierScreen modifier={modifierRoll} onAcknowledge={onAcknowledgeModifier} />;
  }

  // A secret modifier is announced after squad select, right before the round.
  if (roundStage === "reveal") {
    const def = UNIVERSAL_MODIFIERS.find((m) => m.id === effects.modifier?.id);
    if (def) return <ModifierScreen modifier={def} revealed onAcknowledge={onAcknowledgeReveal} />;
  }

  // Everything that follows shows what is in force for this battle. A secret modifier
  // is only "???" until its reveal, so nothing before that may give it away.
  const shown: RoundEffects = effects.modifier?.hidden
    ? { ...effects, modifier: { id: "hidden", title: "???" } }
    : effects;
  const banner = <ActiveEffects effects={shown} displayName={displayName} />;

  if (roundStage === "boss") {
    return (
      <>
        {banner}
        <BossRoll
          currentBoss={currentBoss}
          round={round}
          totalRounds={totalRounds}
          onRoll={onRollBoss}
          onContinue={onContinueFromBoss}
        />
      </>
    );
  }

  if (roundStage === "squad") {
    return (
      <>
        {banner}
        <SquadSelect
          round={round}
          totalRounds={totalRounds}
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
        />
      </>
    );
  }

  return (
    <>
      {banner}
      <ScoreSubmit
        pool={pool}
        banned={banned}
        round={round}
        totalRounds={totalRounds}
        bossName={currentBoss?.name}
        roundWins={roundWins}
        overtimeStreak={overtimeStreak}
        timePenalty={effects.timePenalty}
        rosters={rosters}
        squads={battleSquads}
        morphs={battleMorphs}
        swapped={effects.modifier?.id === "armory-swap"}
        timeInputs={timeInputs}
        submitted={submitted}
        onTimeChange={onTimeChange}
        onConfirmTime={onConfirmTime}
        onTimeout={onTimeout}
        pendingRemoval={pendingRemoval}
        removalSelection={removalSelection}
        onToggleRemoval={onToggleRemoval}
        onConfirmRemoval={onConfirmRemoval}
        roundLog={roundLog}
        displayName={displayName}
      />
    </>
  );
}
