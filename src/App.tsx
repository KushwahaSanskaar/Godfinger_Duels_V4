import { useGameState } from "./Hooks/useGameState";
import { CLASS_GROUPS } from "./Data/modes";
import { SetupScreen } from "./Phases/SetupScreen";
import { CoinToss } from "./Phases/CoinToss";
import { BanPhase } from "./Phases/BanPhase";
import { DraftPhase } from "./Phases/DraftPhase";
import { GameplayPhase } from "./Phases/GameplayPhase";
import { GameOver } from "./Phases/GameOver";
import "./App.css";
import { PickList } from "./Components/PickList";
import { useEffect, useRef, useState } from "react";
import { PauseContext } from "./Hooks/PauseContext";
import { Hud } from "./Components/Hud";
import type { Agent } from "./types";
import { ArcadeBackground } from "./Components/ArcadeBackground";
import { buildTimeline } from "./Logic/timeline";
import { nextUpSlot } from "./Logic/nextUp";
import { PauseOverlay } from "./Components/PauseOverlay";
import { preloadGameImages } from "./Logic/preloadImages";
import { PhaseCutIn } from "./Components/PhaseCutIn";


const CUT_INS: Partial<Record<string, { kicker: string; title: string }>> = {
  ban: { kicker: "◆ PHASE 1", title: "BAN PHASE" },
  draft: { kicker: "◆ PHASE 2", title: "DRAFT PHASE" },
  gameplay: { kicker: "◆ PHASE 3", title: "FIGHT PHASE" },
};


export default function App() {
  const game = useGameState(); // one call — everything comes back in `game`
  const [cutIn, setCutIn] = useState<{ kicker: string; title: string } | null>(null);
  const [seen, setSeen] = useState({ phase: game.phase, epoch: game.epoch });
  if (seen.phase !== game.phase || seen.epoch !== game.epoch) {
    setSeen({ phase: game.phase, epoch: game.epoch });
    // a rewind changes the epoch: never replay a cut-in for it
    setCutIn(seen.epoch === game.epoch ? (CUT_INS[game.phase] ?? null) : null);
  }
  const [pendingDraftAgent, setPendingDraftAgent] = useState<Agent | null>(
    null,
  );
  // ----- host tempo controls -----
  const contentRef = useRef<HTMLDivElement>(null);
  // While paused nothing underneath can be clicked or typed into.
  useEffect(() => {
    contentRef.current?.toggleAttribute("inert", game.paused || !!cutIn);
  }, [game.paused, game.epoch, cutIn]);
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

  useEffect(() => {
    if (game.phase === "coin") preloadGameImages();
  }, [game.phase]);

  const activeBackgroundPlayer: "p1" | "p2" | null =
    game.phase === "ban"
      ? game.banTurn
      : game.phase === "draft"
        ? !game.activeEvent && game.extraBans?.length
          ? game.extraBans[0].player
          : (game.draftItem?.player ?? null)
        : null;

  const nextUp =
    game.phase === "draft"
      ? nextUpSlot(game.draftQueue, game.draftPointer, {
        p1: game.rosters.p1.length,
        p2: game.rosters.p2.length,
      })
      : null;

  const pickingPlayer =
    game.phase === "draft" && !game.extraBans?.length
      ? (game.draftItem?.player ?? null)
      : null;


  const timeline = buildTimeline({
    rosterSizes: { p1: game.rosters.p1.length, p2: game.rosters.p2.length },
    phase: game.phase,
    cfg: game.cfg,
    draftQueue: game.draftQueue,
    draftPointer: game.draftPointer,
    round: game.round,
    roundStage: game.roundStage,
    roundLog: game.roundLog,
  });

  return (
    <PauseContext.Provider value={game.paused || !!cutIn}>
      <div className="relative isolate min-h-screen w-full overflow-x-clip text-text-primary p-6">
        <ArcadeBackground activePlayer={activeBackgroundPlayer} />
        {game.phase !== "setup" && (
          <Hud
            paused={game.paused}
            canRewind={game.canRewind}
            steps={game.historyCount}
            onRewind={game.rewind}
            onTogglePause={game.togglePause}
            timeline={timeline}
          />
        )}
        {cutIn && (
          <PhaseCutIn kicker={cutIn.kicker} title={cutIn.title} paused={game.paused} onDone={() => setCutIn(null)} />)}
        <div
          key={game.epoch}
          ref={contentRef}
          className="w-full mx-auto space-y-4"
        >
          {!cutIn && (
            <>
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
                      mode={game.mode}
                      picksPerPlayer={game.cfg.picksPerPlayer}
                      displayName={game.displayName}
                      player="p1"
                      pendingAgent={
                        game.draftItem?.player === "p1" ? pendingDraftAgent : null
                      }
                      nextUpIndex={(nextUp?.player === "p1" ? nextUp.index : null)}
                      pickingIndex={pickingPlayer === "p1" ? game.rosters.p1.length : null}
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
                      mode={game.mode}
                      picksPerPlayer={game.cfg.picksPerPlayer}
                      displayName={game.displayName}
                      player="p2"
                      pendingAgent={
                        game.draftItem?.player === "p2" ? pendingDraftAgent : null
                      }
                      nextUpIndex={nextUp?.player === "p2" ? nextUp.index : null}
                      pickingIndex={pickingPlayer === "p2" ? game.rosters.p2.length : null}
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
                  presetTeam={game.presetTeam}
                  veto={game.veto}
                  onAcknowledgePreset={game.acknowledgePreset}
                  dejaVuPicks={game.dejaVuPicks}
                  dejaVuLocked={game.dejaVuLocked}
                  dejaVuCandidates={game.dejaVuCandidates}
                  onToggleDejaVu={game.toggleDejaVuPick}
                  onConfirmDejaVu={game.confirmDejaVu}
                  onDejaVuTimeout={game.autoResolveDejaVu}
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
                  eliminatedPool={game.eliminatedPool}
                  immune={game.immune}
                  horizontalActive={game.horizontalActive}
                  lossPenalty={game.lossPenalty}
                  squadTiers={game.squadTiers}
                />
              )}

              {game.phase === "gameover" && (
                <GameOver
                  winner={game.winner}
                  roundWins={game.roundWins}
                  rosters={game.rosters}
                  displayName={game.displayName}
                  onReset={game.resetGame}
                  roundLog={game.roundLog}
                />
              )}
            </>
          )}
        </div>
        {game.paused && <PauseOverlay />}
      </div>
    </PauseContext.Provider>
  );
}