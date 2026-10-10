import { useEffect, useState } from "react";
import type { PlayerId } from "../types";

interface CoinTossProps {
    coinResult: "heads" | "tails" | null;
    priority: PlayerId | null;
    onToss: () => void;
    onConfirm: () => void;
    displayName: (p: PlayerId | null) => string;
}

export function CoinToss({
    coinResult,
    priority,
    onToss,
    onConfirm,
    displayName,
}: CoinTossProps) {
    const [flipping, setFlipping] = useState(false);
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (coinResult && !settled) {
            setFlipping(true);
            const targetAngle = coinResult === "tails"
                ? Math.ceil(angle / 360) * 360 + 2340 + 180     // lands on back face
                : Math.ceil(angle / 360) * 360 + 2520;          // lands on front face
            setAngle(targetAngle);
            const timer = setTimeout(() => {
                setFlipping(false);
                setSettled(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [coinResult]);

    const [angle, setAngle] = useState(0);

    const handleToss = () => {
        setSettled(false);
        onToss();
    };

    return (
        <div className="flex flex-col items-center gap-8 py-12">
            <h2
                className="font-pixel font-bold text-4xl text-white tracking-widest leading-none"
                style={{
                    textShadow: "0.3rem 0 0 #1748A1, 0 0.3rem 0 #1748A1, 0.3rem 0.3rem 0 #1748A1",
                    WebkitTextStroke: "2px #77B2FF",
                }}
            >
                COIN TOSS
            </h2>

            {/* Coin */}
            <div style={{ perspective: "600px" }}>
                <div
                    style={{
                        width: "160px",
                        height: "160px",
                        position: "relative",
                        transformStyle: "preserve-3d",
                        transform: `rotateY(${angle}deg)`,
                        transition: flipping ? "transform 2.5s cubic-bezier(0.15, 0, 0.1, 1)" : "none",
                    }}
                >
                    {/* Front face — P1 */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center border-4 border-event"
                        style={{
                            backfaceVisibility: "hidden",
                            backgroundColor: "#facd64",
                            borderRadius: "50%",
                        }}
                    >
                        <span className="font-pixel font-bold text-white text-2xl" style={{ textShadow: "2px 2px 0 #b8960f" }}>P1</span>
                        <span className="font-sand text-white text-sm mt-1 opacity-80">HEADS</span>
                    </div>

                    {/* Back face — P2 */}
                    <div
                        className="absolute inset-0 flex flex-col items-center justify-center border-4 border-event"
                        style={{
                            backfaceVisibility: "hidden",
                            backgroundColor: "#FACD64",
                            borderRadius: "50%",
                            transform: "rotateY(180deg)",
                        }}
                    >
                        <span className="font-pixel font-bold text-white text-2xl" style={{ textShadow: "2px 2px 0 #5a1520" }}>P2</span>
                        <span className="font-sand text-white text-sm mt-1 opacity-80">TAILS</span>
                    </div>
                </div>
            </div>

            {/* Result + actions */}
            {!coinResult ? (
                <button
                    onClick={handleToss}
                    className="px-12 py-3 bg-accent text-white font-pixel font-bold text-xl tracking-widest hover:opacity-80 transition-opacity"
                >
                    TOSS
                </button>
            ) : settled ? (
                <div className="flex flex-col items-center gap-4">
                    <p className="font-sand text-text-primary text-lg">
                        <span className={priority === "p1" ? "text-p1 font-bold" : "text-p2 font-bold"}>
                            {displayName(priority)}
                        </span>
                        {" "}wins the toss
                    </p>
                    <button
                        onClick={onConfirm}
                        className="px-12 py-3 bg-accent text-white font-pixel font-bold text-xl tracking-widest hover:opacity-80 transition-opacity"
                    >
                        BEGIN BAN PHASE
                    </button>
                </div>
            ) : null}
        </div>
    );
}