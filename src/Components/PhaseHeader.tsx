import { useEffect, useState, useRef } from "react";

interface PhaseHeaderProps {
    phase: "ban" | "draft";
}

export function PhaseHeader({ phase }: PhaseHeaderProps) {
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
    }, [phase]);

    const isBanDisplay = displayedPhase === "ban";

    return (
        <div className="relative w-full h-20 overflow-hidden flex items-center justify-center">
            {/* Base layer — always p2 red */}
            <div className="absolute inset-0 bg-p2" />
            {/* Sliding layer — p1 blue, moves right to left */}
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "100%",
                    left: 0,
                    backgroundColor: "#3A8EF6",
                    clipPath: isBan
                        ? "polygon(88% 0%, 100% 0%, 100% 100%, 90% 100%)"
                        : "polygon(10% 0%, 100% 0%, 100% 100%, 12% 100%)",
                    transition: "clip-path 100ms ease",
                }}
            />

            {/* Text */}
            <span
                ref={spanRef}
                className={`relative z-10 text-white text-7xl tracking-widest font-pixel font-bold leading-none`}
                style={{
                    transform: "translateY(-5px)",
                    textShadow: isBanDisplay
                        ? "0.3rem 0 0 #972934, 0 0.3rem 0 #972934, 0.3rem 0.3rem 0 #972934"
                        : "0.3rem 0 0 #1748A1, 0 0.3rem 0 #1748A1, 0.3rem 0.3rem 0 #1748A1",
                    WebkitTextStroke: isBanDisplay ? "2px #FF6C77" : "2px #77B2FF",
                }}>
                {isBanDisplay ? "BANNING" : "PICKING"}
            </span>
        </div>
    );
}