import type { ModifierDef } from "../Data/Events/universalModifiers";

export function ModifierScreen({
  modifier,
  onAcknowledge,
  revealed = false,
}: {
  modifier: ModifierDef;
  onAcknowledge: () => void;
  revealed?: boolean; // the second showing of a secret modifier: full name and description
}) {
  // A secret modifier is only "???" the first time round.
  if (modifier.secret && !revealed) {
    return (
      <div className="w-full flex flex-col items-center gap-6 py-3">
        <span className="font-pixel text-sm text-event tracking-widest">
          ◆ UNIVERSAL MODIFIER ◆
        </span>
        <div className="w-full max-w-[900px] border-4 border-event bg-[#29251C] p-8 flex flex-col items-center gap-4">
          <h3 className="font-pixel text-6xl text-event">???</h3>
        </div>
        <div className="w-full max-w-[900px]">
          <button
            onClick={onAcknowledge}
            className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] text-[#141420] font-pixel text-sm md:text-lg py-5 px-4"
          >
            ACKNOWLEDGE →
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full flex flex-col items-center gap-6 py-3">
      <span className="font-pixel text-sm text-event tracking-widest">
        ◆ UNIVERSAL MODIFIER ◆
      </span>
      <div className="w-full max-w-[900px] border-4 border-event bg-[#29251C] p-8 flex flex-col gap-4">
        <h3 className="font-pixel text-3xl text-event">
          {modifier.title.toUpperCase()}
          {modifier.flair && (
            <span className="ml-3 text-lg text-accent">({modifier.flair})</span>
          )}
        </h3>
        <p className="font-lexend text-base text-text-primary">
          {modifier.desc}
        </p>
        <p className="font-pixel text-xs text-text-muted">
          APPLIES TO BOTH PLAYERS · ONE BATTLE ONLY
        </p>
      </div>
      <div className="w-full max-w-[900px]">
        <button
          onClick={onAcknowledge}
          className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] text-[#141420] font-pixel text-sm md:text-lg py-5 px-4"
        >
          {revealed ? "START ROUND →" : "ACKNOWLEDGE →"}
        </button>
      </div>
    </div>
  );
}
