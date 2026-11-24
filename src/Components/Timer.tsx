import { useEffect, useLayoutEffect, useRef } from "react";
import { usePaused } from "../Hooks/PauseContext";

const CHARGE_MS = 500;

function toneFor(timeLeft: number) {
  if (timeLeft <= 5) return { text: "text-p2", bar: "bg-p2" };
  if (timeLeft <= 10) return { text: "text-yellow-300", bar: "bg-yellow-300" };
  return { text: "text-white", bar: "bg-event" };
}

// Charges up from wherever the bar was when a turn starts, then drains in step with the clock.
function DrainBar({
  timeLeft,
  total,
  turnKey,
  barClass,
}: {
  timeLeft: number;
  total: number;
  turnKey: string;
  barClass: string;
}) {
  const paused = usePaused();
  const barRef = useRef<HTMLDivElement>(null);
  const chargeRef = useRef<Animation | null>(null);
  const drainRef = useRef<Animation | null>(null);
  const timeLeftRef = useRef(timeLeft);
  const pausedRef = useRef(paused);
  timeLeftRef.current = timeLeft;
  pausedRef.current = paused;

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const level = new DOMMatrixReadOnly(getComputedStyle(bar).transform).a;
    chargeRef.current?.cancel();
    drainRef.current?.cancel();

    const charge = bar.animate(
      [{ transform: `scaleX(${level})` }, { transform: "scaleX(1)" }],
      { duration: CHARGE_MS, easing: "ease-out", fill: "forwards" },
    );
    charge.onfinish = () => {
      const drain = bar.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        { duration: total * 1000, easing: "linear", fill: "forwards" },
      );
      drain.currentTime = (total - timeLeftRef.current) * 1000;
      if (pausedRef.current) drain.pause();
      drainRef.current = drain;
      charge.cancel();
    };
    chargeRef.current = charge;
  }, [turnKey, total]);

  useEffect(() => {
    const drain = drainRef.current;
    if (paused) drain?.pause();
    else if (drain?.playState === "paused") drain.play();
  }, [paused]);

  useEffect(() => {
    const resync = () => {
      const bar = barRef.current;
      if (document.visibilityState !== "visible" || !bar) return;
      const state = drainRef.current?.playState;
      if (state === "running" || state === "paused") return;
      chargeRef.current?.cancel();
      const drain = bar.animate(
        [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
        { duration: total * 1000, easing: "linear", fill: "forwards" },
      );
      drain.currentTime = (total - timeLeftRef.current) * 1000;
      if (pausedRef.current) drain.pause();
      drainRef.current = drain;
    };
    document.addEventListener("visibilitychange", resync);
    return () => document.removeEventListener("visibilitychange", resync);
  }, [total]);

  useEffect(
    () => () => {
      chargeRef.current?.cancel();
      drainRef.current?.cancel();
    },
    [],
  );

  return (
    <div className="h-1 w-full bg-text-muted/30 overflow-hidden">
      <div
        ref={barRef}
        className={`h-full origin-left ${barClass}`}
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

export function Timer({
  timeLeft,
  total,
  turnKey,
}: {
  timeLeft: number;
  total: number;
  turnKey: string;
}) {
  const tone = toneFor(timeLeft);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  return (
    <div className="flex flex-1 flex-col items-end gap-2">
      <span
        className={`text-trim flex font-lexend font-black text-5xl leading-none ${tone.text}`}
      >
        {`${minutes}:${seconds}`.split("").map((char, i) => (
          <span
            key={i}
            className={`inline-block text-center ${char === ":" ? "w-[0.4em]" : "w-[0.66em]"}`}
          >
            {char}
          </span>
        ))}
      </span>
      <DrainBar
        timeLeft={timeLeft}
        total={total}
        turnKey={turnKey}
        barClass={tone.bar}
      />
    </div>
  );
}