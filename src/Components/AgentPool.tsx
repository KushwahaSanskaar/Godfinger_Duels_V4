import { CLASS_GROUPS } from "../Data/modes";
import { AgentCard } from "../Components/AgentCard";
import type { Agent } from "../types";

const CARD_SIZE = 112;
const CARD_GAP = 8;
const MAX_ROWS = 6;

function groupColumnCount(agentCount: number): number {
    return Math.ceil(agentCount / MAX_ROWS);
}

function groupWidth(agentCount: number): number {
    const cols = groupColumnCount(agentCount);
    return cols * CARD_SIZE + (cols - 1) * CARD_GAP;
}

interface AgentPoolProps {
    agents: Agent[];
    cardSize?: number;
    showHeaders?: boolean;
    flat?: boolean;
    banned: string[];
    showBanOverlay: boolean;
    unavailableGroups?: string[];
    selection?: (agent: Agent) => "none" | "p1" | "p2" | "mirror" | "selected-p1" | "selected-p2";
    unavailable?: (agent: Agent) => boolean;
    onClick: (agent: Agent) => void;
    onConfirm?: (agent: Agent) => void;
    confirmLabel?: string;
    confirmColor?: string;
}

export function AgentPool({
    agents,
    cardSize,
    showHeaders = true,
    flat = false,
    banned,
    showBanOverlay,
    unavailableGroups = [],
    selection,
    unavailable: unavailableFn,
    onClick,
    onConfirm,
    confirmLabel,
    confirmColor,
}: AgentPoolProps) {

    if (flat) {
        return (
            <div className="flex flex-wrap gap-1 justify-center">
                {agents.map((a) => {
                    const isBanned = banned.includes(a.id);
                    return (
                        <AgentCard
                            key={a.id}
                            agent={a}
                            banned={showBanOverlay && isBanned}
                            unavailable={(!showBanOverlay && isBanned) || (unavailableFn ? unavailableFn(a) : false)}
                            selection={selection ? selection(a) : "none"}
                            onClick={() => onClick(a)}
                            size={cardSize ?? CARD_SIZE}
                        />
                    );
                })}
            </div>
        );
    }
    
    return (
        <div className="flex gap-[8px] items-start justify-center">
            {CLASS_GROUPS.map((group) => {
                const groupAgents = agents.filter((a) =>
                    group.specialties.includes(a.specialty)
                );
                const groupLocked = unavailableGroups.includes(group.label);

                return (
                    <div key={group.label} className="flex flex-col gap-2">
                        {showHeaders && (
                            <p className={"text-sm text-neutral-400 mb-2 text-center"}>{group.label}</p>
                        )}
                        <div className="flex flex-col flex-wrap gap-2"
                            style={{
                                maxHeight: `${MAX_ROWS * (CARD_SIZE + CARD_GAP)}px`,
                                width: `${groupWidth(groupAgents.length)}px`,
                            }}>
                            {groupAgents.map((a) => {
                                const isBanned = banned.includes(a.id);
                                return (
                                    <AgentCard
                                        key={a.id}
                                        agent={a}
                                        banned={showBanOverlay && isBanned}
                                        unavailable={groupLocked || (!showBanOverlay && isBanned) || (unavailableFn ? unavailableFn(a) : false)}
                                        selection={selection ? selection(a) : "none"}
                                        onClick={() => onClick(a)}
                                        onConfirm={selection?.(a).startsWith("selected") && onConfirm ? () => onConfirm!(a) : undefined}
                                        confirmColor={confirmColor}
                                        confirmLabel={confirmLabel}
                                        size={cardSize ?? CARD_SIZE}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
