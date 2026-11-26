import { Agent } from "../types";
import { agentArtUrl } from "../Logic/agentArt";
import { HourglassIcon } from "./Icons";

interface AgentCardProps {
  agent: Agent;
  banned?: boolean;
  unavailable?: boolean;
  cooldown?: number; // rounds remaining on cooldown; >0 shows a lavender border + hourglass badge instead of grey
  selection?: "none" | "p1" | "p2" | "mirror" | "selected-p1" | "selected-p2";
  onClick?: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
  size?: number;
  tags?: string[]; // extra strips along the bottom, e.g. OVERTIME, REVIVED
  cooldownUsable?: boolean; // on cooldown but pickable anyway (last resort): full colour
}

export function AgentCard({
  agent,
  banned = false,
  unavailable = false,
  cooldown = 0,
  selection = "none",
  onClick,
  onConfirm,
  confirmLabel,
  size = 64,
  tags = [],
  cooldownUsable = false,
}: AgentCardProps) {
  const imagePath = agentArtUrl(agent);
  const scale = Math.max(1, size / 112);
  const borderWidth = size >= 180 ? Math.min(9, Math.round(size / 28)) : 4;

  // "unavailable" still governs whether the card is clickable - cooldown
  // just changes how that state is DRAWN, so a cooldown agent doesn't
  // read as "eliminated" the way a plain greyed-out card does.
  const onCooldown = cooldown > 0;
  const interactionDisabled = banned || unavailable;
  const showGreyVisual = interactionDisabled && !onCooldown;

  let borderClass = "border border-banned";
  let borderStyle: React.CSSProperties = {};

  if (onCooldown) {
    borderClass = "border-4 border-lavender";
  } else {
    switch (banned ? "none" : selection) {
      case "p1":
        borderClass = "border-4 border-p1";
        break;

      case "p2":
        borderClass = "border-4 border-p2";
        break;

      case "mirror":
        borderStyle = {
          borderTop: "4px solid #3A8EF6",
          borderLeft: "4px solid #3A8EF6",
          borderBottom: "4px solid #E63946",
          borderRight: "4px solid #E63946",
        };
        break;

      case "selected-p1":
        borderClass = "border-4 border-p1";
        break;

      case "selected-p2":
        borderClass = "border-4 border-p2";
        break;
    }
  }

  return (
    <div
      onClick={!interactionDisabled ? onClick : undefined}
      style={{
        ...borderStyle,
        width: size,
        height: size,
        ...(borderClass.includes("border-4") ? { borderWidth } : {}),
      }}
      className={`
                relative overflow-hidden flex-shrink-0
                ${borderClass}
                ${interactionDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                `}
    >
      {/* Agent Images */}
      <div className="relative w-full h-full bg-unavailable">
        <img
          src={imagePath}
          alt={agent.name}
          draggable={false}
          className={`w-full h-full object-cover object-top hover:scale-105
                      ${showGreyVisual ? "grayscale brightness-[0.55]" : onCooldown && !cooldownUsable ? "grayscale-[0.75] brightness-[0.7]" : ""}
                      transition-all duration-150`}
        />
      </div>

      {/* Cooldown badge */}
      {onCooldown && (
        <div
          className="text-trim absolute right-0 top-0 z-20 flex items-center bg-ink font-pixel leading-none text-lavender-light"
          style={{
            fontSize: Math.max(8, Math.round(10 * scale)),
            padding: `${Math.round(5 * scale)}px ${Math.round(6 * scale)}px`,
            gap: Math.round(4 * scale),
          }}
          title={`On cooldown for ${cooldown} more round${cooldown > 1 ? "s" : ""}`}
        >
          <HourglassIcon />
          <span>{cooldown}</span>
        </div>
      )}

      {/* Tags along the bottom: OVERTIME / REVIVED, morph item (Soul Stone, Invitations) */}
      {(tags.length > 0 || agent.tag) && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
          {[...tags, agent.tag].filter(Boolean).map((label) => (
            <div
              key={label as string}
              className="text-trim bg-ink/90 text-center font-pixel leading-none tracking-wider text-lavender-bright"
              style={{
                fontSize: Math.max(8, Math.round(size * 0.1)),
                padding: `${Math.round(size * 0.06)}px 0`,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Confirm Overlay */}
      {onConfirm && confirmLabel && (
        <div
          className="absolute left-0 right-0 top-[28%] h-[44%] z-10 flex items-center justify-center cursor-pointer border-y-4 border-event bg-plate/95"
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
        >
          <span
            className="text-trim text-event font-pixel font-bold tracking-[-0.12em]"
            style={{ fontSize: `clamp(7px, ${size * 0.2}px, 58px)` }}
          >
            {confirmLabel}
          </span>
        </div>
      )}

      {/* Ban X Overlay */}
      {banned && (
        <div
          className="absolute left-[-20%] right-[-20%] top-[34%] z-10 flex h-[32%] -rotate-12 items-center justify-center bg-ink/90 outline outline-[3px] outline-p2"
        >
          <span
            className="text-trim font-pixel font-bold tracking-[-0.12em] text-p2-alt2"
            style={{ fontSize: `clamp(7px, ${size * 0.2}px, 52px)` }}          >
            BANNED
          </span>
        </div>
      )}
    </div>
  );
}