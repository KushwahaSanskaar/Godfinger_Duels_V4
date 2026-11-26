import { Panel } from "./Panel";
import { PauseIcon, PlayIcon, RewindIcon } from "./Icons";

export function HostControls({
  paused,
  canRewind,
  steps,
  onRewind,
  onTogglePause,
}: {
  paused: boolean;
  canRewind: boolean;
  steps: number;
  onRewind: () => void;
  onTogglePause: () => void;
}) {
  const button =
    "w-10 h-10 flex items-center justify-center border-2 border-frame bg-frame-fill text-text-primary hover:bg-[#2A2A3E]";
  return (
    <Panel className="flex min-h-[64px] items-center gap-3 px-4 select-none">
      <button
        onClick={onRewind}
        disabled={!canRewind}
        title="Rewind one step"
        aria-label="Rewind one step"
        className={`${button} ${canRewind ? "" : "opacity-30 cursor-not-allowed"}`}
      >
        <RewindIcon className="w-5 h-5" />
      </button>
      <div className="flex flex-col items-center min-w-[68px]">
        <span
          className={`font-pixel text-[10px] ${paused ? "text-event" : "text-text-muted"}`}
        >
          {paused ? "PAUSED" : "LIVE"}
        </span>
        <span className="font-pixel text-[9px] text-text-dim">
          {Math.max(steps - 1, 0)} STEPS
        </span>
      </div>
      <button
        onClick={onTogglePause}
        title={paused ? "Play (Space)" : "Pause (Space)"}
        aria-label={paused ? "Play" : "Pause"}
        className={`${button} ${paused ? "bg-event text-ink hover:bg-event-hover" : ""}`}
      >
        {paused ? (
          <PlayIcon className="w-5 h-5" />
        ) : (
          <PauseIcon className="w-5 h-5" />
        )}
      </button>
    </Panel>
  );
}
