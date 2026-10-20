import type { Boss } from "../Data/bosses";
import { useEffect, useState } from "react";
import { BOSS_POOL } from "../Data/bosses";

interface BossRollProps {
  currentBoss: Boss | null;
  round: number;
  onRoll: () => void;
  onContinue: () => void;
}

type RevealState = "ready" | "rolling" | "revealed";

export function BossRoll({ currentBoss, round, onRoll, onContinue }: BossRollProps) {
  const [revealState, setRevealState] = useState<RevealState>("ready");
  const [displayedName, setDisplayedName] = useState("???");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!currentBoss) {
      setRevealState("ready");
      setDisplayedName("???");
      setImageFailed(false);
      return;
    }

    setRevealState("rolling");
    setImageFailed(false);

    const delays = [70, 75, 80, 90, 100, 115, 130, 150, 175, 205, 240, 285, 335];
    let index = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (index >= delays.length) {
        setDisplayedName(currentBoss.name);
        setRevealState("revealed");
        return;
      }
      setDisplayedName(BOSS_POOL[index % BOSS_POOL.length].name);
      timeoutId = setTimeout(tick, delays[index]);
      index += 1;
    };

    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [currentBoss]);

  const revealed = revealState === "revealed" && !!currentBoss;

  return (
    <div className="w-full flex flex-col gap-5 py-3">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="font-pixel text-lg text-text-primary">ROUND {round}</span>
        <span className="font-pixel text-sm text-text-muted tracking-widest">BOSS ENCOUNTER</span>
      </div>

      <section className="w-full bg-[#141420] border-t-4 border-[#F5C518] p-5 md:p-8">
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#3B3449] pb-4">
          <span className="font-pixel text-xs md:text-sm text-[#F5C518]">◆ ENCOUNTER ROULETTE</span>
          <span className="font-pixel text-[10px] md:text-xs text-[#B8A8C8]">
            {revealState === "ready" ? "AWAITING ROLL" : revealed ? "BOSS CONFIRMED" : "ROLLING..."}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-5 md:gap-8 py-6">
          {/* Boss illustration */}
          <div className="relative min-h-[320px] md:min-h-[440px] overflow-hidden bg-[#221B31] border-2 border-[#68517C] flex items-center justify-center">
            {revealed && !imageFailed ? (
              <img
                key={currentBoss.id}
                src={`/bosses/${currentBoss.id}.webp`}
                alt={currentBoss.name}
                loading="eager"
                className="absolute inset-0 w-full h-full object-contain"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="font-pixel text-7xl md:text-9xl text-[#705B83] select-none">
                {revealed ? "!" : "?"}
              </span>
            )}
            <div className="absolute left-0 top-0 bg-[#F5C518] px-4 py-2 font-pixel text-[10px] text-[#141420]">
              {revealed ? "TARGET IDENTIFIED" : "UNKNOWN TARGET"}
            </div>
          </div>

          {/* Roulette and controls */}
          <div className="min-w-0 flex flex-col justify-center gap-5">
            <div className="text-center lg:text-left">
              <span className="font-pixel text-xs text-[#F5C518] tracking-widest">◆ WARNING ◆</span>
              <h1 className="mt-3 font-pixel text-3xl md:text-5xl text-white leading-tight"
                  style={{ textShadow: "4px 4px 0 #785C19" }}>
                BOSS ENCOUNTER
              </h1>
            </div>

            <div className="border-2 border-[#F5C518] bg-[#20192C] px-4 py-8 text-center min-h-[142px] flex flex-col items-center justify-center gap-3">
              <span className="font-pixel text-[10px] text-[#D8B54D] tracking-widest">
                {revealed ? "ENCOUNTER REVEALED" : revealState === "rolling" ? "SELECTING TARGET..." : "UNKNOWN ENCOUNTER"}
              </span>
              <span key={displayedName} className="font-mono font-bold text-2xl md:text-4xl text-white break-words leading-tight">
                {displayedName.toUpperCase()}
              </span>
            </div>

            {revealState === "ready" ? (
              <button
                onClick={onRoll}
                className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] text-[#141420] font-pixel text-base md:text-lg py-5 px-4"
              >
                ROLL BOSS
              </button>
            ) : revealed ? (
              <button
                onClick={onContinue}
                className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] text-[#141420] font-pixel text-sm md:text-lg py-5 px-4"
              >
                BEGIN SQUAD SELECTION →
              </button>
            ) : (
              <div className="w-full border-2 border-[#65502A] bg-[#2C2431] text-[#D8BA73] text-center font-pixel text-sm md:text-lg py-5 px-4" aria-live="off">
                ROLLING...
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
