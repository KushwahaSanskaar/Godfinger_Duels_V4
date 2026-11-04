import { MODES } from "./Data/modes";
import type { AffixDef } from "./Data/Events/affixes";

export type PlayerId = "p1" | "p2";

export interface Agent {
  id: string;
  name: string;
  s_rank: boolean;
  attribute: string;
  specialty: string;
  atkType: string;
  atkType2?: string;
  faction: string;
  rarity: string;
  price: number;
  art?: string; // image file name (without extension) when it differs from `id`
  tag?: string; // short label drawn on the card (used by morph items)
}

export interface ClassGroup {
  label: string;
  specialties: string[];
}

export type Phase =
  | "setup"
  | "coin"
  | "ban"
  | "draft"
  | "gameplay"
  | "gameover";

export interface DraftQueueItem {
  type: "pick" | "event";
  player?: PlayerId;
}

export interface GameEvent {
  title: string;
  desc: string;
}

export interface DraftScriptSegment {
  type: "event" | "pick";
  player?: PlayerId; // present when type is "pick"
  count?: number; // present when type is "pick"
}

export interface ModeConfig {
  label: string;
  picksPerPlayer: number;
  draftScript: DraftScriptSegment[];
  minRoster: number;
  sharedPool: boolean; // can both players draft the same agent?
  rounds: number; // regulation length; the last one is "Sudden Death"
  // Screens shown BEFORE the next boss roll, keyed by the round that just ended.
  // Key 0 = before round 1.
  interludes: Record<number, InterludeKind[]>;
}

export interface RoundLogEntry {
  round: number;
  t1: number; // player 1's time, in total seconds
  t2: number; // player 2's time, in total seconds
  winner: PlayerId | null;
  boss?: string;
  outcome: "score" | "timeout" | "double-timeout";
}

// "affix" / "modifier" are the between-round screens that come BEFORE the boss roll.
// "reveal" = a secret modifier is announced after squad select, right before the round.
export type RoundStage =
  | "boss"
  | "squad"
  | "reveal"
  | "score"
  | "affix"
  | "modifier";

export type InterludeKind = "affix" | "modifier";

export interface PendingRemoval {
  player: PlayerId;
  count: number;
  pool: string[]; // agent ids eligible for removal — that round's squad
  locked?: string[]; // agent ids that are always removed (Soul Stones, Invitations)
}

export type Mode = keyof typeof MODES;

// ---- Between-round screens (affixes + universal modifiers) ----

// The affix the losing player picked, and who it lands on.
export interface AffixChoice {
  def: AffixDef;
  target: PlayerId;
}

// What the picker under the affix screen should offer right now.
export interface AffixPickSpec {
  candidates: Agent[];
  min: number;
  max: number;
  label: string;
  noEffect?: boolean; // the affix can't do anything this time ("wasted")
  optional?: boolean; // Necromancy sacrifice: may be skipped
}

// Effects that last exactly ONE round (cleared when the round is decided).
export interface RoundEffects {
  modifier: { id: string; title: string; hidden?: boolean } | null; // hidden = secret, not revealed yet
  affix: {
    id: string;
    title: string;
    desc: string;
    polarity: "positive" | "negative";
    target: PlayerId;
    note?: string;
  } | null;
  horizontal: Record<PlayerId, boolean>; // Horizontal Investment
  timePenalty: Record<PlayerId, number>; // Hold on, Wait for me!
  revivedLock: Record<PlayerId, string[]>; // Necromancy: not both in one squad
}
