import type { Agent, PlayerId } from "../types";
import { AgentCard } from "../Components/AgentCard";

interface GameOverProps {
  winner: PlayerId | null;
  rosters: Record<PlayerId, Agent[]>;
  displayName: (p: PlayerId | null) => string;
  onReset: () => void;
}

export function GameOver({ winner, rosters, displayName, onReset }: GameOverProps) {
  const isP1 = winner === "p1";

  return (
    <div className="flex flex-col items-center gap-8 py-12">

      {/* Winner */}
      <div className="flex flex-col items-center gap-3">
        <span className={`text-xs font-pixel tracking-widest ${isP1 ? "text-p1" : "text-p2"}`}>
          MATCH OVER
        </span>
        <h2
          className="font-pixel font-bold text-5xl text-white tracking-widest leading-none"
          style={{
            textShadow: isP1
              ? "0.3rem 0 0 #1748A1, 0 0.3rem 0 #1748A1, 0.3rem 0.3rem 0 #1748A1"
              : "0.3rem 0 0 #972934, 0 0.3rem 0 #972934, 0.3rem 0.3rem 0 #972934",
            WebkitTextStroke: isP1 ? "2px #77B2FF" : "2px #FF6C77",
          }}
        >
          {displayName(winner).toUpperCase()} WINS
        </h2>
      </div>

      {/* Final rosters */}
      <div className="flex gap-12 items-start">
        {(["p1", "p2"] as PlayerId[]).map((p) => (
          <div key={p} className="flex flex-col gap-2 items-center">
            <span className={`text-xs font-pixel ${p === "p1" ? "text-p1" : "text-p2"}`}>
              {displayName(p).toUpperCase()} — {rosters[p].length} remaining
            </span>
            <div className="flex flex-wrap gap-1 justify-center max-w-48">
              {rosters[p].map((a) => (
                <AgentCard key={a.id} agent={a} selection={p} size={56} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="mt-4 px-12 py-3 bg-accent text-white font-pixel font-bold text-xl tracking-widest hover:opacity-80 transition-opacity"
      >
        NEW MATCH
      </button>

    </div>
  );
}