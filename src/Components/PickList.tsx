import type { Agent, DraftQueueItem, PlayerId } from "../types";
import { useEffect, useRef, useState } from "react";

function getGlobalPickNumbers(draftQueue: DraftQueueItem[], player: PlayerId): number[] {
    const result: number[] = [];
    let global = 1;
    for (const item of draftQueue) {
        if (item.type === "pick") {
            if (item.player === player) result.push(global);
            global++;
        }
    }
    return result;
}

function useNewlyFilledSlots(roster: Agent[]): { animating: Set<number>; revealed: Set<number> } {
    const prevLengthRef = useRef(roster.length);
    const [animating, setAnimating] = useState<Set<number>>(new Set());
    const [revealed, setRevealed] = useState<Set<number>>(new Set());

    useEffect(() => {
        const prev = prevLengthRef.current;
        const curr = roster.length;
        if (curr > prev) {
            const filled = new Set<number>();
            for (let i = prev; i < curr; i++) filled.add(i);
            setAnimating(filled);
            const revealTimer = setTimeout(() => setRevealed(filled), 600);
            const clearTimer = setTimeout(() => {
                setAnimating(new Set());
                setRevealed(new Set());
            }, 800);
            prevLengthRef.current = curr;
            return () => { clearTimeout(revealTimer); clearTimeout(clearTimer); };
        }
        prevLengthRef.current = curr;
    }, [roster.length]);

    return { animating, revealed };
}

interface SlotProps {
    index: number;
    agent: Agent | null;
    globalPickNumber: number;
    player: PlayerId;
    animating?: boolean;
    revealed?: boolean;
    pendingAgent: Agent | null;
}

function Slot({ index, agent, globalPickNumber, player, animating, revealed, pendingAgent }: SlotProps) {
    const isP1 = player === "p1";
    const filled = agent !== null;
    const showFilled = filled && (!animating || revealed);
    const showPending = !showFilled && pendingAgent != null;
    const slotNumber = String(index + 1).padStart(2, "0");
    const pickNumber = String(globalPickNumber).padStart(2, "0");
    const accentColor = isP1 ? "#3A8EF6" : "#E63946";
    const borderColor = isP1 ? "border-p1" : "border-p2";

    return (
        <div className={`relative flex items-stretch h-16 overflow-hidden ${filled ? `border-2 ${borderColor}` : "opacity-40"}`}>
            <div className="absolute inset-0 bg-unavailable" />

            {animating && (
                <div
                    className={`absolute inset-0 z-20 overflow-visible ${isP1 ? "wipe-overlay-p1" : "wipe-overlay-p2"}`}
                    style={{ backgroundColor: accentColor }}
                >
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0"
                            style={{
                                width: "4px",
                                [isP1 ? "right" : "left"]: `-${i * 8}px`,
                                backgroundColor: accentColor,
                            }}
                        />
                    ))}
                </div>
            )}

            <span className={`relative z-10 text-md text-text-muted flex-shrink-0 w-7 flex items-center font-sans ${isP1 ? "justify-start pl-1.5" : "justify-end pr-1.5 order-last"}`}>
                {slotNumber}
            </span>

            <div className={`relative z-10 flex-1 flex flex-col justify-center px-2 ${isP1 ? "text-left" : "text-right"}`}>
                <p className={`${showFilled || showPending ? "text-sm" : "text-lg"} font-bold leading-none ${showPending && !showFilled ? "text-text-muted" : filled ? "text-text-primary" : "text-text-muted"} font-sans`}>
                    {showFilled ? agent!.name : showPending ? pendingAgent!.name : "Empty Slot"}
                </p>
                {(showFilled || showPending) && (
                    <p className="text-xs text-text-muted leading-none mt-2">
                        {showFilled ? agent!.specialty : pendingAgent!.specialty}
                    </p>
                )}
            </div>

            <div
                className={`relative z-10 w-24 flex-shrink-0 overflow-hidden ${isP1 ? "order-last" : "order-first"}`}
                style={{
                    clipPath: isP1
                        ? "polygon(0% 0%, 100% 0%, 100% 100%, 25% 100%)"
                        : "polygon(0% 0%, 100% 0%, 75% 100%, 0% 100%)",
                    backgroundColor: accentColor + "33",
                }}
            >
                {showFilled ? (
                    <img src={`/agents/${agent!.id}.png`} alt={agent!.name} className="w-full h-full object-cover object-center scale-150" />
                ) : showPending ? (
                    <img src={`/agents/${pendingAgent!.id}.png`} alt={pendingAgent!.name} className="w-full h-full object-cover object-center scale-150 grayscale opacity-50" />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-7xl font-black text-text-primary" style={{ fontFamily: "Lexend, sans-serif" }}>
                        {pickNumber}
                    </span>
                )}
            </div>
        </div>
    );
}

interface PlayerListProps {
    player: PlayerId;
    roster: Agent[];
    globalPickNumbers: number[];
    picksPerPlayer: number;
    displayName: string;
    pendingAgent: Agent | null;
}

function PlayerList({ player, roster, globalPickNumbers, picksPerPlayer, displayName, pendingAgent }: PlayerListProps) {
    const isP1 = player === "p1";
    const accentColor = isP1 ? "#3A8EF6" : "#E63946";
    const textColor = isP1 ? "text-p1" : "text-p2";
    const { animating: newlyFilled, revealed: newlyRevealed } = useNewlyFilledSlots(roster);
    const slots = Array.from({ length: picksPerPlayer }, (_, i) => roster[i] ?? null);
    const nextEmptyIndex = roster.length;

    return (
        <div className="flex flex-col gap-1">
            <div
                className="relative h-8 flex items-center overflow-hidden mb-1"
                style={{
                    backgroundColor: accentColor + "33",
                    clipPath: isP1
                        ? "polygon(0% 0%, 92.5% 0%, 100% 100%, 0% 100%)"
                        : "polygon(7.5% 0%, 100% 0%, 100% 100%, 0% 100%)",
                }}
            >
                <div
                    className="absolute top-0 bottom-0 w-1 flex-shrink-0"
                    style={{ backgroundColor: accentColor, left: isP1 ? 0 : "auto", right: isP1 ? "auto" : 0 }}
                />
                <span className={`relative z-10 text-sm font-pixel ${textColor} w-full px-3 ${isP1 ? "text-left" : "text-right"}`}>
                    {displayName.toUpperCase()}
                </span>
            </div>

            {slots.map((agent, i) => (
                <Slot
                    key={i}
                    index={i}
                    agent={agent}
                    globalPickNumber={globalPickNumbers[i] ?? i + 1}
                    animating={newlyFilled.has(i)}
                    revealed={newlyRevealed.has(i)}
                    player={player}
                    pendingAgent={i === nextEmptyIndex ? pendingAgent : null}
                />
            ))}
        </div>
    );
}

export function PickList({
    rosters,
    draftQueue,
    picksPerPlayer,
    displayName,
    player,
    pendingAgent,
}: {
    rosters: Record<PlayerId, Agent[]>;
    draftQueue: DraftQueueItem[];
    picksPerPlayer: number;
    displayName: (p: PlayerId | null) => string;
    player: PlayerId;
    pendingAgent?: Agent | null;
}) {
    const picks = getGlobalPickNumbers(draftQueue, player);

    return (
        <PlayerList
            player={player}
            roster={rosters[player]}
            globalPickNumbers={picks}
            picksPerPlayer={picksPerPlayer}
            displayName={displayName(player)}
            pendingAgent={pendingAgent ?? null}
        />
    );
}