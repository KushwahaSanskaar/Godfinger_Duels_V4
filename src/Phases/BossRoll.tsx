import type { Boss } from "../Data/bosses";
import { useEffect, useRef, useState } from "react";
import { BOSS_POOL } from "../Data/bosses";
import { ArrowIcon } from "../Components/Icons";
import { Panel } from "../Components/Panel";
import { Wipe } from "../Components/Wipe";

interface BossRollProps {
  currentBoss: Boss | null;
  onRoll: () => void;
  onContinue: () => void;
}

type RevealState = "ready" | "rolling" | "revealed";

const HAZARD_STRIPES =
  "repeating-linear-gradient(135deg, #F5C518 0 14px, #141420 14px 28px)";
const TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.05) 10px 12px)";
const WIPE_MS = 800;
const WIPE_SWAP_MS = 400;
const LABEL_SIZE = "clamp(10px, 0.8vw, 20px)";
const BUTTON =
  "text-trim flex w-full items-center justify-center gap-[0.6em] py-5 px-4 font-pixel font-bold tracking-wider text-[clamp(14px,1.1vw,28px)]";
const FADE_LEFT = "linear-gradient(to right, transparent, black 70%)";
const FADE_RIGHT = "linear-gradient(to left, transparent, black 70%)";


function buildRollSequence(order: Boss[], target: Boss, frames: number): Boss[] {
  const end = order.findIndex((b) => b.id === target.id);
  return Array.from(
    { length: frames + 1 },
    (_, i) =>
      order[(((end - frames + i) % order.length) + order.length) % order.length],
  );
}

