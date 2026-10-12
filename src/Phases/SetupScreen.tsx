import { MODES } from "../Data/modes";
import type { Mode, PlayerId } from "../types";

interface SetupScreenProps {
  mode: Mode;
  names: { p1: string; p2: string };
  onModeChange: (m: Mode) => void;
  onNameChange: (player: PlayerId, value: string) => void;
  onStart: () => void;
}

export function SetupScreen({
  mode,
  names,
  onModeChange,
  onNameChange,
  onStart,
}: SetupScreenProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Title */}
      <h2
        className="font-pixel font-bold text-6xl text-white tracking-wide leading-none"
        style={{
          textShadow: "0.3rem 0 0 #1748A1, 0 0.3rem 0 #1748A1, 0.3rem 0.3rem 0 #1748A1",
          WebkitTextStroke: "2px #77B2FF",
        }}
      >
        GODFINGER DUEL
      </h2>

      {/* Mode selector */}
      <div className="flex gap-0">
        {(Object.keys(MODES) as Mode[]).map((key) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`px-10 py-3 text-xl font-pixel font-bold border transition-colors duration-150
              ${mode === key
                ? "bg-accent text-white border-accent"
                : "bg-transparent text-text-muted border-text-muted opacity-40 hover:opacity-70"
              }`}
          >
            {MODES[key].label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Player name inputs */}
      <div className="flex gap-8 items-start">
        {/* P1 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-pixel text-p1">PLAYER 1</label>
          <input
            className="bg-unavailable border-b-2 border-p1 px-3 py-3 text-lg font-sand text-text-primary outline-none w-48 focus:border-p1-alt2"
            value={names.p1}
            onChange={(e) => onNameChange("p1", e.target.value)}
            placeholder="Player 1"
          />
        </div>

        <span className="text-text-primary font-pixel text-xl mt-8">VS</span>

        {/* P2 */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-pixel text-p2">PLAYER 2</label>
          <input
            className="bg-unavailable border-b-2 border-p2 px-3 py-3 text-lg font-sand text-text-primary outline-none w-48 focus:border-p2-alt2"
            value={names.p2}
            onChange={(e) => onNameChange("p2", e.target.value)}
            placeholder="Player 2"
          />
        </div>
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        className="mt-4 px-16 py-4 bg-accent text-white font-pixel font-bold text-2xl tracking-widest hover:bg-p1 transition-colors duration-150"
      >
        START
      </button>
    </div>
  );
}