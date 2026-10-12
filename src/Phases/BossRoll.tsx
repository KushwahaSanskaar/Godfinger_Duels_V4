import type { Boss } from "../Data/bosses";

interface BossRollProps {
  currentBoss: Boss | null;
  round: number;
  onRoll: () => void;
  onContinue: () => void;
}

export function BossRoll({ currentBoss, round, onRoll, onContinue }: BossRollProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: "calc(100vh - 12rem)" }}
    >
      <span className="font-pixel text-text-primary text-xl">ROUND {round}</span>
      <span className="text-xs font-pixel text-text-muted tracking-widest">BOSS ROLL</span>

      {!currentBoss ? (
        <button
          onClick={onRoll}
          className="px-10 py-3 font-pixel font-bold text-xl text-white tracking-widest bg-accent hover:opacity-80 transition-opacity"
        >
          ROLL
        </button>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <p className="font-sand text-2xl text-text-primary">{currentBoss.name}</p>
          <button
            onClick={onContinue}
            className="px-10 py-3 font-pixel font-bold text-xl text-white tracking-widest bg-accent hover:opacity-80 transition-opacity"
          >
            CONTINUE
          </button>
        </div>
      )}
    </div>
  );
}
