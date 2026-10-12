import type { Agent, PendingRemoval, PlayerId, RoundLogEntry, RoundStage } from "../types";
import type { Boss } from "../Data/bosses";
import { BossRoll } from "./BossRoll";
import { SquadSelect } from "./SquadSelect";
import { ScoreSubmit } from "./ScoreSubmit";

interface GameplayPhaseProps {
  pool: Agent[];
  banned: string[];
  round: number;
  roundStage: RoundStage;
  currentBoss: Boss | null;
  roundWins: Record<PlayerId, number>;
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
}

export function GameplayPhase({
  pool,
  banned,
  round,
  roundStage,
  currentBoss,
  roundWins,
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
}: GameplayPhaseProps) {
  if (roundStage === "boss") {
    return (
      <BossRoll
        currentBoss={currentBoss}
        round={round}
        onRoll={onRollBoss}
        onContinue={onContinueFromBoss}
      />
    );
  }

  if (roundStage === "squad") {
    return (
      <SquadSelect
        round={round}
        rosters={rosters}
        squads={squads}
        squadsConfirmed={squadsConfirmed}
        grayedOut={grayedOut}
        isSquadEligible={isSquadEligible}
        displayName={displayName}
        onToggleAgent={onToggleSquadAgent}
        onConfirmSquad={onConfirmSquad}
        onTimeoutForPlayer={onSquadTimeout}
      />
    );
  }

  return (
    <ScoreSubmit
      pool={pool}
      banned={banned}
      round={round}
      bossName={currentBoss?.name}
      roundWins={roundWins}
      rosters={rosters}
      squads={squads}
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
  );
}
