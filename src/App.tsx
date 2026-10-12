import { useGameState } from "./Hooks/useGameState";
import { CLASS_GROUPS } from "./Data/modes";
import { SetupScreen } from "./Phases/SetupScreen";
import { CoinToss } from "./Phases/CoinToss";
import { BanPhase } from "./Phases/BanPhase";
import { DraftPhase } from "./Phases/DraftPhase";
import { GameplayPhase } from "./Phases/GameplayPhase";
import { GameOver } from "./Phases/GameOver";
import { PhaseHeader } from "./Components/PhaseHeader";
import "./App.css";
import { PickList } from "./Components/PickList";
import { useState } from "react";
import type { Agent } from "./types";

export default function App() {
  const game = useGameState(); // one call — everything comes back in `game`
  const [pendingDraftAgent, setPendingDraftAgent] = useState<Agent | null>(
    null,
  );

  return (
    <div className="min-h-screen w-full bg-bg text-text-primary p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">
          Host Console — Draft &amp; Duel
        </h1>
      </header>
      <div className="w full mx-auto space-y-4">
        {(game.phase === "ban" || game.phase === "draft") && (
          <PhaseHeader phase={game.phase} />
        )}
        {game.phase === "setup" && (
          <SetupScreen
            mode={game.mode}
            names={game.names}
            onModeChange={game.setMode}
            onNameChange={game.setName}
            onStart={game.startGame}
          />
        )}

        {game.phase === "coin" && (
          <CoinToss
            coinResult={game.coinResult}
            priority={game.priority}
            onToss={game.tossCoin}
            onConfirm={game.confirmPriorityAndBegin}
            displayName={game.displayName}
          />
        )}

        {(game.phase === "ban" || game.phase === "draft") && (
          <div className="flex gap-4 items-start">
            {/* P1 pick list */}
            <div className="w-64 flex-shrink-0">
              <PickList
                rosters={game.rosters}
                draftQueue={game.draftQueue}
                picksPerPlayer={game.cfg.picksPerPlayer}
                displayName={game.displayName}
                player="p1"
                pendingAgent={
                  game.draftItem?.player === "p1" ? pendingDraftAgent : null
                }
              />
            </div>

            {/* Center — phase content */}
            <div className="flex-1 min-w-0">
              {game.phase === "ban" && (
                <BanPhase
                  pool={game.pool}
                  classGroups={CLASS_GROUPS}
                  bannedGroups={game.bannedGroups}
                  banIndex={game.banIndex}
                  banTurn={game.banTurn}
                  displayName={game.displayName}
                  onBan={game.banAgent}
                  onTimeout={game.autoResolveBan}
                  banned={game.banned}
                />
              )}
              {game.phase === "draft" && (
                <DraftPhase
                  pool={game.pool}
                  banned={game.banned}
                  draftItem={game.draftItem}
                  activeEvent={game.activeEvent}
                  rosters={game.rosters}
                  picksPerPlayer={game.cfg.picksPerPlayer}
                  sharedPool={game.effectiveSharedPool}
                  pickRestriction={game.pickRestriction}
                  extraBans={game.extraBans}
                  waveLockedCategories={game.waveLockedCategories}
                  gatekeeperActive={game.gatekeeperActive}
                  displayName={game.displayName}
                  onDraft={(agent) => {
                    game.draftAgent(agent);
                  }}
                  onResolveEvent={game.resolveEvent}
                  onTimeout={game.autoResolveDraft}
                  onResolveExtraBan={game.resolveExtraBan}
                  onExtraBanTimeout={game.autoResolveExtraBan}
                  selectedAgent={pendingDraftAgent}
                  onAgentSelect={setPendingDraftAgent}
                />
              )}
            </div>

            {/* P2 pick list */}
            <div className="w-64 flex-shrink-0">
              <PickList
                rosters={game.rosters}
                draftQueue={game.draftQueue}
                picksPerPlayer={game.cfg.picksPerPlayer}
                displayName={game.displayName}
                player="p2"
                pendingAgent={
                  game.draftItem?.player === "p2" ? pendingDraftAgent : null
                }
              />
            </div>
          </div>
        )}

        {game.phase === "gameplay" && (
          <GameplayPhase
            pool={game.pool}
            banned={game.banned}
            round={game.round}
            roundStage={game.roundStage}
            currentBoss={game.currentBoss}
            roundWins={game.roundWins}
            rosters={game.rosters}
            squads={game.squads}
            squadsConfirmed={game.squadsConfirmed}
            grayedOut={game.grayedOut}
            submitted={game.submitted}
            isSquadEligible={game.isSquadEligible}
            timeInputs={game.timeInputs}
            onTimeChange={game.setTimeInput}
            onConfirmTime={game.confirmPlayerTime}
            onTimeout={game.handleTimeout}
            pendingRemoval={game.pendingRemoval}
            removalSelection={game.removalSelection}
            onToggleRemoval={game.toggleRemoval}
            onConfirmRemoval={game.confirmRemoval}
            roundLog={game.roundLog}
            displayName={game.displayName}
            onRollBoss={game.rollBoss}
            onContinueFromBoss={game.confirmBossAndBeginSquad}
            onToggleSquadAgent={game.toggleSquadAgent}
            onConfirmSquad={game.confirmSquad}
            onSquadTimeout={game.autoResolveSquad}
          />
        )}

        {game.phase === "gameover" && (
          <GameOver
            winner={game.winner}
            rosters={game.rosters}
            displayName={game.displayName}
            onReset={game.resetGame}
          />
        )}
      </div>
    </div>
  );
}
