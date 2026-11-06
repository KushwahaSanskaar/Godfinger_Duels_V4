export interface TimeInput {
  minutes: string;
  seconds: string;
}

// A time counts as entered once either box holds a valid, non-negative number. The
// other box is read as 0. Clearing both boxes takes the time away again.
export function hasTime(t: TimeInput): boolean {
  if (t.minutes === "" && t.seconds === "") return false;
  const m = Number(t.minutes || 0);
  const s = Number(t.seconds || 0);
  return Number.isFinite(m) && Number.isFinite(s) && m >= 0 && s >= 0;
}

export function timeSeconds(t: TimeInput): number {
  return Number(t.minutes || 0) * 60 + Number(t.seconds || 0);
}
