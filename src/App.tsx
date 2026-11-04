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
import { useEffect, useRef, useState } from "react";
import { PauseContext } from "./Hooks/PauseContext";
import { HostControls } from "./Components/HostControls";
import type { Agent } from "./types";
import { ArcadeBackground } from "./Components/ArcadeBackground";

export default function App() {
  const game = useGameState(); // one call — everything comes back in `game`
  const [pendingDraftAgent, setPendingDraftAgent] = useState<Agent | null>(
    null,
  );
  // ----- host tempo controls -----
  const contentRef = useRef<HTMLDivElement>(null);
  // While paused nothing underneath can be clicked or typed into.
  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", game.paused);
  }, [game.paused, game.epoch]);
  // A rewind remounts the screens; drop this component's tentative pick as well.
  useEffect(() => {
    setPendingDraftAgent(null);
  }, [game.epoch]);
  // Space = pause / play (not while typing, and not on a focused button).
  const togglePauseRef = useRef(game.togglePause);
  togglePauseRef.current = game.togglePause;
  useEffect(() => {
    if (game.phase === "setup") return;
    function onKey(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) return;
      e.preventDefault();
      togglePauseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.phase]);

  const activeBackgroundPlayer: "p1" | "p2" | null =
    game.phase === "ban"
      ? game.banTurn
      : game.phase === "draft"
        ? (game.draftItem?.player ?? null)
        : null;

  return (
    <PauseContext.Provider value={game.paused}>
      <div className="relative isolate min-h-screen w-full text-text-primary p-6">
        <ArcadeBackground activePlayer={activeBackgroundPlayer} />
        {game.phase !== "setup" && (
          <HostControls
            paused={game.paused}
            canRewind={game.canRewind}
            steps={game.historyCount}
            onRewind={game.rewind}
            onTogglePause={game.togglePause}
          />
        )}
        <header className="flex items-center justify-between"></header>
        <div
          key={game.epoch}
          ref={contentRef}
          className="w full mx-auto space-y-4"
        >
          {(game.phase === "ban" || game.phase === "draft") && (
            <PhaseHeader
              phase={game.phase}
              eventActive={game.phase === "draft" && game.activeEvent !== null}
            />
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
                    turnKey={game.draftTurnKey}
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
              overtimeStreak={game.overtimeStreak}
              totalRounds={game.cfg.rounds}
              effects={game.roundEffects}
              affixOffer={game.affixOffer}
              affixChoice={game.affixChoice}
              affixPick={game.affixPick}
              affixSelection={game.affixSelection}
              necroStage={game.necroStage}
              modifierRoll={game.modifierRoll}
              onChooseAffix={game.chooseAffix}
              onTogglePick={game.toggleAffixPick}
              onConfirmAffix={game.confirmAffix}
              onAcknowledgeModifier={game.acknowledgeModifier}
              onAcknowledgeReveal={game.acknowledgeReveal}
              squadPlan={game.squadPlan}
              battleSquads={game.battleSquads}
              morphChoices={game.morphChoices}
              battleMorphs={game.battleMorphs}
              morphOptionsFor={game.morphOptionsFor}
              onChooseMorph={game.chooseMorph}
              isControlEligible={game.isControlEligible}
              onToggleControl={game.toggleControlPick}
              onConfirmControl={game.confirmControl}
              onControlTimeout={game.autoResolveControl}
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
              roundWins={game.roundWins}
              rosters={game.rosters}
              displayName={game.displayName}
              onReset={game.resetGame}
            />
          )}
        </div>
        {game.paused && (
          <div className="fixed inset-0 z-40 bg-black/60 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <span className="font-pixel text-4xl text-event">PAUSED</span>
            <span className="font-pixel text-xs text-text-muted">
              PRESS PLAY OR SPACE TO RESUME
            </span>
          </div>
        )}
      </div>
    </PauseContext.Provider>
  );
}
