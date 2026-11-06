import { useState, useMemo, useRef, useEffect } from "react";
import type {
  Agent,
  Phase,
  PlayerId,
  Mode,
  DraftQueueItem,
  RoundLogEntry,
  RoundStage,
  PendingRemoval,
  InterludeKind,
  RoundEffects,
  AffixChoice,
  AffixPickSpec,
} from "../types";
import { AGENTS } from "../Data/agents";
import {
  CLASS_GROUPS,
  MODES,
  groupForSpecialty,
  OVERTIME_STREAK_TO_WIN,
} from "../Data/modes";
import type { ModifierDef } from "../Data/Events/universalModifiers";
import { BOSS_POOL, pickBoss, type Boss } from "../Data/bosses";
import { COOLDOWN_ROUNDS } from "../Data/timers";
import {
  REMOVAL_COUNT,
  autoFillSquad,
  buildTiers,
  isSquadPickAllowed,
  lossEndsMatch,
  nextCooldowns,
  removalPlan,
  sanitizeSquad,
} from "../Logic/squadRules";
import {
  anyRevivable,
  contractCandidates,
  kamikazeApplies,
  kamikazeCandidates,
  leaderOf,
  ownRevivable,
  rollAffixOffer,
  rollModifier,
  rollPresetTeam,
  rollTunnelVision,
  takeFromPool,
  type AffixOffer,
  type InterludeContext,
} from "../Logic/interludeRules";
import { hasTime, timeSeconds } from "../Logic/timeInput";
import {
  DraftEventDef,
  ExtraBanTurn,
  PickRestriction,
  rollDraftEvent,
} from "../Data/Events/draftEvents";
import {
  MORPH_ITEMS,
  SOUL_STONE_AGENT,
  SOUL_STONE_PLUS_AGENT,
  isMorphItem,
  isSoulStone,
  morphOptions,
} from "../Data/morphItems";

const EMPTY_EFFECTS: RoundEffects = {
  modifier: null,
  affix: null,
  horizontal: { p1: false, p2: false },
  timePenalty: { p1: 0, p2: 0 },
  revivedLock: { p1: [], p2: [] },
};

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

// A saved moment of the match, used by the host's rewind button.
interface Snapshot {
  key: string; // the milestone this was taken at
  values: unknown[]; // every tracked piece of state, in hook order
  claimed: string[]; // "turn already resolved" markers
  locked: Record<PlayerId, boolean>;
  control: Record<PlayerId, boolean>;
}
const HISTORY_LIMIT = 200;

