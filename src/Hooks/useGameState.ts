import { useState, useMemo } from "react";
import type {
  Agent,
  Phase,
  PlayerId,
  Mode,
  DraftQueueItem,
  RoundLogEntry,
  RoundStage,
  PendingRemoval,
} from "../types";
import { AGENTS } from "../Data/agents";
import { CLASS_GROUPS, MODES, groupForSpecialty } from "../Data/modes";
import { BOSS_POOL, type Boss } from "../Data/bosses";
import { COOLDOWN_ROUNDS } from "../Data/timers";
import {
  DraftEventDef,
  DraftEventId,
  ExtraBanTurn,
  INVITATION_SPECIALTIES,
  PickRestriction,
  SOUL_STONE_AGENT,
  rollDraftEvent,
} from "../Data/Events/draftEvents";

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

  // ----- Drafting-event state -----
  const [activeDraftEvent, setActiveDraftEvent] = useState<DraftEventDef | null>(null);
  const [draftEventLog, setDraftEventLog] = useState<DraftEventDef[]>([]);
  const [gatekeeperActive, setGatekeeperActive] = useState(false);
  const [pickRestriction, setPickRestriction] = useState<
    Record<PlayerId, PickRestriction | null>
  >({ p1: null, p2: null });
  const [extraBans, setExtraBans] = useState<ExtraBanTurn[] | null>(null);
  const [waveLockedCategories, setWaveLockedCategories] = useState<string[]>([]);

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
  // Gatekeeper (standard-mode only, once-per-draft event) overrides the
  // mode's default sharedPool for the rest of the draft once it fires.
  const effectiveSharedPool = cfg.sharedPool && !gatekeeperActive;

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

  // ----- The queue-walking primitive -----
  // Moves the draft pointer to index i and reacts to what's there. Takes
  // the index as a plain argument (rather than reading draftPointer state)
  // so it can safely recurse without hitting stale-closure issues when an
  // event turns out to have no eligible outcome.
  function activateQueueIndex(i: number) {
    setDraftPointer(i);
    if (i >= draftQueue.length) {
      setPhase("gameplay"); // enters at roundStage "boss" by default
      return;
    }
    const item = draftQueue[i];
    if (item.type === "event") {
      const event = rollDraftEvent({
        mode,
        banned,
        pool,
        gatekeeperActive,
        firedEventIds: draftEventLog.map((e) => e.id),
      });
      if (event) {
        setActiveDraftEvent(event);
      } else {
        activateQueueIndex(i + 1); // nothing eligible — skip straight through
      }
    }
  }

  function enterDraftPhase() {
    setPhase("draft");
    activateQueueIndex(0);
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
    const restriction = pickRestriction[p];

    if (restriction) {
      if (restriction.kind === "a-rank" && agent.s_rank) return; // must be A-Rank (s_rank: false)
      if (restriction.kind === "specialty") {
        if (!restriction.specialties?.includes(agent.specialty)) return;
        if (!restriction.includeBanned && banned.includes(agent.id)) return;
      }
    } else if (banned.includes(agent.id)) {
      return; // normal picks must be unbanned
    }

    setRosters((r) => ({ ...r, [p]: [...r[p], agent] }));

    if (restriction) {
      const remaining = restriction.picksRemaining - 1;
      setPickRestriction((pr) => ({
        ...pr,
        [p]: remaining > 0 ? { ...restriction, picksRemaining: remaining } : null,
      }));
    }

    advanceDraft();
  }

  function autoResolveDraft() {
    if (!draftItem || draftItem.type !== "pick" || !draftItem.player) return;
    const player = draftItem.player;
    const restriction = pickRestriction[player];

    const eligible = pool.filter((a) => {
      const ownedByCurrentPlayer = rosters[player].some((x) => x.id === a.id);
      if (effectiveSharedPool) {
        if (ownedByCurrentPlayer) return false;
      } else {
        const takenByEither =
          rosters.p1.some((x) => x.id === a.id) || rosters.p2.some((x) => x.id === a.id);
        if (takenByEither) return false;
      }
      if (!restriction) return !banned.includes(a.id);
      if (restriction.kind === "a-rank") return !a.s_rank;
      if (restriction.kind === "specialty") {
        if (!restriction.specialties?.includes(a.specialty)) return false;
        if (!restriction.includeBanned && banned.includes(a.id)) return false;
        return true;
      }
      return true;
    });
    const pick = randomFrom(eligible);
    if (pick) draftAgent(pick); // reuse draftAgent so restriction bookkeeping stays in one place
  }

  function advanceDraft() {
    activateQueueIndex(draftPointer + 1);
  }

  // ----- Drafting-event resolution -----

  function peekNextScheduledPlayer(): PlayerId {
    for (let i = draftPointer + 1; i < draftQueue.length; i++) {
      const item = draftQueue[i];
      if (item.type === "pick" && item.player) return item.player;
    }
    return "p1";
  }

  // How many consecutive picks the given player has starting at their NEXT
  // scheduled turn (their current chunk size) — used by Forced Downgrade.
  function nextRunLength(player: PlayerId): number {
    let count = 0;
    let started = false;
    for (let i = draftPointer + 1; i < draftQueue.length; i++) {
      const item = draftQueue[i];
      if (item.type !== "pick") {
        if (started) break;
        continue;
      }
      if (item.player === player) {
        started = true;
        count++;
      } else if (started) {
        break;
      }
    }
    return count;
  }

  function buildAlternatingTurns(
    startPlayer: PlayerId,
    totalTurns: number,
    enforceCategoryLock: boolean,
  ): ExtraBanTurn[] {
    const turns: ExtraBanTurn[] = [];
    let current = startPlayer;
    for (let i = 0; i < totalTurns; i++) {
      turns.push({ player: current, enforceCategoryLock });
      current = other(current);
    }
    return turns;
  }

  // Adds `agent` straight to a player's roster and removes ONE of their
  // still-upcoming scheduled picks from the queue, so total roster size
  // stays fixed at exactly picksPerPlayer no matter how many of these fire.
  function autoFillPlayerPick(player: PlayerId, agent: Agent) {
    setRosters((r) => ({ ...r, [player]: [...r[player], agent] }));
    setDraftQueue((q) => {
      const idx = q.findIndex(
        (item, i) => i > draftPointer && item.type === "pick" && item.player === player,
      );
      if (idx === -1) return q;
      return [...q.slice(0, idx), ...q.slice(idx + 1)];
    });
  }

  function resolveSoulStone() {
    autoFillPlayerPick("p1", SOUL_STONE_AGENT);
    autoFillPlayerPick("p2", SOUL_STONE_AGENT);
  }

  function resolveForcedRandomAgent() {
    const eligible = pool.filter((a) => !banned.includes(a.id));
    const pick = randomFrom(eligible);
    if (!pick) return;
    autoFillPlayerPick("p1", pick);
    autoFillPlayerPick("p2", pick);
  }

  function resolveEvent() {
    if (!activeDraftEvent) return;
    const event = activeDraftEvent;
    setDraftEventLog((log) => [...log, event]);
    setActiveDraftEvent(null);

    switch (event.id) {
      case "remote-control": {
        advanceDraft();
        return;
      }
      case "ban-wave": {
        setWaveLockedCategories([]);
        setExtraBans(buildAlternatingTurns(peekNextScheduledPlayer(), 5, true));
        return; // extra-ban sub-sequence takes over; queue resumes once it empties
      }
      case "ban-2x": {
        setExtraBans(buildAlternatingTurns(peekNextScheduledPlayer(), 4, false));
        return;
      }
      case "ban-1x": {
        setExtraBans(buildAlternatingTurns(peekNextScheduledPlayer(), 2, false));
        return;
      }
      case "forced-downgrade": {
        const p1Count = nextRunLength("p1");
        const p2Count = nextRunLength("p2");
        setPickRestriction({
          p1: p1Count > 0 ? { kind: "a-rank", picksRemaining: p1Count } : null,
          p2: p2Count > 0 ? { kind: "a-rank", picksRemaining: p2Count } : null,
        });
        advanceDraft();
        return;
      }
      case "soul-stone": {
        resolveSoulStone();
        advanceDraft();
        return;
      }
      case "gatekeeper": {
        setGatekeeperActive(true);
        advanceDraft();
        return;
      }
      case "forced-random-agent": {
        resolveForcedRandomAgent();
        advanceDraft();
        return;
      }
      default: {
        const invite = INVITATION_SPECIALTIES[event.id as DraftEventId];
        if (invite) {
          setPickRestriction({
            p1: { kind: "specialty", specialties: invite.specialties, includeBanned: invite.includeBanned, picksRemaining: 1 },
            p2: { kind: "specialty", specialties: invite.specialties, includeBanned: invite.includeBanned, picksRemaining: 1 },
          });
        }
        advanceDraft();
        return;
      }
    }
  }

  // ----- Extra ban sub-sequence (Ban Wave / Ban 2x / Ban 1x) -----

  function resolveExtraBan(agent: Agent) {
    if (!extraBans || extraBans.length === 0) return;
    if (banned.includes(agent.id)) return;
    const turn = extraBans[0];
    if (turn.enforceCategoryLock) {
      const group = groupForSpecialty(agent.specialty);
      if (waveLockedCategories.includes(group)) return;
      setWaveLockedCategories((c) => [...c, group]);
    }
    setBanned((b) => [...b, agent.id]);
    const rest = extraBans.slice(1);
    setExtraBans(rest.length > 0 ? rest : null);
    if (rest.length === 0) {
      advanceDraft();
    }
  }

  function autoResolveExtraBan() {
    if (!extraBans || extraBans.length === 0) return;
    const turn = extraBans[0];
    const eligible = pool.filter((a) => {
      if (banned.includes(a.id)) return false;
      if (turn.enforceCategoryLock && waveLockedCategories.includes(groupForSpecialty(a.specialty))) {
        return false;
      }
      return true;
    });
    const pick = randomFrom(eligible);
    if (pick) resolveExtraBan(pick);
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
    if (squadsConfirmed[player]) return;
    setSquads((s) => {
      const current = s[player];
      if (current.includes(agent.id)) {
        return { ...s, [player]: current.filter((id) => id !== agent.id) };
      }
      if (current.length >= 3) return s;
      if (!isSquadEligible(player, agent.id)) return s;
      return { ...s, [player]: [...current, agent.id] };
    });
  }

  function confirmSquad(player: PlayerId) {
    if (squads[player].length !== 3) return;
    lockInSquad(player);
  }

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
    lockInSquad(player);
  }

  function lockInSquad(player: PlayerId) {
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
    const loser: PlayerId | null = t1 === t2 ? null : t1 < t2 ? "p2" : "p1";
    finalizeRound(loser, t1, t2, "score");
  }

  function handleTimeout() {
    if (submitted.p1 && submitted.p2) return;

    if (!submitted.p1 && !submitted.p2) {
      finalizeDoubleLoss();
      return;
    }

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

  // If the Soul Stone was in the losing squad, it's auto-eliminated as one
  // of the 2 lost agents — the host only picks the remaining 1.
  function buildPendingRemovalFor(loser: PlayerId): { removal: PendingRemoval; preEliminated: string[] } {
    const squad = squads[loser];
    const hasSoulStone = squad.includes(SOUL_STONE_AGENT.id);
    if (hasSoulStone) {
      return {
        removal: {
          player: loser,
          count: 1,
          pool: squad.filter((id) => id !== SOUL_STONE_AGENT.id),
        },
        preEliminated: [SOUL_STONE_AGENT.id],
      };
    }
    return { removal: { player: loser, count: 2, pool: squad }, preEliminated: [] };
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

    const { removal, preEliminated } = buildPendingRemovalFor(loser);
    // apply the Soul Stone's automatic elimination right away
    if (preEliminated.length > 0) {
      setRosters((r) => ({
        ...r,
        [loser]: r[loser].filter((a) => !preEliminated.includes(a.id)),
      }));
      setEliminatedThisRound((e) => [...e, ...preEliminated]);
    }
    setPendingRemovals([removal]);
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

    const p1Result = buildPendingRemovalFor("p1");
    const p2Result = buildPendingRemovalFor("p2");
    const preEliminated = [...p1Result.preEliminated, ...p2Result.preEliminated];
    if (preEliminated.length > 0) {
      setRosters((r) => ({
        p1: r.p1.filter((a) => !p1Result.preEliminated.includes(a.id)),
        p2: r.p2.filter((a) => !p2Result.preEliminated.includes(a.id)),
      }));
      setEliminatedThisRound((e) => [...e, ...preEliminated]);
    }
    setPendingRemovals([p1Result.removal, p2Result.removal]);
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
    setActiveDraftEvent(null);
    setDraftEventLog([]);
    setGatekeeperActive(false);
    setPickRestriction({ p1: null, p2: null });
    setExtraBans(null);
    setWaveLockedCategories([]);
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
    activeEvent: activeDraftEvent,
    eventLog: draftEventLog,
    gatekeeperActive,
    pickRestriction,
    extraBans,
    waveLockedCategories,
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
    effectiveSharedPool,
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
    resolveExtraBan,
    autoResolveExtraBan,
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
