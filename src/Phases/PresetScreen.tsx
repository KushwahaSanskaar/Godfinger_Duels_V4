import type { Agent, PlayerId } from "../types";
import { AgentCard } from "../Components/AgentCard";

interface PresetScreenProps {
  team: string[]; // the rolled team both players play
  squads: Record<PlayerId, string[]>; // what each player picked (still at stake)
  lookup: Agent[]; // pool plus both rosters
  morphs: Record<PlayerId, Record<string, string>>;
  displayName: (p: PlayerId | null) => string;
  onAcknowledge: () => void;
}

// Preset Teams: after the reveal, the randomly rolled team is shown. It is what both
// players fight with; the squads they picked first are what is lost if they lose.
export function PresetScreen({
  team,
  squads,
  lookup,
  morphs,
  displayName,
  onAcknowledge,
}: PresetScreenProps) {
  const find = (id: string) => lookup.find((a) => a.id === id);
  const form = (p: PlayerId, id: string) => find(morphs[p]?.[id] ?? id) ?? find(id);
  return (
    <div className="w-full flex flex-col items-center gap-6 py-3">
      <span className="font-pixel text-sm text-event tracking-widest">
        ◆ PRESET TEAM ◆
      </span>
      <div className="w-full max-w-[900px] border-4 border-event bg-[#29251C] p-8 flex flex-col items-center gap-5">
        <h3 className="font-pixel text-2xl text-event">
          BOTH PLAYERS FIGHT WITH THIS TEAM
        </h3>
        <div className="flex flex-wrap justify-center gap-4" data-testid="preset-team">
          {team.map((id) => {
            const a = find(id);
            return a ? <AgentCard key={id} agent={a} size={120} /> : null;
          })}
        </div>
        <p className="font-pixel text-xs text-text-muted text-center">
          THE AGENTS YOU PICKED ARE STILL AT STAKE: A LOSS REMOVES 2 OF THEM
        </p>
      </div>
      <div className="grid w-full max-w-[900px] grid-cols-1 gap-4 sm:grid-cols-2">
        {(["p1", "p2"] as PlayerId[]).map((p) => (
          <div
            key={p}
            className={`border-t-4 ${p === "p1" ? "border-p1" : "border-p2"} bg-[#141420] p-4`}
          >
            <div
              className={`mb-3 font-pixel text-xs ${p === "p1" ? "text-p1" : "text-p2"}`}
            >
              {displayName(p).toUpperCase()} · PICKED
            </div>
            <div className="flex gap-2">
              {squads[p].map((id) => {
                const a = form(p, id);
                return a ? <AgentCard key={id} agent={a} size={64} /> : null;
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="w-full max-w-[900px]">
        <button
          onClick={onAcknowledge}
          className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] text-[#141420] font-pixel text-sm md:text-lg py-5 px-4"
        >
          START ROUND →
        </button>
      </div>
    </div>
  );
}
