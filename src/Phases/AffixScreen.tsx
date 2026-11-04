import { AgentCard } from "../Components/AgentCard";
import type { AffixChoice, AffixPickSpec, PlayerId } from "../types";
import type { AffixDef } from "../Data/Events/affixes";
import type { AffixOffer } from "../Logic/interludeRules";

// Positive = darker blue, negative = darker red (the palette's "-alt" shades),
// always paired with a ▲ / ▼ label so they never read as a player's colour.
const THEME = {
  positive: {
    border: "border-[#1748A1]",
    bg: "bg-[#0B1B40]",
    text: "text-p1-alt2",
    tag: "▲ POSITIVE",
    button: "bg-[#1748A1] hover:bg-[#2160D0] text-white",
  },
  negative: {
    border: "border-[#972934]",
    bg: "bg-[#3A0E15]",
    text: "text-p2-alt2",
    tag: "▼ NEGATIVE",
    button: "bg-[#972934] hover:bg-[#C23645] text-white",
  },
} as const;

const accentOf = (p: PlayerId) => (p === "p1" ? "text-p1" : "text-p2");

function AffixCard({
  def,
  forName,
  forPlayer,
  buttonLabel,
  onClick,
}: {
  def: AffixDef | null;
  forName: string;
  forPlayer: PlayerId;
  buttonLabel: string;
  onClick: () => void;
}) {
  if (!def) {
    return (
      <div className="border-2 border-[#353548] bg-[#141420] p-6 flex items-center justify-center font-pixel text-xs text-text-muted">
        NOTHING AVAILABLE
      </div>
    );
  }
  const t = THEME[def.polarity];
  return (
    <div className={`border-4 ${t.border} ${t.bg} p-6 flex flex-col gap-4`}>
      <div className="flex justify-between items-center">
        <span className={`font-pixel text-xs ${t.text}`}>{t.tag}</span>
        <span className={`font-pixel text-xs ${accentOf(forPlayer)}`}>
          FOR {forName.toUpperCase()}
        </span>
      </div>
      <h3 className={`font-pixel text-xl ${t.text}`}>
        {def.title.toUpperCase()}
      </h3>
      <p className="font-lexend text-sm text-text-primary flex-1">{def.desc}</p>
      <button
        onClick={onClick}
        className={`w-full font-pixel text-sm py-4 px-4 ${t.button}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

interface AffixScreenProps {
  offer: AffixOffer;
  choice: AffixChoice | null;
  pick: AffixPickSpec | null;
  selection: string[];
  necroStage: "sacrifice" | "revive";
  displayName: (p: PlayerId | null) => string;
  onChoose: (kind: "positive" | "negative") => void;
  onTogglePick: (agentId: string) => void;
  onConfirm: () => void;
}

export function AffixScreen({
  offer,
  choice,
  pick,
  selection,
  necroStage,
  displayName,
  onChoose,
  onTogglePick,
  onConfirm,
}: AffixScreenProps) {
  const { chooser, leader } = offer;
  const header = (
    <header className="flex flex-col items-center gap-2 text-center">
      <span className="font-pixel text-sm text-event tracking-widest">
        ◆ AFFIX ◆
      </span>
    </header>
  );

  // ---------- step 1: the losing player chooses ----------
  if (!choice) {
    return (
      <div className="w-full flex flex-col items-center gap-6 py-3">
        {header}
        <p className="font-pixel text-sm text-text-primary text-center">
          <span className={accentOf(chooser)}>
            {displayName(chooser).toUpperCase()}
          </span>{" "}
          IS BEHIND — TAKE THE POSITIVE, OR GIVE THE NEGATIVE TO{" "}
          <span className={accentOf(leader)}>
            {displayName(leader).toUpperCase()}
          </span>
        </p>
        <div className="grid md:grid-cols-2 gap-6 w-full max-w-[1100px]">
          <AffixCard
            def={offer.positive}
            forPlayer={chooser}
            forName={displayName(chooser)}
            buttonLabel="TAKE THIS AFFIX"
            onClick={() => onChoose("positive")}
          />
          <AffixCard
            def={offer.negative}
            forPlayer={leader}
            forName={displayName(leader)}
            buttonLabel={`GIVE TO ${displayName(leader).toUpperCase()}`}
            onClick={() => onChoose("negative")}
          />
        </div>
      </div>
    );
  }

  // ---------- step 2: the chosen affix, plus any pick it needs ----------
  const { def, target } = choice;
  const t = THEME[def.polarity];
  const roster = pick?.candidates ?? [];
  const full = !!pick && selection.length >= pick.max;
  const isNecroSacrifice =
    def.id === "spell-of-necromancy" && necroStage === "sacrifice";

  let buttonLabel = "CONTINUE →";
  let canConfirm = true;
  if (pick && !pick.noEffect) {
    if (isNecroSacrifice) {
      buttonLabel = selection.length === 0 ? "SKIP →" : "CONFIRM →";
    } else {
      buttonLabel = "CONFIRM →";
      canConfirm = selection.length >= pick.min;
    }
  }

  return (
    <div className="w-full flex flex-col items-center gap-6 py-3">
      {header}
      <div
        className={`w-full max-w-[900px] border-4 ${t.border} ${t.bg} p-6 flex flex-col gap-3`}
      >
        <div className="flex justify-between items-center">
          <span className={`font-pixel text-xs ${t.text}`}>{t.tag}</span>
          <span className={`font-pixel text-xs ${accentOf(target)}`}>
            AFFECTS {displayName(target).toUpperCase()}
          </span>
        </div>
        <h3 className={`font-pixel text-2xl ${t.text}`}>
          {def.title.toUpperCase()}
        </h3>
        <p className="font-lexend text-sm text-text-primary">{def.desc}</p>
      </div>

      {pick && (
        <div className="w-full max-w-[900px] bg-[#141420] p-5 flex flex-col gap-4">
          <span className={`font-pixel text-sm ${accentOf(target)}`}>
            {pick.label}
          </span>
          {pick.noEffect ? null : (
            <div className="flex flex-wrap gap-3 justify-center">
              {roster.map((agent) => {
                const selected = selection.includes(agent.id);
                return (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    size={88}
                    // once the list is full, every other agent greys out
                    unavailable={full && !selected}
                    selection={selected ? target : "none"}
                    onClick={() => onTogglePick(agent.id)}
                  />
                );
              })}
            </div>
          )}
          {!pick.noEffect && pick.max > 0 && (
            <span className="font-pixel text-xs text-text-muted text-center">
              {selection.length}/{pick.max} SELECTED
            </span>
          )}
        </div>
      )}

      <div className="w-full max-w-[900px]">
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          className="w-full bg-[#F5C518] hover:bg-[#FFDA4D] disabled:opacity-40 disabled:hover:bg-[#F5C518] text-[#141420] font-pixel text-sm md:text-lg py-5 px-4"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
