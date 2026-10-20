import type { Agent, PlayerId } from "../types";
import { AgentCard } from "../Components/AgentCard";

interface GameOverProps {
  winner: PlayerId | null;
  rosters: Record<PlayerId, Agent[]>;
  roundWins: Record<PlayerId, number>;
  displayName: (p: PlayerId | null) => string;
  onReset: () => void;
}

export function GameOver({ winner, rosters, roundWins, displayName, onReset }: GameOverProps) {
  const winnerColor = winner === "p1" ? "text-p1" : winner === "p2" ? "text-p2" : "text-text-primary";

  return (
    <div className="w-full flex flex-col gap-6 py-3">
      <div className="flex flex-col items-center gap-2 py-5 text-center">
        <span className="font-pixel text-sm text-text-muted tracking-widest">
          MATCH COMPLETE
        </span>
        <h2
          className={`font-pixel font-bold text-4xl md:text-6xl leading-tight ${winnerColor}`}
          style={{
            textShadow: winner === "p1"
              ? "5px 5px 0 #1748A1"
              : winner === "p2"
              ? "5px 5px 0 #972934"
              : "5px 5px 0 #303044",
          }}
        >
          {winner ? "VICTORY!" : "MATCH OVER"}
        </h2>
        <span className={`font-pixel text-lg ${winnerColor}`}>
          {winner ? `${displayName(winner).toUpperCase()} WINS` : "NO WINNER"}
        </span>
      </div>

      {/* Final round-win score */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 border-2 border-[#49405B] bg-[#141420] px-4 py-5 sm:px-8">
        <span className="text-center font-pixel text-[clamp(10px,1vw,18px)] tracking-widest text-[#F5C518]">
          FINAL ROUND SCORE
        </span>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
          <div className="min-w-0 text-right">
            <div className="truncate font-pixel text-[clamp(10px,1.2vw,20px)] text-p1">
              {displayName("p1").toUpperCase()}
            </div>
            <div className="font-pixel text-[clamp(30px,4.4vw,76px)] leading-tight text-p1">
              {roundWins.p1}
            </div>
          </div>
          <span className="font-pixel text-[clamp(16px,2vw,30px)] text-text-muted">—</span>
          <div className="min-w-0 text-left">
            <div className="truncate font-pixel text-[clamp(10px,1.2vw,20px)] text-p2">
              {displayName("p2").toUpperCase()}
            </div>
            <div className="font-pixel text-[clamp(30px,4.4vw,76px)] leading-tight text-p2">
              {roundWins.p2}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-stretch">
        {(["p1", "p2"] as PlayerId[]).map((player) => {
          const isP1 = player === "p1";
          const isWinner = winner === player;
          const accent = isP1 ? "text-p1" : "text-p2";
          const border = isP1 ? "border-p1" : "border-p2";
          const background = isP1 ? "bg-p1" : "bg-p2";
          const roster = rosters[player];

          return (
            <section
              key={player}
              className={`flex min-w-0 flex-col border-t-4 ${border} bg-[#141420]`}
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#303044]">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`font-pixel text-lg ${accent}`}>
                    {displayName(player).toUpperCase()}
                  </span>
                  <span className="text-xs text-text-muted uppercase tracking-widest">
                    Final roster · {roundWins[player]} {roundWins[player] === 1 ? "round win" : "round wins"}
                  </span>
                </div>
                <div className={`font-pixel text-lg text-right ${isWinner ? accent : "text-text-muted"}`}>
                  {isWinner ? "WINNER" : winner ? "DEFEAT" : "DRAW"}
                </div>
              </div>

              <div className="flex flex-col gap-4 px-5 pt-5 pb-6">
                <div className="flex justify-between items-center border-b border-[#303044] pb-2">
                  <span className="font-pixel text-sm text-text-primary">SURVIVORS</span>
                  <span className={`font-pixel text-sm ${accent}`}>
                    {roster.length} REMAINING
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-3 w-fit max-w-full mx-auto justify-items-center">
                  {roster.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selection={player}
                      size={128}
                    />
                  ))}
                </div>
                {roster.length === 0 && (
                  <div className="font-pixel text-xs text-text-muted text-center py-8">
                    NO AGENTS REMAINING
                  </div>
                )}
              </div>
              <div className={`mt-auto h-2 ${background}`} />
            </section>
          );
        })}
      </div>

      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full max-w-lg py-4 px-8 bg-accent text-white font-pixel font-bold text-lg tracking-widest hover:brightness-110"
        >
          NEW MATCH
        </button>
      </div>
    </div>
  );
}