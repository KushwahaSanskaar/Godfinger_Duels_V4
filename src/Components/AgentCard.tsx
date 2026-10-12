import { Agent } from "../types";

type AgentCardState =
    | "default"
    | "banned"
    | "unavailable"
    | "p1"
    | "p2"
    | "mirror";

interface AgentCardProps {
    agent: Agent;
    banned?: boolean;
    unavailable?: boolean;
    cooldown?: number; // rounds remaining on cooldown; >0 shows yellow border + hourglass badge instead of grey
    selection?: "none" | "p1" | "p2" | "mirror" | "selected-p1" | "selected-p2";
    onClick?: () => void;
    onConfirm?: () => void;
    confirmLabel?: string;
    confirmColor?: string;
    size?: number;
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
    confirmColor,
    size = 64,
}: AgentCardProps) {


    const imagePath = `/agents/${agent.id}.png`;

    // "unavailable" still governs whether the card is clickable — cooldown
    // just changes how that state is DRAWN, so a cooldown agent doesn't
    // read as "eliminated" the way a plain greyed-out card does.
    const onCooldown = cooldown > 0;
    const interactionDisabled = banned || unavailable;
    const showGreyVisual = interactionDisabled && !onCooldown;

    let borderClass = "border border-banned";
    let borderStyle: React.CSSProperties = {};

    if (onCooldown) {
        borderClass = "border-4 border-yellow-400";
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
                borderClass = "border-4 border-p1-alt2";
                break;

            case "selected-p2":
                borderClass = "border-4 border-p2-alt2";
                break;;
        }
    }

    return (
        <div
            onClick={!interactionDisabled ? onClick : undefined}
            style={{ ...borderStyle, width: size, height: size }}
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
                    className={`
                                w-full h-full object-cover object-top hover:scale-105
                                ${showGreyVisual ? "grayscale" : ""}
                                transition-all duration-150
                            `}
                />
            </div>

            {/* Cooldown badge */}
            {onCooldown && (
                <div
                    className="absolute -top-1 -right-1 z-20 flex items-center gap-0.5 rounded-full bg-yellow-400 px-1 h-5 min-w-[1.25rem] justify-center text-black text-[10px] font-bold leading-none"
                    title={`On cooldown for ${cooldown} more round${cooldown > 1 ? "s" : ""}`}
                >
                    <span>⏳</span>
                    <span>{cooldown}</span>
                </div>
            )}

            {/* Confirm Overlay */}
            {(() => { console.log("overlay check:", !!onConfirm, confirmLabel, confirmColor); return null; })()}
            {onConfirm && confirmLabel && (
                <div
                    className="absolute left-0 right-0 top-8 h-10 z-10 flex items-center justify-center py-1 cursor-pointer"
                    style={{ backgroundColor: confirmColor }}
                    onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                >
                    <span className="text-white text-2xl font-pixel font-bold"
                        style={{
                            transform: "translateY(-2px)",
                            textShadow: confirmColor === "#3A8EF6"
                                ? "0.2rem 0 0 #1748A1, 0 0.2rem 0 #1748A1, 0.2rem 0.2rem 0 #1748A1"
                                : "0.2rem 0 0 #972934, 0 0.2rem 0 #972934, 0.2rem 0.2rem 0 #972934",
                            WebkitTextStroke: confirmColor === "#3A8EF6" ? "1px #77B2FF" : "1px #FF6C77"
                        }}>{confirmLabel}</span>
                </div>
            )}

            {/* Ban X Overlay */}
            {banned && (
                <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 w-full h-full"
                >
                    <line x1="0" y1="0" x2="100" y2="100" stroke="#802027" strokeWidth="15" />
                    <line x1="100" y1="0" x2="0" y2="100" stroke="#802027" strokeWidth="15" />
                </svg>
            )}
        </div>
    )
}