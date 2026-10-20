import { useEffect, useState, useRef, useId } from "react";
import { DitherHeaderBackground } from "./DitherHeaderBackground";

interface PhaseHeaderProps {
    phase: "ban" | "draft";
    eventActive?: boolean;
}

export function PhaseHeader({ phase, eventActive = false }: PhaseHeaderProps) {
    const isBan = phase === "ban";
    const [displayedPhase, setDisplayedPhase] = useState(phase);

    const spanRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const el = spanRef.current;
        if (!el) return;
        el.classList.remove("glitch");
        void el.offsetWidth; // force reflow
        el.classList.add("glitch");
        const swapText = setTimeout(() => setDisplayedPhase(phase), 200);
        const finish = setTimeout(() => el.classList.remove("glitch"), 400);
        return () => { clearTimeout(swapText); clearTimeout(finish); };
    }, [phase, eventActive]);

    const isBanDisplay = displayedPhase === "ban";
    const title = eventActive
        ? "EVENT!"
        : isBanDisplay
            ? "BANNING"
            : "PICKING";

    return (
        <div className="draft-phase-header relative w-full overflow-hidden flex items-center justify-center">
            <DitherHeaderBackground isBan={isBan} eventActive={eventActive} />
            {/* Text */}
            <span
                ref={spanRef}
                className="
                    relative z-10
                    draft-phase-title tracking-widest
                    font-pixel font-bold leading-none
                    arcade-text-bounce
                    text-white"
                style={{
                    textShadow: eventActive
                        ? "0.075em 0 0 #8A6800, 0 0.075em 0 #8A6800, 0.075em 0.075em 0 #8A6800"
                        : isBanDisplay
                            ? "0.075em 0 0 #972934, 0 0.075em 0 #972934, 0.075em 0.075em 0 #972934"
                            : "0.075em 0 0 #1748A1, 0 0.075em 0 #1748A1, 0.075em 0.075em 0 #1748A1",

                    WebkitTextStroke: eventActive
                        ? "0.03125em #FFDA4D"
                        : isBanDisplay
                            ? "0.03125em #FF6C77"
                            : "0.03125em #77B2FF",
                }}
            >
                {title}
            </span>
            <div
                id="phase-header-status"
                className="absolute inset-0 z-20 flex items-center justify-between px-6 pointer-events-none"
            />
        </div>
    );
}