import type { PlayerId, RoundEffects } from "../types";

// Reminds everyone what is in force for the battle being played.
export function ActiveEffects({
  effects,
  displayName,
}: {
  effects: RoundEffects;
  displayName: (p: PlayerId | null) => string;
}) {
  const { modifier, affix } = effects;
  if (!modifier && !affix) return null;
  return (
    <div className="flex flex-wrap gap-3 justify-center mb-4">
      {modifier && (
        <span className="font-pixel text-xs border-2 border-event text-event bg-[#29251C] px-3 py-2">
          ◆ MODIFIER · {modifier.title.toUpperCase()}
        </span>
      )}
      {affix && (
        <span
          className={`font-pixel text-xs border-2 px-3 py-2 ${
            affix.polarity === "positive"
              ? "border-[#1748A1] bg-[#0B1B40] text-p1-alt2"
              : "border-[#972934] bg-[#3A0E15] text-p2-alt2"
          }`}
          title={affix.desc}
        >
          {affix.polarity === "positive" ? "▲" : "▼"} {affix.title.toUpperCase()} ·{" "}
          {displayName(affix.target).toUpperCase()}
          {affix.note ? ` · ${affix.note}` : ""}
        </span>
      )}
    </div>
  );
}
