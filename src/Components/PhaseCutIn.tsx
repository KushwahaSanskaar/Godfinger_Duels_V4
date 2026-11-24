import type { AnimationEvent, CSSProperties } from "react";

interface PhaseCutInProps {
  kicker: string;
  title: string;
  paused?: boolean;
  onDone: () => void;
}

const SPEED_LINES = [
  { top: "15%", width: "38vw", delay: 250 },
  { top: "22%", width: "20vw", delay: 300 },
  { top: "78%", width: "30vw", delay: 270 },
  { top: "85%", width: "16vw", delay: 320 },
];

// Both bands lean the same way; the cut is shared so their edges stay parallel.
const SLANT =
  "polygon(var(--ci-cut) 0, 100% 0, calc(100% - var(--ci-cut)) 100%, 0 100%)";
const DITHER = `
  linear-gradient(45deg, #F5C518 25%, transparent 25%),
  linear-gradient(-45deg, #F5C518 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #F5C518 75%),
  linear-gradient(-45deg, transparent 75%, #F5C518 75%)`;

function Marquee({ text, offset }: { text: string; offset: number }) {
  return (
    <div
      className="ci-marquee flex w-max whitespace-nowrap font-pixel font-bold tracking-widest text-chrome-strong"
      style={{ animationDelay: `${offset}ms` }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="pr-[1em]">
          {text} ◆
        </span>
      ))}
    </div>
  );
}

export function PhaseCutIn({ kicker, title, paused = false, onDone }: PhaseCutInProps) {
  const handleEnd = (e: AnimationEvent) => {
    if (e.animationName === "ci-dim") onDone();
  };

  return (
    <div
      className="ci-root fixed inset-0 z-50 overflow-hidden"
      data-paused={paused || undefined}
      onAnimationEnd={handleEnd}
      aria-live="polite"
      style={
        {
          "--ci-main": "clamp(160px, 28vh, 380px)",
          "--ci-back": "clamp(250px, 46vh, 620px)",
          "--ci-cut": "5vw",
          "--ci-over": "12vw",
          "--ci-dither": "clamp(60px, 5.83vw, 224px)",
        } as CSSProperties
      }
    >
      <div className="ci-dim absolute inset-0 bg-ink/85" />
      <div className="ci-screen-flash absolute inset-0 bg-bright" />

      <div className="ci-shake absolute inset-0">
      {/* everything leans like the background seam */}
      <div className="absolute inset-0 flex items-center" style={{ transform: "rotate(-4deg)" }}>
      <div className="ci-strike absolute inset-x-0 top-1/2 h-[clamp(2px,0.25vw,6px)] bg-event" />

      {SPEED_LINES.map((line) => (
        <div
          key={line.top}
          className="ci-speed absolute left-0 h-[clamp(2px,0.3vw,6px)] bg-event"
          style={{ top: line.top, width: line.width, animationDelay: `${line.delay}ms` }}
        />
      ))}

        {/* back band: purple, scrolling title strip */}
        <div
          className="ci-back absolute inset-x-0"
          style={{ top: "calc(50% - var(--ci-back) / 2)", height: "var(--ci-back)" }}
        >
          <div
            className="absolute inset-y-0 flex flex-col justify-between overflow-hidden border-y-2 border-chrome-strong bg-chrome-fill py-[1.2vh]"
            style={{
              left: "calc(-1 * var(--ci-over))",
              right: "calc(-1 * var(--ci-over))",
              clipPath: SLANT,
              fontSize: "clamp(16px, 4.4vh, 60px)",
            }}
          >
            <Marquee text={title} offset={0} />
            <Marquee text={title} offset={-2600} />
          </div>
        </div>

        {/* main band */}
        <div className="ci-band relative w-full" style={{ height: "var(--ci-main)" }}>
          <div
            className="absolute inset-y-0 overflow-hidden border-y-[clamp(3px,0.4vw,8px)] border-event bg-plate"
            style={{
              left: "calc(-1 * var(--ci-over))",
              right: "calc(-1 * var(--ci-over))",
              clipPath: SLANT,
            }}
          >
            <div className="ci-flash absolute inset-0 bg-bright" />
          </div>
          {/* trailing dither edge */}
          <div
            className="absolute inset-y-0"
            style={{
              left: "calc(-1 * var(--ci-over) - var(--ci-dither))",
              width: "calc(var(--ci-dither) + var(--ci-cut))",
              clipPath: SLANT,
              backgroundImage: DITHER,
              backgroundSize: "clamp(10px, 0.83vw, 32px) clamp(10px, 0.83vw, 32px)",
              backgroundPosition: "0 0, 0 50%, 50% -50%, -50% 0",
            }}
          />
          {/* leading gold blade */}
          <div
            className="absolute inset-y-0 bg-event"
            style={{
              left: "calc(100% + var(--ci-over) - var(--ci-cut))",
              width: "calc(var(--ci-cut) + 1.2vw)",
              clipPath: SLANT,
            }}
          />

          {/* content stays level so the pixel font stays crisp */}
          <div
            className="relative flex h-full flex-col items-center justify-center gap-[clamp(10px,1.6vh,26px)]"
            style={{ transform: "rotate(4deg)" }}
          >
            <span className="overflow-hidden">
              <span
                className="ci-kicker text-trim block font-pixel tracking-[0.3em] text-event"
                style={{ fontSize: "clamp(13px, 1.3vw, 34px)" }}
              >
                {kicker}
              </span>
            </span>
            <h2
              className="text-trim max-w-full whitespace-nowrap px-6 text-center font-pixel font-bold uppercase tracking-widest text-white"
              style={{ fontSize: "clamp(34px, 6vw, 170px)" }}
            >
              {Array.from(title).map((ch, i) => (
                <span
                  key={i}
                  className="ci-letter inline-block"
                  style={{ "--i": i } as CSSProperties}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </h2>
            <div className="ci-rule h-[clamp(3px,0.3vw,8px)] w-[clamp(80px,8vw,240px)] bg-event" />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}