import { useEffect, useState } from "react";
import type { GameEvent } from "../types";

type WipeState = "idle" | "entering" | "visible" | "leaving";

interface EventOverlayProps {
    event: GameEvent | null;
    onAcknowledge: () => void;
}

export function EventOverlay({ event, onAcknowledge }: EventOverlayProps) {
    const [wipeState, setWipeState] = useState<WipeState>("idle");
    const [displayedEvent, setDisplayedEvent] = useState<GameEvent | null>(null);

    useEffect(() => {
        if (event && wipeState === "idle") {
            setWipeState("entering");
            const showContent = setTimeout(() => setDisplayedEvent(event), 165);
            const showVisible = setTimeout(() => setWipeState("visible"), 1100);
            return () => { clearTimeout(showContent); clearTimeout(showVisible); };
        }
    }, [event]);

    const handleAcknowledge = () => {
        setWipeState("leaving");
        const clear = setTimeout(() => {
            setWipeState("idle");
            onAcknowledge();
        }, 1100);

        setTimeout(() => setDisplayedEvent(null), 165);
        return () => clearTimeout(clear);
    };

    if (wipeState === "idle" && !displayedEvent) return null;

    return (
        <div className="relative w-full h-full min-h-64 overflow-hidden">
            {/* Event content */}
            {displayedEvent && (
                <div className="relative z-10 flex flex-col items-center justify-center gap-6 p-8 h-full text-center">
                    <span className="text-xs font-pixel text-event tracking-widest">DRAFT EVENT</span>
                    <h3
                        className="font-pixel font-bold text-3xl text-white leading-snug"
                        style={{
                            textShadow: "0.2rem 0 0 #b8960f, 0 0.2rem 0 #b8960f, 0.2rem 0.2rem 0 #b8960f",
                            WebkitTextStroke: "1px #F5C518",
                        }}
                    >
                        {displayedEvent.title}
                    </h3>
                    <p className="font-sand text-text-primary text-lg max-w-sm">{displayedEvent.desc}</p>
                    {wipeState === "visible" && (
                        <button
                            onClick={handleAcknowledge}
                            className="mt-4 px-10 py-3 font-pixel font-bold text-xl text-white tracking-widest"
                            style={{ backgroundColor: "#F5C518", color: "#0F0F1A" }}
                        >
                            ACKNOWLEDGE
                        </button>
                    )}
                </div>
            )}

            {/* Dither wipe overlay */}
            {(wipeState === "entering" || wipeState === "leaving") && (
                <div
                    className={`absolute inset-0 z-20 overflow-visible ${wipeState === "entering" ? "dither-wipe-in" : "dither-wipe-out"}`}
                >
                    {/* Solid yellow body */}
                    <div className="absolute inset-0" style={{ backgroundColor: "#F5C518" }} />

                    {/* Dither strip at leading edge */}
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            width: "48px",
                            right: wipeState === "entering" ? "-48px" : "auto",
                            left: wipeState === "leaving" ? "-48px" : "auto",
                            backgroundImage: `
                                linear-gradient(45deg, #F5C518 25%, transparent 25%),
                                linear-gradient(-45deg, #F5C518 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #F5C518 75%),
                                linear-gradient(-45deg, transparent 75%, #F5C518 75%)
                            `,
                            backgroundSize: "8px 8px",
                            backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
                        }}
                    />
                </div>
            )}
        </div>
    );
}