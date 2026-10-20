import { useEffect, useState } from "react";
import type { GameEvent } from "../types";

type WipeState = "idle" | "entering" | "visible" | "leaving";

interface EventOverlayProps {
    event: GameEvent | null;
    onAcknowledge: () => void;
}

export function EventOverlay({
    event,
    onAcknowledge,
}: EventOverlayProps) {
    const [wipeState, setWipeState] =
        useState<WipeState>("idle");

    const [displayedEvent, setDisplayedEvent] =
        useState<GameEvent | null>(null);


    useEffect(() => {
        if (!event) return;

        setWipeState("entering");

        const showContent = setTimeout(() => {
            setDisplayedEvent(event);
        }, 385);

        const showVisible = setTimeout(() => {
            setWipeState("visible");
        }, 1100);

        return () => {
            clearTimeout(showContent);
            clearTimeout(showVisible);
        };
    }, [event]);

    const handleAcknowledge = () => {
        if (wipeState !== "visible") return;
        setWipeState("leaving");

        setTimeout(
            () => setDisplayedEvent(null),
            385
        );

        setTimeout(() => {
            setWipeState("idle");
            onAcknowledge();
        }, 1100);
    };

    if (wipeState === "idle" && !displayedEvent) {
        return null;
    }

    return (
        <div className="relative w-full overflow-hidden bg-[#141420]"
            style={{ height: "clamp(360px, 55.56vh, 1200px)" }}>

            {/* EVENT CONTENT */}
            {displayedEvent && (
                <div className="relative z-10 flex h-full min-h-0 flex-col border-event"
                    style={{ borderWidth: "clamp(2px, 0.21vw, 8px)" }}>

                    {/* TOP BANNER */}
                    <div className="shrink-0 bg-[#29251C] border-b-2 border-event text-center"
                        style={{ padding: "clamp(8px, min(0.83vw, 1.48vh), 32px) clamp(12px, 1.25vw, 48px)" }}>
                        <span className="font-pixel tracking-widest text-event"
                            style={{ fontSize: "clamp(9px, min(0.73vw, 1.3vh), 28px)" }}>
                            ◆ DRAFT EVENT ◆
                        </span>
                    </div>

                    {/* EVENT NAME */}
                    <div className="flex min-h-0 shrink flex-col items-center justify-center text-center"
                        style={{ gap: "clamp(8px, 1.04vw, 40px)", padding: "clamp(12px, min(2vw, 2.2vh), 80px) clamp(12px, 1.67vw, 64px)" }}>

                        <h2
                            className="font-pixel font-bold text-white leading-tight uppercase break-words max-w-full"
                            style={{
                                textShadow:
                                    "4px 4px 0 #B8960F",
                                WebkitTextStroke:
                                    "1px #F5C518",
                            }}
                        >
                            {displayedEvent.title}
                        </h2>

                        <div className="bg-event" style={{ width: "clamp(64px, 6.67vw, 256px)", height: "clamp(2px, 0.21vw, 8px)" }} />

                        <span className="font-pixel text-event tracking-widest"
                            style={{ fontSize: "clamp(8px, min(0.625vw, 1.11vh), 24px)" }}>
                            RULE MODIFIER
                        </span>
                    </div>

                    {/* EVENT DESCRIPTION */}
                    <div className="min-h-0 flex-1 overflow-y-auto bg-[#24212A] border-event text-center flex flex-col justify-center"
                        style={{ marginInline: "clamp(12px, 1.25vw, 48px)", borderLeftWidth: "clamp(3px, 0.21vw, 8px)", padding: "clamp(12px, min(1.67vw, 2.96vh), 64px)" }}>
                        <p className="font-pixel text-event tracking-wider"
                            style={{ fontSize: "clamp(8px, min(0.625vw, 1.11vh), 24px)", marginBottom: "clamp(8px, 0.83vw, 32px)" }}>
                            EVENT EFFECT
                        </p>

                        <p className="font-mono font-bold text-white leading-relaxed break-words"
                            style={{ fontSize: "clamp(14px, min(1.25vw, 2.22vh), 48px)" }}>
                            {displayedEvent.desc}
                        </p>
                    </div>

                    {/* CONFIRM */}
                    <div className="shrink-0"
                        style={{ padding: "clamp(10px, min(1.25vw, 2.22vh), 48px)" }}>
                        {wipeState === "visible" ? (
                            <button
                                onClick={handleAcknowledge}
                                className="w-full bg-event font-pixel font-bold text-[#0F0F1A] tracking-widest hover:bg-[#FFDA4D] transition-colors"
                                style={{ padding: "clamp(12px, min(1.04vw, 1.85vh), 40px) clamp(12px, 1.67vw, 64px)", fontSize: "clamp(12px, min(0.94vw, 1.67vh), 36px)" }}
                            >
                                ACKNOWLEDGE →
                            </button>
                        ) : (
                            <div style={{ height: "clamp(44px, min(4.5vw, 6.3vh), 140px)" }} />
                        )}
                    </div>
                </div>
            )}

            {/* EXISTING DITHER WIPE */}
            {(wipeState === "entering" ||
                wipeState === "leaving") && (
                    <div
                        className={`absolute inset-0 z-20 overflow-visible ${wipeState === "entering"
                                ? "dither-wipe-in"
                                : "dither-wipe-out"
                            }`}
                    >
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor: "#F5C518",
                            }}
                        />

                        <div
                            style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                width: "clamp(60px, 5.83vw, 224px)",

                                right:
                                    wipeState === "entering"
                                        ? "calc(-1 * clamp(60px, 5.83vw, 224px))"
                                        : "auto",

                                left:
                                    wipeState === "leaving"
                                        ? "calc(-1 * clamp(60px, 5.83vw, 224px))"
                                        : "auto",

                                backgroundImage: `
                linear-gradient(45deg, #F5C518 25%, transparent 25%),
                linear-gradient(-45deg, #F5C518 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #F5C518 75%),
                linear-gradient(-45deg, transparent 75%, #F5C518 75%)
              `,

                                backgroundSize: "clamp(10px, 0.83vw, 32px) clamp(10px, 0.83vw, 32px)",
                                backgroundPosition:
                                    "0 0, 0 50%, 50% -50%, -50% 0",
                            }}
                        />
                    </div>
                )}
        </div>
    );
}
