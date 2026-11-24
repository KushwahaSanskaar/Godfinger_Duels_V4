import type { CSSProperties, ReactNode } from "react";
import { ArrowIcon } from "../Components/Icons";
import { Panel } from "../Components/Panel";
import { MODES } from "../Data/modes";
import type { Mode, PlayerId } from "../types";

interface SetupScreenProps {
  mode: Mode;
  names: { p1: string; p2: string };
  onModeChange: (m: Mode) => void;
  onNameChange: (player: PlayerId, value: string) => void;
  onStart: () => void;
}

const MODE_DETAILS: Record<Mode, { title: string; tag: string }> = {
  standard: { title: "CLASSIC DUEL", tag: "FULL MATCH" },
  swiftplay: { title: "BLITZ DUEL", tag: "QUICK MATCH" },
};

const U = (n: number) => `calc(var(--setup-unit)*${n})`;
const HEADING = "clamp(14px, 1.2vw, 30px)";

function SectionHeading({ index, children }: { index: string; children: ReactNode }) {
  return (
    <h2
      className="text-trim mb-[calc(var(--setup-unit)*1.1)] font-pixel font-bold tracking-widest text-white"
      style={{ fontSize: HEADING }}
    >
      <span className="text-event">{index}</span>
      <span className="text-chrome-strong"> / </span>
      {children}
    </h2>
  );
}

function Chip({ children, selected }: { children: ReactNode; selected: boolean }) {
  return (
    <span
      className={`text-trim border-2 px-[0.8em] py-[0.5em] font-pixel tracking-widest ${selected ? "border-event/60 text-event-light" : "border-chrome-strong text-lavender-light"}`}
      style={{ fontSize: U(0.95) }}
    >
      {children}
    </span>
  );
}

export function SetupScreen({
  mode,
  names,
  onModeChange,
  onNameChange,
  onStart,
}: SetupScreenProps) {
  return (
    <main
      style={
        {
          "--setup-unit": "clamp(12px, min(0.833vw, 1.48dvh), 32px)",
        } as CSSProperties
      }
      className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-[min(96%,calc(var(--setup-unit)*90))] flex-col justify-center gap-[calc(var(--setup-unit)*1.5)] py-[calc(var(--setup-unit)*1)]"
    >
      <Panel className="flex flex-col items-center gap-[calc(var(--setup-unit)*0.6)] px-[calc(var(--setup-unit)*1.5)] py-[calc(var(--setup-unit)*2.4)]">
        <h1 className="text-trim font-pixel text-[calc(var(--setup-unit)*4.4)] font-bold leading-none tracking-wide text-white">
          GODFINGER <span className="text-event">DUELS</span>
        </h1>
        <span
          className="text-trim font-pixel tracking-[0.3em] text-lavender-light"
          style={{ fontSize: U(0.95) }}
        >
          MATCH SETUP
        </span>
      </Panel>

      <section aria-labelledby="setup-mode-heading">
        <div id="setup-mode-heading">
          <SectionHeading index="01">MODE</SectionHeading>
        </div>
        <div className="grid grid-cols-1 gap-[calc(var(--setup-unit)*0.85)] md:grid-cols-2">
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
                className={`flex min-w-0 flex-col gap-[calc(var(--setup-unit)*1.2)] border-2 p-[calc(var(--setup-unit)*1.8)] text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-event ${
                  selected
                    ? "border-event bg-event-plate"
                    : "border-chrome bg-plate hover:border-chrome-strong hover:bg-chrome-fill"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span
                    className={`text-trim font-pixel tracking-widest ${selected ? "text-event" : "text-lavender"}`}
                    style={{ fontSize: U(0.95) }}
                  >
                    {details.tag}
                  </span>
                  {selected ? (
                    <span
                      className="text-trim bg-event px-[0.8em] py-[0.5em] font-pixel font-bold tracking-widest text-ink"
                      style={{ fontSize: U(0.95) }}
                    >
                      ◆ SELECTED
                    </span>
                  ) : (
                    <span
                      className="text-trim border-2 border-chrome-strong px-[0.8em] py-[0.4em] font-pixel tracking-widest text-lavender"
                      style={{ fontSize: U(0.95) }}
                    >
                      SELECT
                    </span>
                  )}
                </div>
                <strong
                  className={`text-trim font-pixel font-bold leading-tight tracking-wide text-[calc(var(--setup-unit)*2.4)] ${selected ? "text-white" : "text-lavender-light"}`}
                >
                  {details.title}
                </strong>
                <div className="flex flex-wrap gap-[calc(var(--setup-unit)*0.5)]">
                  <Chip selected={selected}>{config.picksPerPlayer} AGENTS EACH</Chip>
                  <Chip selected={selected}>{config.rounds} ROUNDS</Chip>
                  <Chip selected={selected}>
                    {config.sharedPool ? "SHARED PICKS" : "EXCLUSIVE PICKS"}
                  </Chip>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="setup-players-heading">
        <div id="setup-players-heading">
          <SectionHeading index="02">PLAYERS</SectionHeading>
        </div>
        <div className="grid grid-cols-1 items-stretch gap-[calc(var(--setup-unit)*0.85)] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {(["p1", "p2"] as PlayerId[]).map((player) => {
            const isP1 = player === "p1";
            return (
              <Panel
                key={player}
                className={`flex min-w-0 flex-col gap-[calc(var(--setup-unit)*0.7)] p-[calc(var(--setup-unit)*1.6)] ${isP1 ? "border-l-[6px] border-l-p1 md:col-start-1 md:row-start-1" : "border-r-[6px] border-r-p2 md:col-start-3 md:row-start-1"}`}
              >
                <label
                  htmlFor={`setup-name-${player}`}
                  className={`text-trim font-pixel font-bold tracking-widest ${isP1 ? "text-p1" : "text-p2"}`}
                  style={{ fontSize: U(1.15) }}
                >
                  {isP1 ? "PLAYER 1" : "PLAYER 2"}
                </label>
                <input
                  id={`setup-name-${player}`}
                  type="text"
                  autoComplete="off"
                  value={names[player]}
                  onChange={(event) => onNameChange(player, event.target.value)}
                  placeholder={isP1 ? "Player 1" : "Player 2"}
                  className={`w-full min-w-0 border-2 border-chrome bg-ink px-[calc(var(--setup-unit)*1)] py-[calc(var(--setup-unit)*0.75)] font-sans text-[calc(var(--setup-unit)*1.4)] font-bold text-white outline-none placeholder:text-text-dim ${isP1 ? "focus:border-p1" : "focus:border-p2"}`}
                />
              </Panel>
            );
          })}
          <div className="flex items-center justify-center md:col-start-2 md:row-start-1">
            <span className="text-trim px-[calc(var(--setup-unit)*0.6)] font-pixel text-[calc(var(--setup-unit)*1.8)] font-bold tracking-widest text-lavender-light">
              VS
            </span>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="text-trim flex w-full items-center justify-center gap-[0.6em] bg-event py-[calc(var(--setup-unit)*1.6)] font-pixel text-[calc(var(--setup-unit)*1.8)] font-bold tracking-widest text-ink transition-colors duration-150 hover:bg-event-hover focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        START DUEL
        <ArrowIcon />
      </button>
    </main>
  );
}