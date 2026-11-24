import { useEffect, useState } from "react"; //All of this fucking sucks I'll re-write it I promise.
import type { PlayerId } from "../types";

interface CoinTossProps {
  coinResult: "heads" | "tails" | null;
  priority: PlayerId | null;
  onToss: () => void;
  onConfirm: () => void;
  displayName: (p: PlayerId | null) => string;
}

export function CoinToss({
  coinResult,
  priority,
  onToss,
  onConfirm,
  displayName,
}: CoinTossProps) {
  const [flipping, setFlipping] = useState(false);
  const [settled, setSettled] = useState(false);
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    if (coinResult && !settled) {
      setFlipping(true);
      const targetAngle =
        Math.ceil(angle / 360) * 360 +
        2520 +
        (coinResult === "tails" ? 180 : 0);
      setAngle(targetAngle);
      const timer = setTimeout(() => {
        setFlipping(false);
        setSettled(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [coinResult]);

  const canToss = !coinResult;
  const handleToss = () => {
    if (!canToss) return;
    setSettled(false);
    onToss();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8 min-h-[calc(100vh-8rem)]">
      <h2
        className="text-trim font-pixel font-bold text-5xl text-bright tracking-tighter leading-none border-y-4 border-event bg-plate px-10 py-4"
      >
        COIN TOSS
      </h2>

      {/* Coin */}
      <button
        type="button"
        onClick={handleToss}
        disabled={!canToss}
        aria-label="Toss the coin"
        className={`bg-transparent p-0 border-0 outline-none ${
          canToss
            ? "cursor-pointer transition-transform hover:scale-105 active:scale-95 focus-visible:scale-105"
            : "cursor-default"
        }`}
        style={{ perspective: "600px" }}
      >
        <div
          style={{
            width: "160px",
            height: "160px",
            position: "relative",
            transformStyle: "preserve-3d",
            transform: `rotateY(${angle}deg)`,
            transition: flipping
              ? "transform 2.5s cubic-bezier(0.15, 0, 0.1, 1)"
              : "none",
          }}
        >
          {/* Front face — P1 */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center border-4 border-event-light"
            style={{
              backfaceVisibility: "hidden",
              backgroundColor: "#F5C518",
              borderRadius: "50%",
            }}
          >
            <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full border-2 border-event-light bg-plate">
              <span className="text-trim font-pixel font-bold text-event text-3xl">
                P1
              </span>
              <span className="text-trim font-pixel text-event-light text-[10px] tracking-widest mt-3">
                HEADS
              </span>
            </div>
          </div>

          {/* Back face — P2 */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center border-4 border-event-light"
            style={{
              backfaceVisibility: "hidden",
              backgroundColor: "#F5C518",
              borderRadius: "50%",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full border-2 border-event-light bg-plate">
              <span className="text-trim font-pixel font-bold text-event text-3xl">
                P2
              </span>
              <span className="text-trim font-pixel text-event-light text-[10px] tracking-widest mt-3">
                TAILS
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Result + actions */}
      {<div className="flex h-32 flex-col items-center justify-start">
      {!coinResult ? (
        <p className="text-trim font-pixel text-sm tracking-widest text-text-primary">
          CLICK THE COIN TO TOSS
        </p>
      ) : settled ? (
        <div className="flex flex-col items-center gap-4">
          <p className="font-sans text-text-primary text-2xl">
            <span
              className={
                priority === "p1" ? "text-p1 font-bold" : "text-p2 font-bold"
              }
            >
              {displayName(priority)}
            </span>{" "}
            wins the toss
          </p>
          <button
            onClick={onConfirm}
            className="text-trim px-12 py-4 border-2 border-event bg-plate text-event font-pixel font-bold text-xl tracking-widest hover:bg-event hover:text-ink transition-colors"
          >
            BEGIN BAN PHASE
          </button>
        </div>
      ) : null}
      </div>}
    </div>
  );
}