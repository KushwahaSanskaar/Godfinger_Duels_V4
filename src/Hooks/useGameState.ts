import { useState, useMemo } from "react";
import type {
  Agent,
  Phase,
  PlayerId,
  Mode,
  DraftQueueItem,
  GameEvent,
  RoundLogEntry,
  RoundStage,
  PendingRemoval,
} from "../types";
import { AGENTS } from "../Data/agents";
import { CLASS_GROUPS, MODES, groupForSpecialty } from "../Data/modes";
import { EVENT_POOL } from "../Data/events";
import { BOSS_POOL, type Boss } from "../Data/bosses";
import { COOLDOWN_ROUNDS } from "../Data/timers";

function other(p: PlayerId): PlayerId {
  return p === "p1" ? "p2" : "p1";
}

function randomFrom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Flattens the mode's explicit draft script into individual queue items —
// e.g. { type: "pick", player: "p1", count: 2 } becomes two consecutive
// { type: "pick", player: "p1" } entries.
function buildDraftQueue(mode: Mode): DraftQueueItem[] {
  const cfg = MODES[mode];
  const queue: DraftQueueItem[] = [];
  cfg.draftScript.forEach((segment) => {
    if (segment.type === "event") {
      queue.push({ type: "event" });
    } else if (segment.player && segment.count) {
      for (let i = 0; i < segment.count; i++) {
        queue.push({ type: "pick", player: segment.player });
      }
    }
  });
  return queue;
}

