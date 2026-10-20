import type { CSSProperties } from "react";
import { MODES } from "../Data/modes";
import type { Mode, PlayerId } from "../types";

interface SetupScreenProps {
  mode: Mode;
  names: { p1: string; p2: string };
  onModeChange: (m: Mode) => void;
  onNameChange: (player: PlayerId, value: string) => void;
  onStart: () => void;
}

const MODE_DETAILS: Record<Mode, { title: string; tag: string; summary: string }> = {
  standard: {
    title: "CLASSIC DUEL",
    tag: "FULL MATCH",
    summary: "Longer draft, with shared agent picks enabled.",
  },
  swiftplay: {
    title: "BLITZ DUEL",
    tag: "QUICK MATCH",
    summary: "Shorter draft, with exclusive agent picks.",
  },
};

export function SetupScreen({
  mode,
  names,
  onModeChange,
  onNameChange,
  onStart,
}: SetupScreenProps) {
  return (
    <main style={{ "--setup-unit": "clamp(12px, min(0.833vw, 1.48dvh), 32px)" } as CSSProperties}
      className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[min(96%,calc(var(--setup-unit)*90))] flex-col justify-center gap-[calc(var(--setup-unit)*0.85)] py-[calc(var(--setup-unit)*0.75)]">
      {/* Main title */}
      <div className="border-b-4 border-[#7B5EA7] bg-[#141420] px-[calc(var(--setup-unit)*1.5)] py-[calc(var(--setup-unit)*1)] text-center">
        <h1
          className="font-pixel text-[calc(var(--setup-unit)*3.2)] font-bold leading-[1.15] tracking-wide text-white"
          style={{
            textShadow: "0.07em 0 0 #1748A1, 0 0.07em 0 #1748A1, 0.07em 0.07em 0 #1748A1",
            WebkitTextStroke: "0.02em #77B2FF",
          }}
        >
          <span>GODFINGER </span>
          <span
            style={{
              textShadow: "0.07em 0 0 #9B7615, 0 0.07em 0 #9B7615, 0.07em 0.07em 0 #9B7615",
              WebkitTextStroke: "0.02em #FFDA4D",
            }}
          >
            DUELS
          </span>
        </h1>
        <p className="mb-[calc(var(--setup-unit)*0.75)] font-pixel text-[calc(var(--setup-unit)*0.8)] tracking-[0.22em] text-[#C7B3E5]">
          CONFIGURATION
        </p>
      </div>

      {/* Mode selection */}
      <section aria-labelledby="setup-mode-heading" className="bg-[#141420] p-[calc(var(--setup-unit)*1)]">
        <div className="mb-[calc(var(--setup-unit)*0.75)] flex flex-wrap items-center justify-between gap-[calc(var(--setup-unit)*0.5)]">
          <h2 id="setup-mode-heading" className="font-pixel text-[calc(var(--setup-unit)*1.3)] text-white">
            01 <span className="text-[#BDA4E8]">/</span> SELECT MODE
          </h2>
          <span className="font-mono text-[calc(var(--setup-unit)*0.85)] text-[#AFA7C4]">CHOOSE YOUR RULESET</span>
        </div>
        <div className="grid grid-cols-1 gap-[calc(var(--setup-unit)*0.75)] md:grid-cols-2">
          {(Object.keys(MODES) as Mode[]).map((key) => {
            const selected = mode === key;
            const config = MODES[key];
            const details = MODE_DETAILS[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => onModeChange(key)}
                className={`group relative flex min-w-0 flex-col gap-[calc(var(--setup-unit)*0.6)] border-[max(2px,calc(var(--setup-unit)*0.19))] p-[calc(var(--setup-unit)*1.2)] text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#F5C518] ${selected
                    ? "border-[#F5C518] bg-[#302817]"
                    : "border-[#464052] bg-[#20202E] hover:border-[#A58BC7] hover:bg-[#292535]"
                  }`}
              >
                <div className="flex w-full items-center justify-between gap-[calc(var(--setup-unit)*0.5)]">
                  <span className={`font-pixel text-[calc(var(--setup-unit)*0.78)] ${selected ? "text-[#F5C518]" : "text-[#B5A9C8]"}`}>
                    {details.tag}
                  </span>
                  <span className={`font-pixel text-[calc(var(--setup-unit)*0.78)] ${selected ? "text-[#F5C518]" : "text-[#817A90]"}`}>
                    {selected ? "[ SELECTED ]" : "[ SELECT ]"}
                  </span>
                </div>
                <strong className="font-pixel text-[calc(var(--setup-unit)*1.7)] leading-tight text-white">
                  {details.title}
                </strong>
                <div className="flex flex-wrap gap-[calc(var(--setup-unit)*0.5)] font-mono text-[calc(var(--setup-unit)*0.9)] font-bold">
                  <span className={`px-[calc(var(--setup-unit)*0.75)] py-[calc(var(--setup-unit)*0.25)] ${selected ? "bg-[#7A611C] text-white" : "bg-[#353044] text-[#DDD5E9]"}`}>
                    {config.picksPerPlayer} AGENTS / PLAYER
                  </span>
                  <span className={`px-[calc(var(--setup-unit)*0.75)] py-[calc(var(--setup-unit)*0.25)] ${selected ? "bg-[#7A611C] text-white" : "bg-[#353044] text-[#DDD5E9]"}`}>
                    {config.sharedPool ? "MIRROR PICKS" : "EXCLUSIVE PICKS"}
                  </span>
                </div>
                <p className="font-mono text-[calc(var(--setup-unit)*0.95)] leading-snug text-[#C8C0D0]">
                  {details.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Player matchup */}
      <section aria-labelledby="setup-players-heading" className="bg-[#141420] p-[calc(var(--setup-unit)*1)]">
        <h2 id="setup-players-heading" className="mb-[calc(var(--setup-unit)*0.75)] font-pixel text-[calc(var(--setup-unit)*1.3)] text-white">
          02 <span className="text-[#BDA4E8]">/</span> THE CHALLENGERS
        </h2>
        <div className="grid grid-cols-1 items-stretch gap-[calc(var(--setup-unit)*0.85)] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {(["p1", "p2"] as PlayerId[]).map((player, index) => (
            <div key={player} className={`flex min-w-0 flex-col gap-[calc(var(--setup-unit)*0.5)] border-t-[max(4px,calc(var(--setup-unit)*0.3))] p-[calc(var(--setup-unit)*1)] ${player === "p1" ? "border-[#3A8EF6] bg-[#17253B]" : "border-[#E63946] bg-[#382024]"} ${index === 1 ? "md:col-start-3 md:row-start-1" : "md:col-start-1 md:row-start-1"}`}>
              <label htmlFor={`setup-name-${player}`} className={`font-pixel text-[calc(var(--setup-unit)*1.1)] ${player === "p1" ? "text-[#77B2FF]" : "text-[#FF8690]"}`}>
                {player === "p1" ? "PLAYER 01" : "PLAYER 02"}
              </label>
              <input
                id={`setup-name-${player}`}
                type="text"
                autoComplete="off"
                value={names[player]}
                onChange={(event) => onNameChange(player, event.target.value)}
                placeholder={player === "p1" ? "Player 1" : "Player 2"}
                className={`min-w-0 w-full border-2 bg-[#11121D] px-[calc(var(--setup-unit)*1)] py-[calc(var(--setup-unit)*0.75)] font-mono text-[calc(var(--setup-unit)*1.4)] font-bold text-white outline-none placeholder:text-[#77748A] ${player === "p1" ? "border-[#3A8EF6] focus:border-[#91C5FF]" : "border-[#E63946] focus:border-[#FF9BA3]"}`}
              />
            </div>
          ))}
          <div className="flex items-center justify-center md:col-start-2 md:row-start-1">
            <span className="bg-[#7B5EA7] px-[calc(var(--setup-unit)*1.2)] py-[calc(var(--setup-unit)*0.75)] font-pixel text-[calc(var(--setup-unit)*2)] text-white">
              VS
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="w-full border-b-[max(4px,calc(var(--setup-unit)*0.35))] border-[#9B7615] bg-[#F5C518] px-[calc(var(--setup-unit)*1.5)] py-[calc(var(--setup-unit)*1.1)] font-pixel text-[calc(var(--setup-unit)*1.7)] font-bold tracking-wider text-[#171323] transition-colors duration-150 hover:bg-[#FFDA4D] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        START DUEL <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}
