import { useEffect, useState } from "react";
import type { Agent, PlayerId } from "../types";
import { CLASS_GROUPS } from "../Data/modes";
import { AgentCard } from "./AgentCard";
import { Panel } from "./Panel";
import { CloseIcon } from "./Icons";

interface MorphPickerProps {
  item: Agent; // the Soul Stone / Invitation being used
  note: string; // one line: what it may become
  options: Agent[]; // the agents it may become right now
  banned: string[]; // shown with a BANNED label (only possible for the "+" items)
  player: PlayerId;
  playerName: string;
  currentId?: string; // the form already chosen, if the player reopens the popup
  onPick: (agentId: string) => void;
  onClose: () => void;
}

const TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.05) 10px 12px)";


function useCardSize() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return Math.round(Math.max(72, Math.min(width * 0.055, 150)));
}

// Popup for Soul Stone / Soul Stone+ / Invitations. Click an agent, then confirm.
export function MorphPicker({
  item,
  note,
  options,
  banned,
  player,
  playerName,
  currentId,
  onPick,
  onClose,
}: MorphPickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    currentId ?? null,
  );
  const cardSize = useCardSize();
  const isP1 = player === "p1";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = CLASS_GROUPS.map((g) => ({
    label: g.label,
    agents: options.filter((a) => g.specialties.includes(a.specialty)),
  })).filter((g) => g.agents.length > 0);
  const selected = options.find((a) => a.id === selectedId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name}: choose an agent`}
    >
      <Panel
        className={`flex max-h-[88vh] w-[min(94vw,1500px)] flex-col border-l-[6px] ${isP1 ? "border-l-p1" : "border-l-p2"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-6 border-b-2 border-chrome px-6 py-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`text-trim px-[0.7em] py-[0.5em] font-pixel font-bold text-ink text-[clamp(10px,0.75vw,18px)] ${isP1 ? "bg-p1" : "bg-p2"}`}
              >
                {playerName.toUpperCase()}
              </span>
              <span className="text-trim font-pixel font-bold text-bright text-[clamp(18px,1.6vw,40px)]">
                {item.name.toUpperCase()}
              </span>
            </div>
            <span className="text-trim text-text-primary text-[clamp(13px,1vw,24px)]">
              {note}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-[2.6em] w-[2.6em] shrink-0 items-center justify-center border-2 border-chrome text-[clamp(12px,0.9vw,22px)] text-lavender-light transition-colors hover:border-event hover:text-event"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(240px,21vw,440px)]">
          <div className="arcade-scroll min-h-0 space-y-6 overflow-y-auto px-6 py-5">
            {groups.map((g) => (
              <section key={g.label} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-trim shrink-0 font-pixel text-[clamp(11px,0.85vw,20px)] tracking-widest text-lavender-light">
                    {g.label.toUpperCase()}
                  </span>
                  <span className="h-[2px] flex-1 bg-chrome" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {g.agents.map((agent) => (
                    <div key={agent.id} className="relative" title={agent.name}>
                      <AgentCard
                        agent={agent}
                        size={cardSize}
                        selection={
                          selectedId === agent.id
                            ? isP1
                              ? "selected-p1"
                              : "selected-p2"
                            : "none"
                        }
                        onClick={() => setSelectedId(agent.id)}
                      />
                      {banned.includes(agent.id) && (
                        <span
                          className="text-trim pointer-events-none absolute inset-x-0 bottom-0 bg-ink/90 py-[0.5em] text-center font-pixel text-p2-alt2"
                          style={{ fontSize: Math.max(9, Math.round(cardSize * 0.11)) }}
                        >
                          BANNED
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {groups.length === 0 && (
              <div className="text-trim font-pixel text-[clamp(12px,1vw,24px)] text-lavender">
                NO AGENTS AVAILABLE
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t-2 border-chrome p-5 lg:border-l-2 lg:border-t-0">
            <div
              className="relative hidden aspect-square w-full overflow-hidden border-2 border-chrome-strong bg-chrome lg:block"
              style={{ backgroundImage: TEXTURE }}
            >
              {selected ? (
                <img
                  key={selected.id}
                  src={`/agents/agents_full/${selected.art ?? selected.id}_full.webp`}
                  alt={selected.name}
                  draggable={false}
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <span className="absolute inset-0 flex select-none items-center justify-center font-lexend text-[clamp(60px,7vw,160px)] font-black text-ink">
                  ?
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-trim font-pixel tracking-widest text-lavender text-[clamp(10px,0.75vw,18px)]">
                {selected ? selected.specialty.toUpperCase() : "NEW FORM"}
              </span>
              <span className="text-trim break-words font-pixel font-bold text-bright text-[clamp(16px,1.4vw,34px)]">
                {selected ? selected.name.toUpperCase() : "???"}
              </span>
            </div>

            <button
              disabled={!selected}
              onClick={() => selected && onPick(selected.id)}
              className={`text-trim mt-auto w-full py-5 font-pixel font-bold tracking-widest text-[clamp(13px,1vw,26px)] transition-colors ${
                selected
                  ? "bg-event text-ink hover:bg-event-hover"
                  : "cursor-not-allowed border-2 border-chrome bg-chrome-fill text-lavender"
              }`}
            >
              {selected ? "CONFIRM FORM" : "SELECT AN AGENT"}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}