export function useGameState() {
  // ---- host tempo controls: deliberately NOT part of the saved game state ----
  const [paused, setPaused] = useState(false);
  const [epoch, setEpoch] = useState(0); // bumps on rewind so the screens remount fresh
  const [historyCount, setHistoryCount] = useState(0);
  const historyRef = useRef<Snapshot[]>([]);
  const lastKeyRef = useRef<string | null>(null);
  // Random results are remembered, so rewinding and playing on shows the SAME boss /
  // affix / modifier / event again instead of re-rolling.
  const rollMemoRef = useRef<Map<string, unknown>>(new Map());

  // `useTracked` is useState that also registers itself, so a snapshot can read
  // and restore ALL game state without listing it by hand.
  const trackerRef = useRef<{
    i: number;
    entries: { value: unknown; set: (v: unknown) => void }[];
  }>({ i: 0, entries: [] });
  trackerRef.current.i = 0;
  function useTracked<T>(
    init: T | (() => T),
  ): [T, (v: T | ((prev: T) => T)) => void] {
    const [value, set] = useState<T>(init);
    trackerRef.current.entries[trackerRef.current.i++] = {
      value,
      set: set as (v: unknown) => void,
    };
    return [value, set];
  }

  const [mode, setModeState] = useTracked<Mode>("standard");
  const [phase, setPhase] = useTracked<Phase>("setup");
  const [names, setNames] = useTracked<{ p1: string; p2: string }>({
    p1: "",
    p2: "",
  });

  const [priority, setPriority] = useTracked<PlayerId | null>(null);
  const [coinResult, setCoinResult] = useTracked<"heads" | "tails" | null>(
    null,
  );

  const [banned, setBanned] = useTracked<string[]>([]);
  const [banIndex, setBanIndex] = useTracked(0);

  const [draftQueue, setDraftQueue] = useTracked<DraftQueueItem[]>([]);
  const [draftPointer, setDraftPointer] = useTracked(0);
  const [rosters, setRosters] = useTracked<Record<PlayerId, Agent[]>>({
    p1: [],
    p2: [],
  });

  // ----- Drafting-event state -----
  const [activeDraftEvent, setActiveDraftEvent] =
    useTracked<DraftEventDef | null>(null);
  const [draftEventLog, setDraftEventLog] = useTracked<DraftEventDef[]>([]);
  const [gatekeeperActive, setGatekeeperActive] = useTracked(false);
  const [pickRestriction, setPickRestriction] = useTracked<
    Record<PlayerId, PickRestriction | null>
  >({ p1: null, p2: null });
  const [extraBans, setExtraBans] = useTracked<ExtraBanTurn[] | null>(null);
  const [waveLockedCategories, setWaveLockedCategories] = useTracked<string[]>(
    [],
  );

  const [round, setRound] = useTracked(1);
  const [roundWins, setRoundWins] = useTracked<Record<PlayerId, number>>({
    p1: 0,
    p2: 0,
  });

  // --- Round-loop state (boss roll -> squad select -> score submit) ---
  // Consecutive round wins inside overtime (round 10+). Resets on a loss or draw.
  const [overtimeStreak, setOvertimeStreak] = useTracked<
    Record<PlayerId, number>
  >({
    p1: 0,
    p2: 0,
  });
  // Who won the round currently being resolved. Held in state because the loser
  // picks agents to remove on a later render, and the match result can only be
  // decided once that removal is finished.
  const [pendingRoundWinner, setPendingRoundWinner] =
    useTracked<PlayerId | null>(null);
  const [roundStage, setRoundStage] = useTracked<RoundStage>("boss");
  const [currentBoss, setCurrentBoss] = useTracked<Boss | null>(null);
  // The boss rolled most recently (kept after the round ends): it is rolled less often.
  const [lastBossId, setLastBossId] = useTracked<string | null>(null);
  // Preset Teams: the team rolled after the reveal. Both players play it; the squads
  // they picked before stay in `squads` and are what the round's consequences hit.
  const [presetTeam, setPresetTeam] = useTracked<string[] | null>(null);
  const [squads, setSquads] = useTracked<Record<PlayerId, string[]>>({
    p1: [],
    p2: [],
  });
  const [squadsConfirmed, setSquadsConfirmed] = useTracked<
    Record<PlayerId, boolean>
  >({ p1: false, p2: false });
  // agent id -> rounds of cooldown remaining (0/absent = fully available)
  const [grayedOut, setGrayedOut] = useTracked<
    Record<PlayerId, Record<string, number>>
  >({ p1: {}, p2: {} });
  const [submitted, setSubmitted] = useTracked<Record<PlayerId, boolean>>({
    p1: false,
    p2: false,
  });
  // Per player: in Standard mode both players can own the same agent, so a flat
  // list of ids would wrongly mark the OTHER player's copy as eliminated.
  const [eliminatedThisRound, setEliminatedThisRound] = useTracked<
    Record<PlayerId, string[]>
  >({ p1: [], p2: [] });

  const [timeInputs, setTimeInputsState] = useTracked<
    Record<PlayerId, { minutes: string; seconds: string }>
  >({
    p1: { minutes: "", seconds: "" },
    p2: { minutes: "", seconds: "" },
  });
  const [pendingRemovals, setPendingRemovals] = useTracked<PendingRemoval[]>(
    [],
  );
  const [removalSelection, setRemovalSelection] = useTracked<string[]>([]);
  const [roundLog, setRoundLog] = useTracked<RoundLogEntry[]>([]);

  // ---- rules that reach across rounds ----
  // Bumped when a tied round is replayed, so the replay can be resolved again.
  const [roundAttempt, setRoundAttempt] = useTracked(0);
  // Every agent eliminated FROM each player's roster (Necromancy / Reinforcements).
  const [eliminatedPool, setEliminatedPool] = useTracked<
    Record<PlayerId, Agent[]>
  >({
    p1: [],
    p2: [],
  });
  // Overworked fatigue (kept apart from normal cooldown so Preset Teams can wipe
  // cooldowns without wiping fatigue).
  const [fatigue, setFatigue] = useTracked<
    Record<PlayerId, Record<string, number>>
  >({
    p1: {},
    p2: {},
  });
  // Overtime Contract: agents that are never on cooldown / fatigued again.
  const [immune, setImmune] = useTracked<Record<PlayerId, string[]>>({
    p1: [],
    p2: [],
  });
  // Every agent each player has put in a squad (Horizontal Investment).
  const [playedHistory, setPlayedHistory] = useTracked<
    Record<PlayerId, string[]>
  >({
    p1: [],
    p2: [],
  });
  // Emergency Reinforcements: a loss costs this many agents (0 = the normal 2).
  const [lossPenalty, setLossPenalty] = useTracked<Record<PlayerId, number>>({
    p1: 0,
    p2: 0,
  });
  const [roundEffects, setRoundEffects] =
    useTracked<RoundEffects>(EMPTY_EFFECTS);

  // ---- the between-round screens ----
  const [interludeQueue, setInterludeQueue] = useTracked<InterludeKind[]>([]);
  const [affixOffer, setAffixOffer] = useTracked<AffixOffer | null>(null);
  const [affixChoice, setAffixChoice] = useTracked<AffixChoice | null>(null);
  const [affixSelection, setAffixSelection] = useTracked<string[]>([]);
  const [necroStage, setNecroStage] = useTracked<"sacrifice" | "revive">(
    "sacrifice",
  );
  const [necroSacrificed, setNecroSacrificed] = useTracked<string[]>([]);
  const [modifierRoll, setModifierRoll] = useTracked<ModifierDef | null>(null);

  // ---- squad building that involves the opponent (Puppeteer / Mind Control) ----
  // controlPicks[p] = the agent the OPPONENT chose for p's last slot.
  const [controlPicks, setControlPicks] = useTracked<
    Record<PlayerId, string | null>
  >({
    p1: null,
    p2: null,
  });
  const [controlLocked, setControlLocked] = useTracked<
    Record<PlayerId, boolean>
  >({
    p1: false,
    p2: false,
  });
  // Armory Swap: after both squads are confirmed, each player plays the other's.
  const [swapped, setSwapped] = useTracked(false);
  // Tunnel Vision: the random agent each player is forced to bring (can't be removed).
  const [forcedPick, setForcedPick] = useTracked<
    Record<PlayerId, string | null>
  >({
    p1: null,
    p2: null,
  });
  // Soul Stone / Invitation items put in this round's squad -> the agent each one
  // turned into. Cleared whenever squads are rebuilt.
  const [morphChoices, setMorphChoices] = useTracked<
    Record<PlayerId, Record<string, string>>
  >({
    p1: {},
    p2: {},
  });
  const [winner, setWinner] = useTracked<PlayerId | null>(null);

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

  // Identifies the current draft turn for the on-screen clock. It changes on every
  // pick, every extra ban and when an event card opens/closes.
  const draftTurnKey = `${draftPointer}:${extraBans?.length ?? 0}:${activeDraftEvent ? "event" : "turn"}`;

  // "Resolve each turn once." A click and a timeout can both fire from the SAME
  // render (e.g. you pick at the exact second the clock hits 0). Both would see
  // the same stale state, so the second one used to add a second agent. Refs
  // update instantly, so whichever call comes first claims the turn and the
  // other is ignored.
  const claimedTurnsRef = useRef<Set<string>>(new Set());
  function claimTurn(key: string): boolean {
    if (claimedTurnsRef.current.has(key)) return false;
    claimedTurnsRef.current.add(key);
    return true;
  }
  const lockedSquadRef = useRef<Record<PlayerId, boolean>>({
    p1: false,
    p2: false,
  });
  const controlLockedRef = useRef<Record<PlayerId, boolean>>({
    p1: false,
    p2: false,
  });

  // How this round's squads get built.
  const modId = roundEffects.modifier?.id ?? null;
  const mindControlTarget: PlayerId | null =
    roundEffects.affix?.id === "mind-control"
      ? roundEffects.affix.target
      : null;
  // Puppeteer: both pick 2. Mind Control: only the leader picks 2. Otherwise 3.
  function mainSizeOf(p: PlayerId): number {
    return modId === "puppeteer" || mindControlTarget === p ? 2 : 3;
  }
  // Does p's LAST slot get chosen by the opponent?
  function hasControlSlot(p: PlayerId): boolean {
    return modId === "puppeteer" || mindControlTarget === p;
  }
  // May the opponent choose p's last slot yet?
  //   Puppeteer: only after BOTH players locked their 2.
  //   Mind Control: as soon as the leader locked their 2.
  function controlOpenFor(p: PlayerId): boolean {
    if (!hasControlSlot(p) || controlLocked[p]) return false;
    return modId === "puppeteer"
      ? squadsConfirmed.p1 && squadsConfirmed.p2
      : squadsConfirmed[p];
  }

  // Everything that restricts which agents a player may put in a squad, merged
  // into one tier map (see Logic/squadRules).
  function tiersFor(p: PlayerId) {
    return buildTiers({
      rosterIds: rosters[p].map((a) => a.id),
      cooldowns: grayedOut[p],
      fatigue: fatigue[p],
      immune: immune[p],
      playedBefore: roundEffects.horizontal[p] ? playedHistory[p] : undefined,
    });
  }
  // What the squad screen grays out: rounds-left for each restricted agent.
  const effectiveCooldowns: Record<PlayerId, Record<string, number>> = {
    p1: {},
    p2: {},
  };
  (["p1", "p2"] as PlayerId[]).forEach((p) => {
    const tiers = tiersFor(p);
    Object.keys(tiers).forEach((id) => {
      if ((tiers[id] ?? 0) > 0)
        effectiveCooldowns[p][id] = Math.max(
          grayedOut[p][id] ?? 0,
          fatigue[p][id] ?? 0,
          1,
        );
    });
  });

  // Snapshot the between-round rules read from.
  const interludeCtx: InterludeContext = {
    rosters,
    eliminatedPool,
    lastSquads: squads,
    lastWinner: pendingRoundWinner,
    minRoster: cfg.minRoster,
    immune,
  };

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
    const result = memoRoll("coin", null, () =>
      Math.random() < 0.5 ? "heads" : "tails",
    );
    setCoinResult(result);
    setPriority(result === "heads" ? "p1" : "p2");
  }

  function confirmPriorityAndBegin() {
    setDraftQueue(buildDraftQueue(mode));
    setPhase("ban");
  }

  // Remembers a random result under (slot + the inputs it depended on). Played again
  // from the same point (after a rewind) it returns the SAME result; if the inputs
  // changed (the host chose differently), it rolls fresh.
  function memoRoll<T>(slot: string, inputs: unknown, make: () => T): T {
    const key = `${slot}|${JSON.stringify(inputs ?? null)}`;
    const memo = rollMemoRef.current;
    if (memo.has(key)) return memo.get(key) as T;
    const value = make();
    memo.set(key, value);
    return value;
  }
  const idsOf = (list: Agent[]) => list.map((a) => a.id);

  // ----- The queue-walking primitive -----
  // Moves the draft pointer to index i and reacts to what's there. Takes
  // the index as a plain argument (rather than reading draftPointer state)
  // so it can safely recurse without hitting stale-closure issues when an
  // event turns out to have no eligible outcome.
  function activateQueueIndex(i: number) {
    setDraftPointer(i);
    if (i >= draftQueue.length) {
      setPhase("gameplay");
      startInterlude(cfg.interludes[0] ?? [], null); // e.g. Swiftplay: MOD before round 1
      return;
    }
    const item = draftQueue[i];
    if (item.type === "event") {
      const eventInputs = {
        mode,
        banned,
        gatekeeperActive,
        firedEventIds: draftEventLog.map((e) => e.id),
      };
      const event = memoRoll(`devent:${i}`, eventInputs, () =>
        rollDraftEvent({ ...eventInputs, pool }),
      );
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
    if (!claimTurn(`ban:${banIndex}`)) return;
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

  // The ONE rule for "may this player draft this agent right now?". Both a manual
  // pick and a timeout auto-pick go through it.
  function canPick(p: PlayerId, a: Agent, r: PickRestriction | null): boolean {
    const owned = (pl: PlayerId) => rosters[pl].some((x) => x.id === a.id);
    // can never take an agent you already have; with an exclusive pool, nor one the opponent has
    if (effectiveSharedPool ? owned(p) : owned("p1") || owned("p2"))
      return false;
    if (!r) return !banned.includes(a.id); // normal picks must be unbanned
    if (r.kind === "a-rank") return !a.s_rank && !banned.includes(a.id);
    return (
      !!r.specialties?.includes(a.specialty) &&
      (!!r.includeBanned || !banned.includes(a.id))
    );
  }

  // A forced-pick restriction that nobody can satisfy any more (e.g. every Rupture
  // agent is banned or already taken) is waived for that pick, so the draft can
  // never freeze.
  function effectiveRestriction(p: PlayerId): PickRestriction | null {
    const r = pickRestriction[p];
    if (!r) return null;
    return pool.some((a) => canPick(p, a, r)) ? r : null;
  }
  const effectivePickRestriction: Record<PlayerId, PickRestriction | null> = {
    p1: effectiveRestriction("p1"),
    p2: effectiveRestriction("p2"),
  };

  function draftAgent(agent: Agent) {
    if (!draftItem || draftItem.type !== "pick" || !draftItem.player) return;
    const p = draftItem.player;
    const raw = pickRestriction[p];
    const restriction = effectiveRestriction(p);
    if (rosters[p].length >= cfg.picksPerPlayer) return; // roster already full
    if (!canPick(p, agent, restriction)) return;
    if (!claimTurn(`pick:${draftPointer}`)) return;

    setRosters((r) => ({ ...r, [p]: [...r[p], agent] }));

    if (raw) {
      // a restriction that had to be waived is simply used up
      const remaining = restriction ? raw.picksRemaining - 1 : 0;
      setPickRestriction((pr) => ({
        ...pr,
        [p]: remaining > 0 ? { ...raw, picksRemaining: remaining } : null,
      }));
    }

    advanceDraft();
  }

  function autoResolveDraft() {
    if (!draftItem || draftItem.type !== "pick" || !draftItem.player) return;
    const player = draftItem.player;
    const restriction = effectiveRestriction(player);
    const pick = randomFrom(
      pool.filter((a) => canPick(player, a, restriction)),
    );
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
  function hasUpcomingPick(player: PlayerId): boolean {
    return draftQueue.some(
      (item, i) =>
        i > draftPointer && item.type === "pick" && item.player === player,
    );
  }

  function autoFillPlayerPick(player: PlayerId, agent: Agent) {
    if (!hasUpcomingPick(player)) return; // nothing left to replace -> roster would overflow
    setRosters((r) => ({ ...r, [player]: [...r[player], agent] }));
    setDraftQueue((q) => {
      const idx = q.findIndex(
        (item, i) =>
          i > draftPointer && item.type === "pick" && item.player === player,
      );
      if (idx === -1) return q;
      return [...q.slice(0, idx), ...q.slice(idx + 1)];
    });
  }

  function resolveSoulStone() {
    autoFillPlayerPick("p1", SOUL_STONE_AGENT);
    autoFillPlayerPick("p2", SOUL_STONE_AGENT);
  }

  // Each player gets their OWN random agent (never the same one as each other).
  //  - Never an agent that player already owns.
  //  - Shared pool (Standard): the opponent owning it is fine.
  //  - Exclusive pool (Swiftplay / after Gatekeeper): nothing either player owns.
  function resolveForcedRandomAgent() {
    const owns = (p: PlayerId, id: string) =>
      rosters[p].some((a) => a.id === id);
    const usable = (p: PlayerId, a: Agent) =>
      !banned.includes(a.id) &&
      !owns(p, a.id) &&
      (effectiveSharedPool || !owns(other(p), a.id));

    const { p1Pick, p2Pick } = memoRoll(
      `frand:${draftPointer}`,
      {
        banned,
        shared: effectiveSharedPool,
        p1: idsOf(rosters.p1),
        p2: idsOf(rosters.p2),
      },
      () => {
        const first = randomFrom(pool.filter((a) => usable("p1", a)));
        const second = randomFrom(
          pool.filter((a) => usable("p2", a) && a.id !== first?.id),
        );
        return { p1Pick: first, p2Pick: second };
      },
    );
    if (p1Pick) autoFillPlayerPick("p1", p1Pick);
    if (p2Pick) autoFillPlayerPick("p2", p2Pick);
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
        setExtraBans(
          buildAlternatingTurns(peekNextScheduledPlayer(), 4, false),
        );
        return;
      }
      case "ban-1x": {
        setExtraBans(
          buildAlternatingTurns(peekNextScheduledPlayer(), 2, false),
        );
        return;
      }
      case "forced-downgrade": {
        // Applies to each player's NEXT pick only (not their whole next run of picks).
        setPickRestriction({
          p1: hasUpcomingPick("p1")
            ? { kind: "a-rank", picksRemaining: 1 }
            : null,
          p2: hasUpcomingPick("p2")
            ? { kind: "a-rank", picksRemaining: 1 }
            : null,
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
        // Invitations: each player gets the item in place of their next pick. What it
        // becomes is chosen later, when it is put in a squad.
        const item = MORPH_ITEMS[event.id];
        if (item) {
          autoFillPlayerPick("p1", item.agent);
          autoFillPlayerPick("p2", item.agent);
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
    }
    if (!claimTurn(`xban:${draftPointer}:${extraBans.length}`)) return;
    if (turn.enforceCategoryLock) {
      const group = groupForSpecialty(agent.specialty);
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
      if (
        turn.enforceCategoryLock &&
        waveLockedCategories.includes(groupForSpecialty(a.specialty))
      ) {
        return false;
      }
      return true;
    });
    const pick = randomFrom(eligible);
    if (pick) resolveExtraBan(pick);
  }

  // ----- Boss roll -----

  function rollBoss() {
    const boss = memoRoll(
      `boss:${round}:${roundAttempt}`,
      { last: lastBossId },
      () => pickBoss(BOSS_POOL, lastBossId),
    );
    setCurrentBoss(boss);
    if (boss) setLastBossId(boss.id);
  }

  // The squads are settled. A secret modifier is announced now, before the round
  // starts; otherwise the round starts straight away.
  function startBattle() {
    if (roundEffects.modifier?.hidden) {
      setRoundStage("reveal");
      return;
    }
    afterReveal();
  }

  // Preset Teams: the squads the players picked stay on the line, but a random team
  // (the same for both) is what actually fights. Shown on its own screen first.
  function afterReveal() {
    if (roundEffects.modifier?.id === "preset-teams") {
      const team = memoRoll(`preset:${round}:${roundAttempt}`, null, () =>
        rollPresetTeam(pool),
      );
      setPresetTeam(team);
      setRoundStage("preset");
      return;
    }
    beginScore();
  }

  function acknowledgePreset() {
    if (roundStage !== "preset") return;
    if (!claimTurn(`preset:${round}:${roundAttempt}`)) return;
    beginScore();
  }

  // The reveal screen was acknowledged: the modifier is now public and the round starts.
  function acknowledgeReveal() {
    if (roundStage !== "reveal" || !roundEffects.modifier?.hidden) return;
    if (!claimTurn(`reveal:${round}:${roundAttempt}`)) return;
    setRoundEffects((e) => ({
      ...e,
      modifier: e.modifier ? { ...e.modifier, hidden: false } : null,
    }));
    afterReveal();
  }

  function beginScore() {
    setTimeInputsState({
      p1: { minutes: "", seconds: "" },
      p2: { minutes: "", seconds: "" },
    });
    setSubmitted({ p1: false, p2: false });
    setRoundStage("score");
  }

  function resetSquadBuilding() {
    setSquads({ p1: [], p2: [] });
    setSquadsConfirmed({ p1: false, p2: false });
    lockedSquadRef.current = { p1: false, p2: false };
    controlLockedRef.current = { p1: false, p2: false };
    setControlPicks({ p1: null, p2: null });
    setControlLocked({ p1: false, p2: false });
    setSwapped(false);
    setForcedPick({ p1: null, p2: null });
    setMorphChoices({ p1: {}, p2: {} });
    setPresetTeam(null);
  }

  function confirmBossAndBeginSquad() {
    const mod = roundEffects.modifier?.id;
    resetSquadBuilding();
    if (mod === "tunnel-vision") {
      // One random agent each is already in the squad (and locked there). The
      // players still choose the other two.
      const forced = memoRoll(
        `tv:${round}:${roundAttempt}`,
        { p1: idsOf(rosters.p1), p2: idsOf(rosters.p2) },
        () => rollTunnelVision(rosters),
      );
      setSquads(forced);
      setForcedPick({ p1: forced.p1[0] ?? null, p2: forced.p2[0] ?? null });
    }
    setRoundStage("squad");
  }

  // ----- Squad select -----

  // Restricted agents (cooldown, fatigue, already-played) are grayed out. Lower
  // restriction tiers must be picked first; only then do higher ones unlock.
  function isSquadEligible(player: PlayerId, agentId: string): boolean {
    // an agent that one of the squad's morph items already became can't also be picked
    if (
      !squads[player].includes(agentId) &&
      formsInSquad(player).includes(agentId)
    )
      return false;
    return isSquadPickAllowed(
      rosters[player].map((a) => a.id),
      tiersFor(player),
      squads[player],
      agentId,
      roundEffects.revivedLock[player],
    );
  }

  // ----- Morph items (Soul Stone / Invitations) -----

  const ownedIdsOf = (p: PlayerId) => rosters[p].map((a) => a.id);

  // The agents the morph items in p's squad have turned into (optionally ignoring one item).
  function formsInSquad(p: PlayerId, exceptItem?: string): string[] {
    return squads[p]
      .filter((id) => id !== exceptItem && isMorphItem(id))
      .map((id) => morphChoices[p][id])
      .filter((f): f is string => Boolean(f));
  }

  // What the popup offers for `itemId` right now.
  function morphOptionsFor(p: PlayerId, itemId: string): Agent[] {
    const item = MORPH_ITEMS[itemId];
    if (!item) return [];
    return morphOptions(item, {
      pool,
      banned,
      ownedIds: ownedIdsOf(p),
      takenIds: [
        ...squads[p].filter((id) => !isMorphItem(id)),
        ...formsInSquad(p, itemId),
      ],
    });
  }

  // An Invitation that has become an agent is permanent: the agent takes the item's
  // place in the roster (and the squad) and is an ordinary agent from then on. Soul
  // Stones stay items. An agent the player already owns can't be added twice, so
  // that (Invitation+ only) case stays a temporary form.
  function splitInvitations(
    p: PlayerId,
    squad: string[],
    forms: Record<string, string>,
  ): {
    squad: string[];
    forms: Record<string, string>;
    swaps: Record<string, Agent>;
  } {
    const owned = ownedIdsOf(p);
    const swaps: Record<string, Agent> = {};
    const rest: Record<string, string> = {};
    Object.entries(forms).forEach(([itemId, agentId]) => {
      const agent = pool.find((a) => a.id === agentId);
      const item = MORPH_ITEMS[itemId];
      if (item && !item.soulStone && agent && !owned.includes(agentId))
        swaps[itemId] = agent;
      else rest[itemId] = agentId;
    });
    return {
      squad: squad.map((id) => swaps[id]?.id ?? id),
      forms: rest,
      swaps,
    };
  }

  function applyRosterSwaps(p: PlayerId, swaps: Record<string, Agent>) {
    if (Object.keys(swaps).length === 0) return;
    setRosters((r) => ({
      ...r,
      [p]: r[p].map((a) => swaps[a.id] ?? a),
    }));
    setForcedPick((f) => {
      const forced = f[p];
      return forced && swaps[forced] ? { ...f, [p]: swaps[forced].id } : f;
    });
  }

  // Popup result. For an item that is not in the squad yet this is also the "pick":
  // the item joins the squad together with its chosen form. (A Tunnel Vision item is
  // already in the squad, so only the form is set.)
  function chooseMorph(p: PlayerId, itemId: string, agentId: string) {
    if (squadsConfirmed[p] || lockedSquadRef.current[p]) return;
    if (!morphOptionsFor(p, itemId).some((a) => a.id === agentId)) return;
    if (!squads[p].includes(itemId)) {
      if (squads[p].length >= mainSizeOf(p)) return;
      if (
        !isSquadPickAllowed(
          ownedIdsOf(p),
          tiersFor(p),
          squads[p],
          itemId,
          roundEffects.revivedLock[p],
        )
      )
        return;
      setSquads((s) =>
        s[p].includes(itemId) ? s : { ...s, [p]: [...s[p], itemId] },
      );
    }
    const conv = splitInvitations(
      p,
      squads[p].includes(itemId) ? squads[p] : [...squads[p], itemId],
      { [itemId]: agentId },
    );
    if (conv.swaps[itemId]) {
      // the Invitation is used up: its agent is now a permanent part of the roster
      setSquads((s) => ({
        ...s,
        [p]: s[p].map((id) => (id === itemId ? agentId : id)),
      }));
      applyRosterSwaps(p, conv.swaps);
      return;
    }
    setMorphChoices((m) => ({ ...m, [p]: { ...m[p], [itemId]: agentId } }));
  }

  // Every morph item in `squad` keeps its chosen form; the ones without one (timeout,
  // opponent-chosen slot) get a random legal form.
  function resolveMorphs(p: PlayerId, squad: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    squad.forEach((id) => {
      const form = morphChoices[p][id];
      if (isMorphItem(id) && form) out[id] = form;
    });
    squad.filter(isMorphItem).forEach((id) => {
      if (out[id]) return;
      const options = morphOptions(MORPH_ITEMS[id], {
        pool,
        banned,
        ownedIds: ownedIdsOf(p),
        takenIds: [
          ...squad.filter((x) => !isMorphItem(x)),
          ...Object.values(out),
        ],
      });
      const pick = randomFrom(options);
      if (pick) out[id] = pick.id;
    });
    return out;
  }

  function morphsResolved(p: PlayerId): boolean {
    return squads[p]
      .filter(isMorphItem)
      .every((id) => Boolean(morphChoices[p][id]));
  }

  function toggleSquadAgent(player: PlayerId, agent: Agent) {
    if (squadsConfirmed[player] || lockedSquadRef.current[player]) return;
    if (forcedPick[player] === agent.id) return; // Tunnel Vision's pick is not optional
    if (isMorphItem(agent.id) && squads[player].includes(agent.id)) {
      // taking a morph item out of the squad forgets what it had become
      setMorphChoices((m) => {
        const rest = { ...m[player] };
        delete rest[agent.id];
        return { ...m, [player]: rest };
      });
    }
    const fixed = forcedPick[player] ? [forcedPick[player] as string] : [];
    const rosterIds = rosters[player].map((a) => a.id);
    const tiers = tiersFor(player);
    const lock = roundEffects.revivedLock[player];
    const size = mainSizeOf(player);
    setSquads((s) => {
      const current = s[player];
      if (current.includes(agent.id)) {
        // Deselecting an agent can make a picked restricted agent illegal again.
        const without = current.filter((id) => id !== agent.id);
        return {
          ...s,
          [player]: sanitizeSquad(rosterIds, tiers, without, lock, fixed),
        };
      }
      if (current.length >= size) return s; // this step only takes `size` agents
      if (isMorphItem(agent.id)) return s; // morph items are added through chooseMorph (the popup)
      if (
        current
          .filter(isMorphItem)
          .some((id) => morphChoices[player][id] === agent.id)
      )
        return s; // a morph item in this squad already became this agent
      if (!isSquadPickAllowed(rosterIds, tiers, current, agent.id, lock))
        return s;
      return { ...s, [player]: [...current, agent.id] };
    });
  }

  function confirmSquad(player: PlayerId) {
    if (squads[player].length !== mainSizeOf(player)) return;
    if (!morphsResolved(player)) return; // every Soul Stone / Invitation needs its form
    lockInSquad(player);
  }

  function autoResolveSquad(player: PlayerId) {
    if (squadsConfirmed[player] || lockedSquadRef.current[player]) return;
    const filled = autoFillSquad(
      rosters[player].map((a) => a.id),
      tiersFor(player),
      squads[player],
      roundEffects.revivedLock[player],
      Math.random,
      mainSizeOf(player),
      forcedPick[player] ? [forcedPick[player] as string] : [],
    );
    const conv = splitInvitations(player, filled, resolveMorphs(player, filled));
    setSquads((s) => ({ ...s, [player]: conv.squad }));
    setMorphChoices((m) => ({ ...m, [player]: conv.forms }));
    applyRosterSwaps(player, conv.swaps);
    lockInSquad(player);
  }

  // The squad stage ends when everyone locked their picks AND every
  // opponent-chosen slot has been locked.
  function finishSquadStageIfDone() {
    const mainDone = lockedSquadRef.current.p1 && lockedSquadRef.current.p2;
    const controlDone = (["p1", "p2"] as PlayerId[]).every(
      (p) => !hasControlSlot(p) || controlLockedRef.current[p],
    );
    if (!mainDone || !controlDone) return;
    if (modId === "armory-swap") setSwapped(true); // each plays the OTHER's squad
    startBattle();
  }

  function lockInSquad(player: PlayerId) {
    // The ref makes this safe if confirm + timeout (or both players' timeouts)
    // fire in the same render: each player locks once and nobody's lock is lost.
    if (lockedSquadRef.current[player]) return;
    lockedSquadRef.current = { ...lockedSquadRef.current, [player]: true };
    setSquadsConfirmed({ ...lockedSquadRef.current });
    finishSquadStageIfDone();
  }

  // ----- The opponent picks your last agent (Puppeteer / Mind Control) -----
  // `controller` is the player doing the choosing; the agent goes to the OTHER one.

  function isControlEligible(controller: PlayerId, agentId: string): boolean {
    const target = other(controller);
    if (squads[target].includes(agentId)) return false; // already one of their 2 picks
    if (formsInSquad(target).includes(agentId)) return false; // one of their items already became it
    return isSquadPickAllowed(
      rosters[target].map((a) => a.id),
      tiersFor(target),
      squads[target],
      agentId,
      roundEffects.revivedLock[target],
    );
  }

  function toggleControlPick(controller: PlayerId, agent: Agent) {
    const target = other(controller);
    if (!controlOpenFor(target) || controlLockedRef.current[target]) return;
    if (!isControlEligible(controller, agent.id)) return;
    setControlPicks((c) => ({
      ...c,
      [target]: c[target] === agent.id ? null : agent.id,
    }));
  }

  function lockControl(target: PlayerId, agentId: string) {
    if (controlLockedRef.current[target]) return;
    controlLockedRef.current = { ...controlLockedRef.current, [target]: true };
    setControlLocked({ ...controlLockedRef.current });
    setControlPicks((c) => ({ ...c, [target]: agentId }));
    // the chosen agent becomes the target's last squad slot
    if (isMorphItem(agentId)) {
      // the opponent chose a Soul Stone / Invitation for them: its form is rolled for them
      const full = [...squads[target], agentId];
      const conv = splitInvitations(target, full, resolveMorphs(target, full));
      setSquads((s) => ({ ...s, [target]: conv.squad }));
      setMorphChoices((m) => ({ ...m, [target]: conv.forms }));
      applyRosterSwaps(target, conv.swaps);
    } else {
      setSquads((s) => ({ ...s, [target]: [...s[target], agentId] }));
    }
    finishSquadStageIfDone();
  }

  function confirmControl(controller: PlayerId) {
    const target = other(controller);
    const pick = controlPicks[target];
    if (!pick || !controlOpenFor(target)) return;
    if (!isControlEligible(controller, pick)) return;
    lockControl(target, pick);
  }

  function autoResolveControl(controller: PlayerId) {
    const target = other(controller);
    if (!controlOpenFor(target) || controlLockedRef.current[target]) return;
    const current = controlPicks[target];
    const options = rosters[target].filter((a) =>
      isControlEligible(controller, a.id),
    );
    const chosen =
      current && options.some((a) => a.id === current)
        ? current
        : randomFrom(options)?.id;
    if (chosen) lockControl(target, chosen);
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
    if (!hasTime(t)) return;

    const next = { ...submitted, [player]: true };
    setSubmitted(next);
    if (next.p1 && next.p2) {
      resolveRoundNormal();
    }
  }

  function resolveRoundNormal() {
    // "Hold on, Wait for me!" adds its seconds to the target's total time.
    const t1 = timeSeconds(timeInputs.p1) + roundEffects.timePenalty.p1;
    const t2 = timeSeconds(timeInputs.p2) + roundEffects.timePenalty.p2;
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
      submitted.p1 && hasTime(timeInputs.p1)
        ? timeSeconds(timeInputs.p1)
        : 0;
    const t2 =
      submitted.p2 && hasTime(timeInputs.p2)
        ? timeSeconds(timeInputs.p2)
        : 0;
    finalizeRound(loser, t1, t2, "timeout");
  }

  // Armory Swap squads can include agents the loser doesn't own, so that round lets
  // the loser remove ANY agents from their roster. Preset Teams is not one of them:
  // the squad the player picked beforehand is what is on the line.
  function removalFromWholeRoster(): boolean {
    return roundEffects.modifier?.id === "armory-swap";
  }

  // Soul Stones stay visible on the removal screen, already selected and
  // locked. It counts toward the removal count, so the loser only chooses the
  // rest. Nothing leaves the roster until the removal is confirmed.
  function removalCountFor(p: PlayerId): number {
    return lossPenalty[p] > 0 ? lossPenalty[p] : REMOVAL_COUNT;
  }

  function buildPendingRemovalFor(loser: PlayerId): PendingRemoval {
    const count = removalCountFor(loser);
    // Soul Stones used in a lost round are always removed first.
    const { pool, locked } = removalPlan({
      squad: squads[loser],
      rosterIds: rosters[loser].map((a) => a.id),
      wholeRoster: removalFromWholeRoster(),
      count,
      isForced: isSoulStone, // Invitations become real agents once used
    });
    return { player: loser, count, pool, locked };
  }

  // Remember who has played (Horizontal Investment): the squads the players picked.
  function recordPlayed() {
    setPlayedHistory((h) => ({
      p1: Array.from(new Set([...h.p1, ...squads.p1])),
      p2: Array.from(new Set([...h.p2, ...squads.p2])),
    }));
  }

  function finalizeRound(
    loser: PlayerId | null,
    t1: number,
    t2: number,
    outcome: RoundLogEntry["outcome"],
  ) {
    if (!claimTurn(`round:${round}:${roundAttempt}`)) return; // this attempt was already resolved
    const winnerOfRound = loser ? other(loser) : null;
    setRoundLog((log) => [
      ...log,
      {
        round,
        t1,
        t2,
        winner: winnerOfRound,
        boss: currentBoss?.name,
        outcome,
      },
    ]);
    recordPlayed();

    // A tied round is simply played again (new boss) until somebody wins, so
    // there is always a clear leader when an affix screen comes up.
    if (!loser) {
      replayRound({ p1: [], p2: [] });
      return;
    }

    setRoundWins((w) => ({ ...w, [other(loser)]: w[other(loser)] + 1 }));
    setPendingRoundWinner(other(loser));

    // Removal takes `count` agents; a loser who couldn't field a full squad
    // afterwards has lost the match.
    if (
      lossEndsMatch(
        rosters[loser].length,
        cfg.minRoster,
        removalCountFor(loser),
      )
    ) {
      setWinner(other(loser));
      setPhase("gameover");
      return;
    }

    const removal = buildPendingRemovalFor(loser);
    setPendingRemovals([removal]);
    setRemovalSelection(removal.locked ?? []);
  }

  // Nobody submitted a time: both players pay the removal, then the round is replayed.
  function finalizeDoubleLoss() {
    if (!claimTurn(`round:${round}:${roundAttempt}`)) return;
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
    recordPlayed();
    setPendingRoundWinner(null); // nobody won this round

    if (
      lossEndsMatch(rosters.p1.length, cfg.minRoster, removalCountFor("p1"))
    ) {
      setWinner("p2");
      setPhase("gameover");
      return;
    }
    if (
      lossEndsMatch(rosters.p2.length, cfg.minRoster, removalCountFor("p2"))
    ) {
      setWinner("p1");
      setPhase("gameover");
      return;
    }

    const p1Removal = buildPendingRemovalFor("p1");
    const p2Removal = buildPendingRemovalFor("p2");
    setPendingRemovals([p1Removal, p2Removal]);
    setRemovalSelection(p1Removal.locked ?? []);
  }

  // Same round number, new boss, fresh squads. Active modifiers/affixes stay on.
  function replayRound(eliminated: Record<PlayerId, string[]>) {
    setGrayedOut((g) => ({
      p1: Object.fromEntries(
        Object.entries(g.p1).filter(([id]) => !eliminated.p1.includes(id)),
      ),
      p2: Object.fromEntries(
        Object.entries(g.p2).filter(([id]) => !eliminated.p2.includes(id)),
      ),
    }));
    setEliminatedThisRound({ p1: [], p2: [] });
    setRoundAttempt((a) => a + 1);
    setCurrentBoss(null);
    resetSquadBuilding();
    setSubmitted({ p1: false, p2: false });
    setRoundStage("boss");
  }

  // Returns true if the match just ended.
  function proceedAfterRound(): boolean {
    if (round === cfg.rounds && roundWins.p1 !== roundWins.p2) {
      setWinner(roundWins.p1 > roundWins.p2 ? "p1" : "p2");
      setPhase("gameover");
      return true;
    }
    setRound((r) => r + 1);
    return false;
  }

  function finishRoundAndAdvance(
    eliminated: Record<PlayerId, string[]>,
    roundWinner: PlayerId | null,
    projected: {
      rosters: Record<PlayerId, Agent[]>;
      eliminatedPool: Record<PlayerId, Agent[]>;
    },
  ) {
    if (roundWinner === null) {
      replayRound(eliminated); // double timeout: removals are done, the round repeats
      return;
    }

    // Safety net: a level score after regulation goes to overtime (first to
    // OVERTIME_STREAK_TO_WIN wins in a row). Rounds are decisive, so this is rare.
    if (round > cfg.rounds) {
      const next: Record<PlayerId, number> = {
        p1: roundWinner === "p1" ? overtimeStreak.p1 + 1 : 0,
        p2: roundWinner === "p2" ? overtimeStreak.p2 + 1 : 0,
      };
      setOvertimeStreak(next);
      if (next[roundWinner] >= OVERTIME_STREAK_TO_WIN) {
        setWinner(roundWinner);
        setPhase("gameover");
        return;
      }
    }

    const nextGrayed: Record<PlayerId, Record<string, number>> = {
      p1: {},
      p2: {},
    };
    (["p1", "p2"] as PlayerId[]).forEach((p) => {
      nextGrayed[p] = nextCooldowns({
        rosterIds: rosters[p].map((a) => a.id),
        cooldowns: grayedOut[p],
        squad: squads[p],
        eliminated: eliminated[p], // only THIS player's eliminations
        cooldownRounds: COOLDOWN_ROUNDS,
        immune: immune[p],
      });
    });
    setGrayedOut(nextGrayed);
    // Overworked fatigue ticks down once per decided round.
    setFatigue((f) => {
      const tick = (m: Record<string, number>) =>
        Object.fromEntries(
          Object.entries(m)
            .filter(([, n]) => n - 1 > 0)
            .map(([id, n]) => [id, n - 1]),
        );
      return { p1: tick(f.p1), p2: tick(f.p2) };
    });
    setRoundEffects(EMPTY_EFFECTS); // everything else lasted this one round
    setEliminatedThisRound({ p1: [], p2: [] });
    setCurrentBoss(null);

    if (proceedAfterRound()) return;
    // Between rounds: affix / modifier screens, then the boss roll.
    startInterlude(cfg.interludes[round] ?? [], {
      rosters: projected.rosters,
      eliminatedPool: projected.eliminatedPool,
      lastSquads: squads,
      lastWinner: roundWinner,
      minRoster: cfg.minRoster,
      immune,
    });
  }

  function toggleRemoval(agentId: string) {
    if (pendingRemoval?.locked?.includes(agentId)) return; // Soul Stones used this round are always removed
    setRemovalSelection((sel) =>
      sel.includes(agentId)
        ? sel.filter((id) => id !== agentId)
        : [...sel, agentId],
    );
  }

  function confirmRemoval() {
    const current = pendingRemovals[0];
    if (!current || removalSelection.length !== current.count) return;
    if (!(current.locked ?? []).every((id) => removalSelection.includes(id)))
      return;
    const { player } = current;

    const removedAgents = rosters[player].filter((a) =>
      removalSelection.includes(a.id),
    );
    const nextRosters = {
      ...rosters,
      [player]: rosters[player].filter((a) => !removalSelection.includes(a.id)),
    };
    const nextPool = {
      ...eliminatedPool,
      [player]: [
        ...eliminatedPool[player],
        ...removedAgents.filter((a) => !isMorphItem(a.id)),
      ],
    };
    setRosters(nextRosters);
    setEliminatedPool(nextPool);
    setLossPenalty((l) => ({ ...l, [player]: 0 })); // the heavier loss has been paid

    const allEliminated: Record<PlayerId, string[]> = {
      ...eliminatedThisRound,
      [player]: [...eliminatedThisRound[player], ...removalSelection],
    };
    setEliminatedThisRound(allEliminated);

    const rest = pendingRemovals.slice(1);
    setPendingRemovals(rest);
    setRemovalSelection(rest[0]?.locked ?? []);

    if (rest.length === 0) {
      finishRoundAndAdvance(allEliminated, pendingRoundWinner, {
        rosters: nextRosters,
        eliminatedPool: nextPool,
      });
    }
  }

  // ===================== Between-round screens =====================

  // Shows the next screen in the queue (affix / modifier), or goes to the boss roll.
  function startInterlude(
    queue: InterludeKind[],
    ctx: InterludeContext | null,
  ) {
    if (queue.length === 0) {
      setInterludeQueue([]);
      setRoundStage("boss");
      return;
    }
    const [head, ...rest] = queue;
    setInterludeQueue(rest);

    if (head === "modifier") {
      const roll = memoRoll(`modroll:${round}:${queue.join("+")}`, null, () =>
        rollModifier(),
      );
      if (!roll) {
        startInterlude(rest, ctx);
        return;
      }
      setModifierRoll(roll);
      setRoundStage("modifier");
      return;
    }

    // affix: the leader gets the negative, the loser chooses. No leader, no affix.
    const leader = leaderOf(roundWins);
    const exclude = rest.includes("modifier") ? ["mind-control"] : [];
    const offer =
      ctx && leader
        ? memoRoll(
            `affixoffer:${round}`,
            {
              leader,
              exclude,
              p1: idsOf(ctx.rosters.p1),
              p2: idsOf(ctx.rosters.p2),
              pool1: idsOf(ctx.eliminatedPool.p1),
              pool2: idsOf(ctx.eliminatedPool.p2),
              last: ctx.lastSquads,
              winner: ctx.lastWinner,
              immune: ctx.immune,
            },
            () => rollAffixOffer(ctx, leader, Math.random, exclude),
          )
        : null;
    if (!offer) {
      startInterlude(rest, ctx);
      return;
    }
    setAffixOffer(offer);
    setAffixChoice(null);
    setAffixSelection([]);
    setNecroStage("sacrifice");
    setNecroSacrificed([]);
    setRoundStage("affix");
  }

  // The LOSING player decides: a positive for themselves, or a negative for the leader.
  function chooseAffix(kind: "positive" | "negative") {
    if (!affixOffer || affixChoice) return;
    const def = kind === "positive" ? affixOffer.positive : affixOffer.negative;
    if (!def) return;
    if (!claimTurn(`affix-choice:${round}`)) return; // first click wins, even in the same render
    setAffixChoice({
      def,
      target: kind === "positive" ? affixOffer.chooser : affixOffer.leader,
    });
    setAffixSelection([]);
    setNecroStage("sacrifice");
    setNecroSacrificed([]);
  }

  // What the picker under the reveal screen should offer for the chosen affix.
  function computeAffixPick(): AffixPickSpec | null {
    if (!affixChoice) return null;
    const { def, target } = affixChoice;
    const roster = rosters[target];
    const byId = (ids: string[]) => roster.filter((a) => ids.includes(a.id));
    const wasted = (label: string): AffixPickSpec => ({
      candidates: [],
      min: 0,
      max: 0,
      label,
      noEffect: true,
    });
    switch (def.id) {
      case "kamikaze":
        if (!kamikazeApplies(interludeCtx, target))
          return wasted(
            "NO EFFECT — Kamikaze can’t touch this player right now.",
          );
        return {
          candidates: byId(kamikazeCandidates(interludeCtx, target)),
          min: 2,
          max: 2,
          label: "CHOOSE 2 AGENTS FROM LAST ROUND TO ELIMINATE",
        };
      case "overtime-contract": {
        const c = byId(contractCandidates(interludeCtx, target));
        return c.length
          ? {
              candidates: c,
              min: 1,
              max: 1,
              label: "CHOOSE 1 AGENT TO WORK OVERTIME",
            }
          : wasted(
              "NO EFFECT — nobody from last round is left to work overtime.",
            );
      }
      case "emergency-reinforcements":
        return {
          candidates: ownRevivable(interludeCtx, target),
          min: 1,
          max: 1,
          label: "CHOOSE 1 ELIMINATED AGENT TO BRING BACK",
        };
      case "soul-stone-affix":
      case "soul-stone-plus-affix":
        return {
          candidates: roster.filter((a) => !isSoulStone(a.id)),
          min: 1,
          max: 1,
          label: "CHOOSE 1 AGENT TO DISCARD",
        };
      case "spell-of-necromancy": {
        const revivable = anyRevivable(interludeCtx, target);
        if (necroStage === "sacrifice") {
          const cand = roster.filter((a) => !isSoulStone(a.id));
          return {
            candidates: cand,
            min: 0,
            max: Math.min(2, revivable.length, cand.length),
            label: "CHOOSE 1 OR 2 OF YOUR AGENTS TO SWAP OUT",
            optional: true,
          };
        }
        return {
          candidates: revivable,
          min: necroSacrificed.length,
          max: necroSacrificed.length,
          label: `CHOOSE ${necroSacrificed.length} ELIMINATED AGENT${necroSacrificed.length > 1 ? "S" : ""} TO REVIVE`,
        };
      }
      default:
        return null;
    }
  }

  function toggleAffixPick(agentId: string) {
    const spec = computeAffixPick();
    if (!spec || !spec.candidates.some((a) => a.id === agentId)) return;
    setAffixSelection((sel) => {
      if (sel.includes(agentId)) return sel.filter((id) => id !== agentId);
      if (sel.length >= spec.max) return sel; // the list is full (grayed out)
      return [...sel, agentId];
    });
  }

  function dropCooldownEntries(p: PlayerId, ids: string[]) {
    const strip = (m: Record<string, number>) =>
      Object.fromEntries(Object.entries(m).filter(([id]) => !ids.includes(id)));
    setGrayedOut((g) => ({ ...g, [p]: strip(g[p]) }));
    setFatigue((f) => ({ ...f, [p]: strip(f[p]) }));
  }

  function finishAffix(
    def: AffixChoice["def"],
    target: PlayerId,
    note: string,
  ) {
    setRoundEffects((e) => ({
      ...e,
      affix: {
        id: def.id,
        title: def.title,
        desc: def.desc,
        polarity: def.polarity,
        target,
        note,
      },
    }));
    setAffixOffer(null);
    setAffixChoice(null);
    setAffixSelection([]);
    setNecroSacrificed([]);
    setNecroStage("sacrifice");
    startInterlude(interludeQueue, null);
  }

  // The CONTINUE / CONFIRM / SKIP button under the affix reveal.
  function confirmAffix() {
    if (!affixChoice) return;
    const { def, target } = affixChoice;
    const spec = computeAffixPick();
    const sel = affixSelection;

    // Necromancy, step 1: the list of your own agents. Nothing chosen = Skip.
    if (
      def.id === "spell-of-necromancy" &&
      necroStage === "sacrifice" &&
      sel.length > 0
    ) {
      setNecroSacrificed(sel);
      setAffixSelection([]);
      setNecroStage("revive");
      return;
    }
    if (spec && !spec.noEffect && !spec.optional && sel.length < spec.min)
      return;
    if (
      spec &&
      !spec.noEffect &&
      necroStage === "revive" &&
      sel.length !== spec.min
    )
      return;
    if (!claimTurn(`affix:${round}`)) return; // confirm once per screen

    const dropped = (ids: string[]) => {
      const agents = rosters[target].filter(
        (a) => ids.includes(a.id) && !isSoulStone(a.id),
      );
      setEliminatedPool((ep) => ({
        ...ep,
        [target]: [...ep[target], ...agents],
      }));
      dropCooldownEntries(target, ids);
    };
    let note = "";

    switch (def.id) {
      case "horizontal-investment":
        setRoundEffects((e) => ({
          ...e,
          horizontal: { ...e.horizontal, [target]: true },
        }));
        break;
      case "hold-on-wait-for-me":
        setRoundEffects((e) => ({
          ...e,
          timePenalty: { ...e.timePenalty, [target]: 10 },
        }));
        break;
      case "overworked": {
        const victim = memoRoll(
          `overworked:${round}:${target}`,
          { roster: idsOf(rosters[target]), immune: immune[target] },
          () =>
            randomFrom(
              rosters[target].filter((a) => !immune[target].includes(a.id)),
            ),
        );
        if (victim) {
          setFatigue((f) => ({
            ...f,
            [target]: { ...f[target], [victim.id]: 2 },
          }));
          note = `${victim.name} is fatigued for 2 rounds.`;
        }
        break;
      }
      case "kamikaze":
        if (!spec?.noEffect && sel.length === 2) {
          setRosters((r) => ({
            ...r,
            [target]: r[target].filter((a) => !sel.includes(a.id)),
          }));
          dropped(sel);
          note = "2 Agents eliminated.";
        } else note = "No effect.";
        break;
      case "overtime-contract":
        if (!spec?.noEffect && sel.length === 1) {
          setImmune((i) => ({ ...i, [target]: [...i[target], sel[0]] }));
          dropCooldownEntries(target, sel);
          note = "Immune to fatigue from now on.";
        } else note = "No effect.";
        break;
      case "emergency-reinforcements": {
        const back = ownRevivable(interludeCtx, target).find(
          (a) => a.id === sel[0],
        );
        if (back) {
          setRosters((r) => ({ ...r, [target]: [...r[target], back] }));
          setEliminatedPool((ep) => takeFromPool(ep, target, [back.id]));
          setLossPenalty((l) => ({ ...l, [target]: 3 }));
          note = `${back.name} is back. Next loss costs 3 Agents.`;
        }
        break;
      }
      case "soul-stone-affix":
      case "soul-stone-plus-affix":
        if (sel.length === 1) {
          setRosters((r) => ({
            ...r,
            [target]: r[target].map((a) =>
              a.id === sel[0]
                ? def.id === "soul-stone-plus-affix"
                  ? SOUL_STONE_PLUS_AGENT
                  : SOUL_STONE_AGENT
                : a,
            ),
          }));
          dropped(sel);
        }
        break;
      case "spell-of-necromancy": {
        if (
          necroSacrificed.length === 0 ||
          sel.length !== necroSacrificed.length
        ) {
          note = "Skipped — no Agents swapped.";
          break;
        }
        const revived = anyRevivable(interludeCtx, target).filter((a) =>
          sel.includes(a.id),
        );
        setRosters((r) => ({
          ...r,
          [target]: [
            ...r[target].filter((a) => !necroSacrificed.includes(a.id)),
            ...revived,
          ],
        }));
        const sacrificedAgents = rosters[target].filter((a) =>
          necroSacrificed.includes(a.id),
        );
        setEliminatedPool((ep) => {
          const taken = takeFromPool(ep, target, sel);
          return {
            ...taken,
            [target]: [...taken[target], ...sacrificedAgents],
          };
        });
        dropCooldownEntries(target, necroSacrificed);
        if (revived.length === 2) {
          // the two revived agents can't both play in the next battle (unless forced)
          setRoundEffects((e) => ({
            ...e,
            revivedLock: {
              ...e.revivedLock,
              [target]: revived.map((a) => a.id),
            },
          }));
        }
        note = `Swapped ${necroSacrificed.length} Agent${necroSacrificed.length > 1 ? "s" : ""}.`;
        break;
      }
    }
    finishAffix(def, target, note);
  }

  // Universal modifier: reveal, acknowledge, and it applies to the next battle.
  function acknowledgeModifier() {
    if (!modifierRoll) return;
    if (!claimTurn(`mod:${round}:${interludeQueue.length}`)) return;
    setRoundEffects((e) => ({
      ...e,
      modifier: {
        id: modifierRoll.id,
        title: modifierRoll.title,
        hidden: !!modifierRoll.secret,
      },
    }));
    setModifierRoll(null);
    startInterlude(interludeQueue, null);
  }

  function resetGame() {
    historyRef.current = [];
    lastKeyRef.current = null;
    rollMemoRef.current = new Map();
    setHistoryCount(0);
    setPaused(false);
    setEpoch((n) => n + 1);
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
    setOvertimeStreak({ p1: 0, p2: 0 });
    setPendingRoundWinner(null);
    setRoundStage("boss");
    setCurrentBoss(null);
    setLastBossId(null);
    setPresetTeam(null);
    setSquads({ p1: [], p2: [] });
    setSquadsConfirmed({ p1: false, p2: false });
    setGrayedOut({ p1: {}, p2: {} });
    setSubmitted({ p1: false, p2: false });
    setEliminatedThisRound({ p1: [], p2: [] });
    claimedTurnsRef.current = new Set();
    lockedSquadRef.current = { p1: false, p2: false };
    setRoundAttempt(0);
    setEliminatedPool({ p1: [], p2: [] });
    setFatigue({ p1: {}, p2: {} });
    setImmune({ p1: [], p2: [] });
    setPlayedHistory({ p1: [], p2: [] });
    setLossPenalty({ p1: 0, p2: 0 });
    setRoundEffects(EMPTY_EFFECTS);
    setInterludeQueue([]);
    setAffixOffer(null);
    setAffixChoice(null);
    setAffixSelection([]);
    setNecroStage("sacrifice");
    setNecroSacrificed([]);
    setModifierRoll(null);
    setControlPicks({ p1: null, p2: null });
    setControlLocked({ p1: false, p2: false });
    controlLockedRef.current = { p1: false, p2: false };
    setSwapped(false);
    setForcedPick({ p1: null, p2: null });
    setMorphChoices({ p1: {}, p2: {} });
    setTimeInputsState({
      p1: { minutes: "", seconds: "" },
      p2: { minutes: "", seconds: "" },
    });
    setPendingRemovals([]);
    setRemovalSelection([]);
    setRoundLog([]);
    setWinner(null);
  }

  const affixPick = computeAffixPick();

  // ===================== Host tempo: history, rewind, pause =====================

  // A snapshot is saved whenever a MEANINGFUL step happens (a ban, a pick, a locked
  // squad, a confirmed time, an affix choice...). Tentative clicks - toggling an
  // agent, typing a time - don't count, so one rewind press undoes one real action.
  const milestoneKey = JSON.stringify([
    phase,
    roundStage,
    round,
    roundAttempt,
    winner,
    priority,
    coinResult,
    banned.length,
    banIndex,
    draftPointer,
    extraBans?.length ?? -1,
    activeDraftEvent?.id ?? null,
    draftEventLog.length,
    rosters.p1.length,
    rosters.p2.length,
    roundWins,
    roundLog.length,
    squadsConfirmed,
    controlLocked,
    submitted,
    swapped,
    pendingRemovals.length,
    interludeQueue.length,
    affixOffer ? 1 : 0,
    affixChoice?.def.id ?? null,
    necroStage,
    necroSacrificed.length,
    modifierRoll?.id ?? null,
    currentBoss?.name ?? null,
    roundEffects.modifier?.id ?? null,
    roundEffects.affix?.id ?? null,
  ]);

  function takeSnapshot(): Snapshot {
    return {
      key: milestoneKey,
      values: trackerRef.current.entries.map((e) => e.value),
      claimed: Array.from(claimedTurnsRef.current),
      locked: { ...lockedSquadRef.current },
      control: { ...controlLockedRef.current },
    };
  }

  useEffect(() => {
    if (phase === "setup") return; // history starts at the coin toss
    if (lastKeyRef.current === milestoneKey) return;
    lastKeyRef.current = milestoneKey;
    const h = historyRef.current;
    h.push(takeSnapshot());
    if (h.length > HISTORY_LIMIT) h.shift();
    setHistoryCount(h.length);
  });

  // Back one step: restores every piece of game state (and the "already resolved"
  // markers) to how it was at the previous milestone. Clocks start fresh.
  function rewind() {
    const h = historyRef.current;
    if (h.length < 2) return;
    h.pop();
    const target = h[h.length - 1];
    trackerRef.current.entries.forEach((e, i) => e.set(target.values[i]));
    claimedTurnsRef.current = new Set(target.claimed);
    lockedSquadRef.current = { ...target.locked };
    controlLockedRef.current = { ...target.control };
    lastKeyRef.current = target.key;
    setHistoryCount(h.length);
    setEpoch((n) => n + 1);
  }

  function togglePause() {
    setPaused((v) => !v);
  }
  const battleSquads: Record<PlayerId, string[]> = presetTeam
    ? { p1: presetTeam, p2: presetTeam }
    : swapped
      ? { p1: squads.p2, p2: squads.p1 }
      : squads;
  // morph forms belong to whoever built the squad, so they swap along with it
  const battleMorphs: Record<PlayerId, Record<string, string>> = presetTeam
    ? { p1: {}, p2: {} }
    : swapped
      ? { p1: morphChoices.p2, p2: morphChoices.p1 }
      : morphChoices;

  return {
    mode,
    phase,
    draftTurnKey,
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
    pickRestriction: effectivePickRestriction, // what the UI should enforce for the current pick
    extraBans,
    waveLockedCategories,
    round,
    roundWins,
    overtimeStreak,
    roundStage,
    currentBoss,
    squads,
    squadsConfirmed,
    grayedOut: effectiveCooldowns, // everything the squad screen should gray out
    rawCooldowns: grayedOut, // only the normal "played last round" cooldown
    fatigue,
    immune,
    playedHistory,
    lossPenalty,
    eliminatedPool,
    roundAttempt,
    roundEffects,
    affixOffer,
    affixChoice,
    affixSelection,
    affixPick,
    necroStage,
    necroSacrificed,
    modifierRoll,
    paused,
    togglePause,
    rewind,
    canRewind: historyCount > 1,
    historyCount,
    epoch,
    squadPlan: {
      mainSize: { p1: mainSizeOf("p1"), p2: mainSizeOf("p2") },
      hasControlSlot: { p1: hasControlSlot("p1"), p2: hasControlSlot("p2") },
      controlOpen: { p1: controlOpenFor("p1"), p2: controlOpenFor("p2") },
      controlPicks,
      controlLocked,
      forced: forcedPick,
    },
    battleSquads, // what each player actually plays (swapped under Armory Swap)
    morphChoices,
    battleMorphs,
    presetTeam,
    acknowledgePreset,
    morphOptionsFor,
    chooseMorph,
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
    isControlEligible,
    toggleControlPick,
    confirmControl,
    autoResolveControl,
    chooseAffix,
    toggleAffixPick,
    confirmAffix,
    acknowledgeModifier,
    acknowledgeReveal,

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