export function useGameState() {
  const [mode, setModeState] = useState<Mode>("standard");
  const [phase, setPhase] = useState<Phase>("setup");
  const [names, setNames] = useState<{ p1: string; p2: string }>({
    p1: "",
    p2: "",
  });

  const [priority, setPriority] = useState<PlayerId | null>(null);
  const [coinResult, setCoinResult] = useState<"heads" | "tails" | null>(null);

  const [banned, setBanned] = useState<string[]>([]);
  const [banIndex, setBanIndex] = useState(0);

  const [draftQueue, setDraftQueue] = useState<DraftQueueItem[]>([]);
  const [draftPointer, setDraftPointer] = useState(0);
  const [rosters, setRosters] = useState<Record<PlayerId, Agent[]>>({
    p1: [],
    p2: [],
  });
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventLog, setEventLog] = useState<GameEvent[]>([]);

  const [round, setRound] = useState(1);
  const [roundWins, setRoundWins] = useState<Record<PlayerId, number>>({
    p1: 0,
    p2: 0,
  });

  // --- Round-loop state (boss roll -> squad select -> score submit) ---
  const [roundStage, setRoundStage] = useState<RoundStage>("boss");
  const [currentBoss, setCurrentBoss] = useState<Boss | null>(null);
  const [squads, setSquads] = useState<Record<PlayerId, string[]>>({
    p1: [],
    p2: [],
  });
  const [squadsConfirmed, setSquadsConfirmed] = useState<
    Record<PlayerId, boolean>
  >({ p1: false, p2: false });
  // agent id -> rounds of cooldown remaining (0/absent = fully available)
  const [grayedOut, setGrayedOut] = useState<Record<PlayerId, Record<string, number>>>(
    { p1: {}, p2: {} },
  );
  const [submitted, setSubmitted] = useState<Record<PlayerId, boolean>>({
    p1: false,
    p2: false,
  });
  const [eliminatedThisRound, setEliminatedThisRound] = useState<string[]>([]);

  const [timeInputs, setTimeInputsState] = useState<
    Record<PlayerId, { minutes: string; seconds: string }>
  >({
    p1: { minutes: "", seconds: "" },
    p2: { minutes: "", seconds: "" },
  });
  const [pendingRemovals, setPendingRemovals] = useState<PendingRemoval[]>([]);
  const [removalSelection, setRemovalSelection] = useState<string[]>([]);
  const [roundLog, setRoundLog] = useState<RoundLogEntry[]>([]);
  const [winner, setWinner] = useState<PlayerId | null>(null);

  const cfg = MODES[mode];
  const banTurn: PlayerId | null = priority
    ? banIndex % 2 === 0
      ? priority
      : other(priority)
    : null;
  const draftItem = draftQueue[draftPointer];
  const pendingRemoval: PendingRemoval | null = pendingRemovals[0] ?? null;

  const bannedGroups = useMemo(
    () =>
      banned
        .map((id) => AGENTS.find((a) => a.id === id)?.specialty)
        .filter((s): s is string => Boolean(s))
        .map(groupForSpecialty),
    [banned],
  );

  const pool = useMemo(() => AGENTS, []);

  function displayName(p: PlayerId | null): string {
    if (!p) return "";
    return names[p] || (p === "p1" ? "Player 1" : "Player 2");
  }

  function setMode(m: Mode) {
    setModeState(m);
  }

  function setName(player: PlayerId, value: string) {
    setNames((n) => ({ ...n, [player]: value }));
  }

  function startGame() {
    setPhase("coin");
  }

  function tossCoin() {
    setCoinResult(Math.random() < 0.5 ? "heads" : "tails");
    setPriority(Math.random() < 0.5 ? "p1" : "p2");
  }

  function confirmPriorityAndBegin() {
    setDraftQueue(buildDraftQueue(mode));
    setPhase("ban");
  }

  function enterDraftPhase() {
    // advanceDraft() only fires on later transitions (after a pick or an
    // acknowledged event) — it never runs for the initial pointer, so if
    // the script's first entry is itself an event, we have to seed
    // activeEvent here or the draft screen renders nothing at all.
    if (draftQueue[0]?.type === "event") {
      setActiveEvent(EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]);
    }
    setPhase("draft");
  }

  function banAgent(agent: Agent) {
    const group = groupForSpecialty(agent.specialty);
    if (bannedGroups.includes(group)) return; // group already locked out
    setBanned((b) => [...b, agent.id]);
    if (banIndex + 1 >= CLASS_GROUPS.length) {
      enterDraftPhase();
    } else {
      setBanIndex((i) => i + 1);
    }
  }

  // Called when the 30s ban timer runs out — bans a random eligible agent
  // on behalf of whoever's turn it is.
  function autoResolveBan() {
    const eligible = pool.filter(
      (a) => !bannedGroups.includes(groupForSpecialty(a.specialty)),
    );
    const pick = randomFrom(eligible);
    if (pick) banAgent(pick);
  }

  function draftAgent(agent: Agent) {
    if (!draftItem || draftItem.type !== "pick" || !draftItem.player) return;
    const p = draftItem.player;
    setRosters((r) => ({ ...r, [p]: [...r[p], agent] }));
    advanceDraft();
  }

  // Called when the 30s pick timer runs out — drafts a random eligible
  // agent on behalf of whoever's turn it is.
  function autoResolveDraft() {
    if (!draftItem || draftItem.type !== "pick" || !draftItem.player) return;
    const player = draftItem.player;
    const eligible = pool.filter((a) => {
      const ownedByCurrentPlayer = rosters[player].some((x) => x.id === a.id);
      if (cfg.sharedPool) return !ownedByCurrentPlayer;
      const takenByEither =
        rosters.p1.some((x) => x.id === a.id) ||
        rosters.p2.some((x) => x.id === a.id);
      return !takenByEither;
    });
    const pick = randomFrom(eligible);
    if (pick) draftAgent(pick);
  }

  function advanceDraft() {
    const next = draftPointer + 1;
    setDraftPointer(next);
    if (draftQueue[next]?.type === "event") {
      setActiveEvent(EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]);
    }
    if (next >= draftQueue.length) {
      setPhase("gameplay"); // enters at roundStage "boss" by default
    }
  }

  function resolveEvent() {
    if (activeEvent) setEventLog((log) => [...log, activeEvent]);
    setActiveEvent(null);
    advanceDraft();
  }

  // ----- Boss roll -----

  function rollBoss() {
    setCurrentBoss(BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)]);
  }

  function confirmBossAndBeginSquad() {
    setSquads({ p1: [], p2: [] });
    setSquadsConfirmed({ p1: false, p2: false });
    setRoundStage("squad");
  }

  // ----- Squad select -----

  // An agent is selectable unless it's on cooldown (grayedOut) from last
  // round's use — UNLESS the player doesn't have 3 non-cooldown agents
  // available, in which case cooldown is ignored just enough to fill the
  // squad to 3.
  function isSquadEligible(player: PlayerId, agentId: string): boolean {
    const nonCooldownCount = rosters[player].filter(
      (a) => !(a.id in grayedOut[player]),
    ).length;
    if (nonCooldownCount >= 3) {
      return !(agentId in grayedOut[player]);
    }
    return true;
  }

  function toggleSquadAgent(player: PlayerId, agent: Agent) {
    if (squadsConfirmed[player]) return; // already locked in
    setSquads((s) => {
      const current = s[player];
      if (current.includes(agent.id)) {
        return { ...s, [player]: current.filter((id) => id !== agent.id) };
      }
      if (current.length >= 3) return s; // squad already full
      if (!isSquadEligible(player, agent.id)) return s;
      return { ...s, [player]: [...current, agent.id] };
    });
  }

  function confirmSquad(player: PlayerId) {
    if (squads[player].length !== 3) return;
    lockInSquad(player);
  }

  // Called when a player's 30s squad-select timer runs out — randomly
  // fills any remaining slots from eligible agents, then locks it in.
  function autoResolveSquad(player: PlayerId) {
    if (squadsConfirmed[player]) return;
    const current = squads[player];
    const pickFrom = rosters[player].filter(
      (a) => !current.includes(a.id) && isSquadEligible(player, a.id),
    );
    const filled = [...current];
    while (filled.length < 3 && pickFrom.length > 0) {
      const idx = Math.floor(Math.random() * pickFrom.length);
      filled.push(pickFrom[idx].id);
      pickFrom.splice(idx, 1);
    }
    setSquads((s) => ({ ...s, [player]: filled }));
    lockInSquad(player, filled);
  }

  // Shared "mark this player's squad confirmed, and if both are now
  // confirmed, move on to score submission" logic used by both the manual
  // confirm button and the auto-fill-on-timeout path.
  function lockInSquad(player: PlayerId, _filled?: string[]) {
    const next = { ...squadsConfirmed, [player]: true };
    setSquadsConfirmed(next);
    if (next.p1 && next.p2) {
      setTimeInputsState({
        p1: { minutes: "", seconds: "" },
        p2: { minutes: "", seconds: "" },
      });
      setSubmitted({ p1: false, p2: false });
      setRoundStage("score");
    }
  }

  // ----- Score submission -----

  function setTimeInput(
    player: PlayerId,
    field: "minutes" | "seconds",
    value: string,
  ) {
    setTimeInputsState((t) => ({
      ...t,
      [player]: { ...t[player], [field]: value },
    }));
  }

  function confirmPlayerTime(player: PlayerId) {
    const t = timeInputs[player];
    if (t.seconds === "") return;
    const m = Number(t.minutes || 0);
    const s = Number(t.seconds);
    if (Number.isNaN(m) || Number.isNaN(s)) return;

    const next = { ...submitted, [player]: true };
    setSubmitted(next);
    if (next.p1 && next.p2) {
      resolveRoundNormal();
    }
  }

  function resolveRoundNormal() {
    const m1 = Number(timeInputs.p1.minutes || 0);
    const s1 = Number(timeInputs.p1.seconds);
    const m2 = Number(timeInputs.p2.minutes || 0);
    const s2 = Number(timeInputs.p2.seconds);
    const t1 = m1 * 60 + s1;
    const t2 = m2 * 60 + s2;
    // lower time wins the round
    const loser: PlayerId | null = t1 === t2 ? null : t1 < t2 ? "p2" : "p1";
    finalizeRound(loser, t1, t2, "score");
  }

  // Called by the score-submit screen's countdown when it hits 0.
  function handleTimeout() {
    if (submitted.p1 && submitted.p2) return; // already resolved

    if (!submitted.p1 && !submitted.p2) {
      finalizeDoubleLoss();
      return;
    }

    // exactly one player submitted in time — the other auto-loses
    const loser: PlayerId = submitted.p1 ? "p2" : "p1";
    const t1 =
      submitted.p1 && timeInputs.p1.seconds !== ""
        ? Number(timeInputs.p1.minutes || 0) * 60 + Number(timeInputs.p1.seconds)
        : 0;
    const t2 =
      submitted.p2 && timeInputs.p2.seconds !== ""
        ? Number(timeInputs.p2.minutes || 0) * 60 + Number(timeInputs.p2.seconds)
        : 0;
    finalizeRound(loser, t1, t2, "timeout");
  }

  function finalizeRound(
    loser: PlayerId | null,
    t1: number,
    t2: number,
    outcome: RoundLogEntry["outcome"],
  ) {
    const winnerOfRound = loser ? other(loser) : null;
    setRoundLog((log) => [
      ...log,
      { round, t1, t2, winner: winnerOfRound, boss: currentBoss?.name, outcome },
    ]);
    if (winnerOfRound) {
      setRoundWins((w) => ({ ...w, [winnerOfRound]: w[winnerOfRound] + 1 }));
    }

    if (!loser) {
      finishRoundAndAdvance([]);
      return;
    }

    if (rosters[loser].length <= cfg.minRoster) {
      setWinner(other(loser));
      setPhase("gameover");
      return;
    }

    setPendingRemovals([{ player: loser, count: 2, pool: squads[loser] }]);
    setRemovalSelection([]);
  }

  function finalizeDoubleLoss() {
    setRoundLog((log) => [
      ...log,
      {
        round,
        t1: 0,
        t2: 0,
        winner: null,
        boss: currentBoss?.name,
        outcome: "double-timeout",
      },
    ]);

    // If either player is already at the elimination floor, they lose the
    // match outright — checked p1 first, so simultaneous-floor is an
    // extreme edge case broken in p2's favor.
    if (rosters.p1.length <= cfg.minRoster) {
      setWinner("p2");
      setPhase("gameover");
      return;
    }
    if (rosters.p2.length <= cfg.minRoster) {
      setWinner("p1");
      setPhase("gameover");
      return;
    }

    setPendingRemovals([
      { player: "p1", count: 2, pool: squads.p1 },
      { player: "p2", count: 2, pool: squads.p2 },
    ]);
    setRemovalSelection([]);
  }

  function proceedAfterRound() {
    if (round >= 9) {
      const p1w = roundWins.p1;
      const p2w = roundWins.p2;
      let final: PlayerId;
      if (p1w !== p2w) final = p1w > p2w ? "p1" : "p2";
      else final = rosters.p1.length >= rosters.p2.length ? "p1" : "p2";
      setWinner(final);
      setPhase("gameover");
    } else {
      setRound((r) => r + 1);
    }
  }

  function finishRoundAndAdvance(eliminatedIds: string[]) {
    // Cooldown bookkeeping: decrement anything already on cooldown, drop
    // entries that just expired or got eliminated, then put this round's
    // surviving squad members on a fresh cooldown. Keeping this as
    // decrement-then-reapply (rather than a flat overwrite) is what lets
    // COOLDOWN_ROUNDS be >1 later without touching this function.
    const nextGrayed: Record<PlayerId, Record<string, number>> = { p1: {}, p2: {} };
    (["p1", "p2"] as PlayerId[]).forEach((p) => {
      Object.entries(grayedOut[p]).forEach(([id, remaining]) => {
        if (!eliminatedIds.includes(id) && remaining - 1 > 0) {
          nextGrayed[p][id] = remaining - 1;
        }
      });
      squads[p].forEach((id) => {
        if (!eliminatedIds.includes(id)) {
          nextGrayed[p][id] = COOLDOWN_ROUNDS;
        }
      });
    });

    setGrayedOut(nextGrayed);
    setEliminatedThisRound([]);
    setCurrentBoss(null);
    setRoundStage("boss");
    proceedAfterRound();
  }

  function toggleRemoval(agentId: string) {
    setRemovalSelection((sel) =>
      sel.includes(agentId)
        ? sel.filter((id) => id !== agentId)
        : [...sel, agentId],
    );
  }

  function confirmRemoval() {
    const current = pendingRemovals[0];
    if (!current || removalSelection.length !== current.count) return;
    const { player } = current;

    setRosters((r) => ({
      ...r,
      [player]: r[player].filter((a) => !removalSelection.includes(a.id)),
    }));

    const eliminatedNow = removalSelection;
    const allEliminated = [...eliminatedThisRound, ...eliminatedNow];
    setEliminatedThisRound(allEliminated);
    setRemovalSelection([]);

    const rest = pendingRemovals.slice(1);
    setPendingRemovals(rest);

    if (rest.length === 0) {
      finishRoundAndAdvance(allEliminated);
    }
  }

  function resetGame() {
    setPhase("setup");
    setNames({ p1: "", p2: "" });
    setPriority(null);
    setCoinResult(null);
    setBanned([]);
    setBanIndex(0);
    setDraftQueue([]);
    setDraftPointer(0);
    setRosters({ p1: [], p2: [] });
    setActiveEvent(null);
    setEventLog([]);
    setRound(1);
    setRoundWins({ p1: 0, p2: 0 });
    setRoundStage("boss");
    setCurrentBoss(null);
    setSquads({ p1: [], p2: [] });
    setSquadsConfirmed({ p1: false, p2: false });
    setGrayedOut({ p1: {}, p2: {} });
    setSubmitted({ p1: false, p2: false });
    setEliminatedThisRound([]);
    setTimeInputsState({
      p1: { minutes: "", seconds: "" },
      p2: { minutes: "", seconds: "" },
    });
    setPendingRemovals([]);
    setRemovalSelection([]);
    setRoundLog([]);
    setWinner(null);
  }

  return {
    mode,
    phase,
    names,
    priority,
    coinResult,
    banned,
    banIndex,
    draftQueue,
    draftPointer,
    rosters,
    activeEvent,
    eventLog,
    round,
    roundWins,
    roundStage,
    currentBoss,
    squads,
    squadsConfirmed,
    grayedOut,
    submitted,
    timeInputs,
    pendingRemoval,
    removalSelection,
    roundLog,
    winner,

    cfg,
    banTurn,
    draftItem,
    bannedGroups,
    pool,
    displayName,
    isSquadEligible,

    setMode,
    setName,
    startGame,
    tossCoin,
    confirmPriorityAndBegin,
    banAgent,
    autoResolveBan,
    draftAgent,
    autoResolveDraft,
    resolveEvent,
    rollBoss,
    confirmBossAndBeginSquad,
    toggleSquadAgent,
    confirmSquad,
    autoResolveSquad,
    setTimeInput,
    confirmPlayerTime,
    handleTimeout,
    toggleRemoval,
    confirmRemoval,
    resetGame,
  };
}
