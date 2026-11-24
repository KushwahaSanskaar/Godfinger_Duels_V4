import type {
  DraftQueueItem,
  InterludeKind,
  ModeConfig,
  Phase,
  PlayerId,
  RoundLogEntry,
  RoundStage,
} from "../types";

export type TimelineNodeKind =
  | "ban"
  | "event"
  | "turn"
  | "fight"
  | "affix"
  | "modifier";

export type TimelineNodeStatus = "done" | "current" | "upcoming" | "unreached";

export interface TimelineNode {
  id: string;
  kind: TimelineNodeKind;
  label: string;
  status: TimelineNodeStatus;
  player?: PlayerId;
  winner?: PlayerId;
  replay?: boolean;
}

export interface TimelineInput {
  phase: Phase;
  cfg: ModeConfig;
  draftQueue: DraftQueueItem[];
  draftPointer: number;
  rosterSizes: Record<PlayerId, number>;
  round: number;
  roundStage: RoundStage;
  roundLog: RoundLogEntry[];
}

const INTERLUDE_STAGES: RoundStage[] = ["affix", "modifier"];

const INTERLUDE_LABEL: Record<InterludeKind, string> = {
  affix: "A",
  modifier: "M",
};

export function buildTimeline(input: TimelineInput): TimelineNode[] {
  switch (input.phase) {
    case "ban":
    case "draft":
      return draftTimeline(input);
    case "gameplay":
    case "gameover":
      return fightTimeline(input);
    default:
      return [];
  }
}

interface DraftStep {
  id: string;
  kind: "event" | "turn";
  player?: PlayerId;
  done: boolean;
}

function draftTimeline({
  phase,
  cfg,
  draftQueue,
  draftPointer,
  rosterSizes,
}: TimelineInput): TimelineNode[] {
  const eventsFired = draftQueue
    .slice(0, draftPointer)
    .filter((item) => item.type === "event").length;
  const picksPlanned: Record<PlayerId, number> = { p1: 0, p2: 0 };
  let eventsSeen = 0;

  const steps = cfg.draftScript.flatMap((segment, index): DraftStep[] => {
    if (segment.type === "event") {
      const done = eventsSeen++ < eventsFired;
      return [{ id: `event-${index}`, kind: "event", done }];
    }
    const { player, count } = segment;
    if (!player || !count) return [];
    picksPlanned[player] += count;
    return [
      {
        id: `turn-${index}`,
        kind: "turn",
        player,
        done: rosterSizes[player] >= picksPlanned[player],
      },
    ];
  });

  const current = steps.findIndex((step) => !step.done);
  const statusAt = (index: number): TimelineNodeStatus => {
    if (phase === "ban") return "upcoming";
    if (current === -1 || index < current) return "done";
    return index === current ? "current" : "upcoming";
  };

  return [
    {
      id: "ban",
      kind: "ban",
      label: "BAN",
      status: phase === "ban" ? "current" : "done",
    },
    ...steps.map(
      (step, index): TimelineNode => ({
        id: step.id,
        kind: step.kind,
        label: step.kind === "event" ? "EVENT" : "",
        player: step.player,
        status: statusAt(index),
      }),
    ),
  ];
}

// Interludes keyed `k` sit between round k and k + 1, so key 0 is before round 1.
function fightTimeline(input: TimelineInput): TimelineNode[] {
  const { cfg } = input;
  const nodes: TimelineNode[] = [];
  for (let round = 1; round <= cfg.rounds; round++) {
    const interludes = cfg.interludes[round - 1] ?? [];
    interludes.forEach((kind) => {
      nodes.push({
        id: `${kind}-${round}`,
        kind,
        label: INTERLUDE_LABEL[kind],
        status: interludeStatus(input, round, interludes, kind),
      });
    });
    nodes.push({
      id: `fight-${round}`,
      kind: "fight",
      label: String(round),
      status: fightStatus(input, round),
      winner: winnerOf(input.roundLog, round),
      replay: wasReplayed(input.roundLog, round),
    });
  }
  return nodes;
}

function fightStatus(
  { phase, round, roundStage }: TimelineInput,
  fightRound: number,
): TimelineNodeStatus {
  if (phase === "gameover") return fightRound <= round ? "done" : "unreached";
  if (fightRound < round) return "done";
  if (fightRound > round) return "upcoming";
  return INTERLUDE_STAGES.includes(roundStage) ? "upcoming" : "current";
}

// While an interlude screen is up, `round` has already moved on to the next fight.
function interludeStatus(
  { phase, round, roundStage }: TimelineInput,
  beforeRound: number,
  interludes: InterludeKind[],
  kind: InterludeKind,
): TimelineNodeStatus {
  if (phase === "gameover") return beforeRound <= round ? "done" : "unreached";
  if (round > beforeRound) return "done";
  if (round < beforeRound) return "upcoming";
  const active = interludes.indexOf(roundStage as InterludeKind);
  if (active === -1) return "done";
  const index = interludes.indexOf(kind);
  if (index === active) return "current";
  return index < active ? "done" : "upcoming";
}

function wasReplayed(roundLog: RoundLogEntry[], round: number): boolean {
  return roundLog.some((entry) => entry.round === round && !entry.winner);
}

function winnerOf(
  roundLog: RoundLogEntry[],
  round: number,
): PlayerId | undefined {
  const decided = roundLog.filter((e) => e.round === round && e.winner);
  return decided[decided.length - 1]?.winner ?? undefined;
}