export function BossRoll({ currentBoss, onRoll, onContinue }: BossRollProps) {
  const [revealState, setRevealState] = useState<RevealState>("ready");
  const [displayedBoss, setDisplayedBoss] = useState<Boss | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [wiping, setWiping] = useState(false);
  const orderRef = useRef<Boss[]>(BOSS_POOL);

  useEffect(() => {
    setImageFailed(false);
    setWiping(false);
    if (!currentBoss) {
      setRevealState("ready");
      setDisplayedBoss(null);
      return;
    }

    setRevealState("rolling");

    const delays = [
      70, 75, 80, 90, 100, 115, 130, 150, 175, 205, 240, 285, 335, 420,
    ];
    const order = [...BOSS_POOL].sort(() => Math.random() - 0.5);
    orderRef.current = order;
    const sequence = buildRollSequence(order, currentBoss, delays.length - 1);
    let index = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const tick = () => {
      if (index >= delays.length) {
        setWiping(true);
        timers.push(
          setTimeout(() => {
            setDisplayedBoss(currentBoss);
            setRevealState("revealed");
          }, WIPE_SWAP_MS),
          setTimeout(() => setWiping(false), WIPE_MS),
        );
        return;
      }
      setDisplayedBoss(sequence[index]);
      timers.push(setTimeout(tick, delays[index]));
      index += 1;
    };

    tick();
    return () => timers.forEach(clearTimeout);
  }, [currentBoss]);

  const revealed = revealState === "revealed" && !!currentBoss;
  const status =
    revealState === "ready"
      ? "AWAITING ROLL"
      : revealed
        ? "BOSS CONFIRMED"
        : "ROLLING...";

  const order = orderRef.current;
  const at = displayedBoss
    ? order.findIndex((b) => b.id === displayedBoss.id)
    : -1;
  const sideName = (offset: number) =>
    at < 0
      ? ""
      : order[(at + offset + order.length) % order.length].name.toUpperCase();

  return (
    <div className="w-full py-3">
      <Panel className="flex flex-col">
        <div
          className="flex h-[clamp(22px,1.6vw,44px)] items-center justify-center"
          style={{ backgroundImage: HAZARD_STRIPES }}
        >
          <span
            className="bg-ink px-[1.2em] py-[0.5em] font-pixel tracking-widest text-event"
            style={{ fontSize: LABEL_SIZE }}
          >
            ◆ WARNING ◆
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-b-2 border-chrome px-5 py-4 md:px-8">
          <span className="text-trim font-pixel text-[clamp(12px,0.95vw,26px)] text-event">
            ◆ ENCOUNTER ROULETTE
          </span>
          <span className="text-trim font-pixel text-[clamp(10px,0.8vw,22px)] text-lavender-light">
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 items-center gap-5 p-5 md:gap-8 md:p-8 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div
            className="relative mx-auto flex aspect-[121/167] w-full max-w-[min(72vw,40vh)] items-center justify-center overflow-hidden border-2 border-chrome-strong bg-chrome lg:w-[min(34vw,43vh,640px)] lg:max-w-none"
            style={{ backgroundImage: TEXTURE }}
          >
            {displayedBoss && !imageFailed ? (
              revealed ? (
                <img
                  key={displayedBoss.id}
                  src={`/bosses/${displayedBoss.id}.webp`}
                  alt={displayedBoss.name}
                  loading="eager"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  className="absolute inset-0 bg-plate"
                  style={{
                    WebkitMaskImage: `url(/bosses/${displayedBoss.id}.webp)`,
                    maskImage: `url(/bosses/${displayedBoss.id}.webp)`,
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                />
              )
            ) : (
              <span className="select-none font-lexend text-7xl font-black text-ink md:text-9xl">
                ?
              </span>
            )}
            {wiping && <Wipe tone="text-event" duration={WIPE_MS} />}
            <div
              className="text-trim absolute left-0 top-0 bg-event px-[1.4em] py-[0.9em] font-pixel text-ink"
              style={{ fontSize: LABEL_SIZE }}
            >
              {revealed ? "TARGET IDENTIFIED" : "UNKNOWN TARGET"}
            </div>
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-5">
            <Panel className="flex min-h-[clamp(150px,12vw,300px)] flex-1 flex-col items-center justify-center gap-4 overflow-hidden border-event py-8 text-center !bg-event-plate">
              <span
                className="text-trim font-pixel tracking-widest text-event"
                style={{ fontSize: LABEL_SIZE }}
              >
                {revealed
                  ? "ENCOUNTER REVEALED"
                  : revealState === "rolling"
                    ? "SELECTING TARGET..."
                    : "UNKNOWN ENCOUNTER"}
              </span>
              <div className="mx-auto grid w-fit max-w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center font-pixel font-bold leading-tight text-[clamp(22px,2.6vw,64px)]">                <div
                className="flex min-w-0 justify-end overflow-hidden"
                style={{ WebkitMaskImage: FADE_LEFT, maskImage: FADE_LEFT }}
              >
                <span className="text-trim whitespace-nowrap text-[0.5em] text-bright opacity-30">
                  {sideName(-1)}
                </span>
              </div>
                <span className="text-trim min-w-0 break-words px-[0.5em] text-white">
                  {(displayedBoss?.name ?? "???").toUpperCase()}
                </span>
                <div
                  className="flex min-w-0 justify-start overflow-hidden"
                  style={{ WebkitMaskImage: FADE_RIGHT, maskImage: FADE_RIGHT }}
                >
                  <span className="text-trim whitespace-nowrap text-[0.5em] text-bright opacity-30">
                    {sideName(1)}
                  </span>
                </div>
              </div>
            </Panel>

            {revealState === "ready" ? (
              <button
                onClick={onRoll}
                className={`${BUTTON} bg-event text-ink hover:bg-event-hover`}
              >
                ROLL BOSS
              </button>
            ) : revealed ? (
              <button
                onClick={onContinue}
                className={`${BUTTON} bg-event text-ink hover:bg-event-hover`}
              >
                BEGIN SQUAD SELECTION
                <ArrowIcon />
              </button>
            ) : (
              <div
                className={`${BUTTON} border-2 border-chrome bg-chrome-fill text-lavender-light`}
                aria-live="off"
              >
                ROLLING...
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}