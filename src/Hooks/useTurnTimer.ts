import { useEffect, useRef, useState } from "react";
import { usePaused } from "./PauseContext";

// Countdown for ONE turn (a ban, a pick, a squad selection...).
//
// The time left is stored together with the turn it belongs to. As soon as
// `turnKey` changes, the clock reads as full again in that SAME render, so a
// stale "0 seconds" can never fire a second timeout on the next turn. The
// expiry callback is read through a ref, so it always runs with the newest
// state without restarting the countdown on every render.
export function useTurnTimer(
  seconds: number,
  turnKey: string,
  active: boolean,
  onExpire: () => void,
): number {
  const paused = usePaused(); // the host pressed pause: the clock stands still
  const [clock, setClock] = useState({ key: turnKey, left: seconds });
  const timeLeft = clock.key === turnKey ? clock.left : seconds;

  const expireRef = useRef(onExpire);
  useEffect(() => {
    expireRef.current = onExpire;
  });

  useEffect(() => {
    if (!active || paused) return;
    if (timeLeft <= 0) {
      expireRef.current();
      return;
    }
    const id = setTimeout(() => setClock({ key: turnKey, left: timeLeft - 1 }), 1000);
    return () => clearTimeout(id);
  }, [active, paused, turnKey, timeLeft]);

  return timeLeft;
}
