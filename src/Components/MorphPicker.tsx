import { useEffect, useState } from "react";
import type { Agent, PlayerId } from "../types";
import { CLASS_GROUPS } from "../Data/modes";
import { AgentCard } from "./AgentCard";

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
  const isP1 = player === "p1";
  const accent = isP1 ? "text-p1" : "text-p2";
  const border = isP1 ? "border-p1" : "border-p2";
  const background = isP1 ? "bg-p1" : "bg-p2";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name}: choose an agent`}
    >
      <div
        className={`flex max-h-[90vh] w-full max-w-4xl flex-col border-t-4 ${border} bg-[#141420]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#303044] px-5 py-4">
          <div className="min-w-0">
            <div className={`font-pixel text-lg ${accent}`}>
              {playerName.toUpperCase()} · {item.name.toUpperCase()}
            </div>
            <div className="mt-1 text-xs text-text-muted">{note}</div>
          </div>
          <button
            onClick={onClose}
            className="font-pixel text-sm text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="mb-2 font-pixel text-[10px] tracking-widest text-text-muted">
                {g.label.toUpperCase()}
              </div>
              <div className="flex flex-wrap gap-3">
                {g.agents.map((agent) => (
                  <div key={agent.id} className="relative" title={agent.name}>
                    <AgentCard
                      agent={agent}
                      size={96}
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
                      <span className="pointer-events-none absolute left-0 top-0 bg-[#802027] px-1 font-pixel text-[8px] leading-tight text-white">
                        BANNED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="font-pixel text-sm text-text-muted">
              NO AGENTS AVAILABLE
            </div>
          )}
        </div>

        <div className="border-t border-[#303044] px-5 py-4">
          <button
            disabled={!selected}
            onClick={() => selected && onPick(selected.id)}
            className={`w-full py-4 font-pixel text-sm font-bold tracking-widest text-white ${background} ${
              selected ? "hover:opacity-80" : "cursor-not-allowed opacity-20"
            }`}
          >
            {selected
              ? `BECOME ${selected.name.toUpperCase()}`
              : "SELECT AN AGENT"}
          </button>
        </div>
      </div>
    </div>
  );
}
