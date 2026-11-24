import { PlayIcon } from "./Icons";
const STRIPES =
  "repeating-linear-gradient(135deg, #F5C518 0 14px, #141420 14px 28px)";
const KEY =
  "text-trim inline-flex items-center justify-center border-2 border-chrome-strong bg-ink px-[0.7em] py-[0.55em] text-bright";


// Purely visual: the screen underneath is made inert by App, and clicks pass through to the host controls.
export function PauseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center bg-ink/75"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full flex-col border-y-4 border-event bg-plate">
        <div className="h-[clamp(8px,0.6vw,16px)]" style={{ backgroundImage: STRIPES }} />
        <div className="flex flex-col items-center gap-[clamp(18px,1.6vw,40px)] py-[clamp(28px,3vw,72px)]">
          <span className="text-trim flex items-center gap-[0.6em] font-pixel font-bold tracking-widest text-bright text-[clamp(40px,4.5vw,120px)]">
            <span className="text-[0.4em] text-event">◆</span>
            PAUSED
            <span className="text-[0.4em] text-event">◆</span>
          </span>
          <span className="flex items-center gap-[0.8em] font-pixel tracking-wider text-lavender-light text-[clamp(11px,0.9vw,22px)]">
            <span className="text-trim">PRESS</span>
            <span className={KEY}>
              <PlayIcon />
            </span>
            <span className="text-trim">OR</span>
            <span className={KEY}>SPACE</span>
            <span className="text-trim">TO RESUME</span>
          </span>
        </div>
        <div className="h-[clamp(8px,0.6vw,16px)]" style={{ backgroundImage: STRIPES }} />
      </div>
    </div>
  );
}