import { MODES } from "./Data/modes";

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
}

export interface RoundLogEntry {
  round: number;
  t1: number; // player 1's time, in total seconds
  t2: number; // player 2's time, in total seconds
  winner: PlayerId | null;
  boss?: string;
  outcome: "score" | "timeout" | "double-timeout";
}

export type RoundStage = "boss" | "squad" | "score";

export interface PendingRemoval {
  player: PlayerId;
  count: number;
  pool: string[]; // agent ids eligible for removal — that round's squad
}

export type Mode = keyof typeof MODES;
