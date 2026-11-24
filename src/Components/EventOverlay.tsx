import { useEffect, useState } from "react";
import type { GameEvent } from "../types";
import { ArrowIcon } from "./Icons";
import { Wipe } from "../Components/Wipe";

type WipeState = "idle" | "entering" | "visible" | "leaving";

interface EventOverlayProps {
  event: GameEvent | null;
  onAcknowledge: () => void;
}

export function EventOverlay({ event, onAcknowledge }: EventOverlayProps) {
  const [wipeState, setWipeState] = useState<WipeState>("idle");

  const [displayedEvent, setDisplayedEvent] = useState<GameEvent | null>(null);

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

    setTimeout(() => setDisplayedEvent(null), 385);

    setTimeout(() => {
      setWipeState("idle");
      onAcknowledge();
    }, 1100);
  };

  if (wipeState === "idle" && !displayedEvent) {
    return null;
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${displayedEvent ? "bg-ink" : ""}`}
      style={{ height: "clamp(360px, 55.56vh, 1200px)" }}
    >
      {/* EVENT CONTENT */}
      {displayedEvent && (
        <div
          className="relative z-10 flex h-full min-h-0 flex-col border-event"
          style={{ borderWidth: "clamp(2px, 0.21vw, 8px)" }}
        >
          {/* TOP BANNER */}
          <div
            className="shrink-0 border-b-2 border-event bg-event-plate text-center"
            style={{
              padding: "clamp(10px, min(1vw, 1.8vh), 36px) clamp(12px, 1.25vw, 48px)",
            }}
          >
            <span
              className="text-trim font-pixel tracking-widest text-event"
              style={{ fontSize: "clamp(11px, min(0.95vw, 1.7vh), 32px)" }}
            >
              ◆ DRAFT EVENT ◆
            </span>
          </div>

          {/* EVENT NAME */}
          <div
            className="flex min-h-0 shrink-0 flex-col items-center justify-center text-center"
            style={{
              gap: "clamp(12px, 1.3vw, 48px)",
              padding: "clamp(24px, min(3.2vw, 4.5vh), 120px) clamp(12px, 1.67vw, 64px)",
            }}
          >
            <h2
              className="text-trim font-pixel font-bold text-white leading-tight uppercase tracking-tighter break-words max-w-full"
              style={{ fontSize: "clamp(28px, min(4.2vw, 7.5vh), 120px)" }}
            >
              {displayedEvent.title}
            </h2>

            <div
              className="bg-event"
              style={{
                width: "clamp(64px, 6.67vw, 256px)",
                height: "clamp(3px, 0.28vw, 10px)",
              }}
            />

            <span
              className="text-trim font-pixel tracking-widest text-event"
              style={{ fontSize: "clamp(11px, min(0.95vw, 1.7vh), 32px)" }}
            >
              RULE MODIFIER
            </span>
          </div>

          {/* EVENT DESCRIPTION */}
          <div
            className="flex min-h-0 flex-1 flex-col items-center justify-center border-2 border-event/60 bg-[#24212A] text-center"
            style={{
              marginInline: "clamp(12px, 1.25vw, 48px)",
              gap: "clamp(8px, 0.9vw, 32px)",
              padding: "clamp(14px, min(1.5vw, 2.6vh), 56px)",
            }}
          >
            <p
              className="text-trim font-sans font-bold text-white leading-relaxed break-words"
              style={{ fontSize: "clamp(15px, min(1.4vw, 2.5vh), 52px)" }}
            >
              {displayedEvent.desc}
            </p>
          </div>

          {/* CONFIRM */}
          <div
            className="shrink-0"
            style={{ padding: "clamp(12px, min(1.25vw, 2.22vh), 48px)" }}
          >
            {wipeState === "visible" ? (
              <button
                onClick={handleAcknowledge}
                className="text-trim flex w-full items-center justify-center gap-[0.6em] bg-event font-pixel font-bold tracking-widest text-[#0F0F1A] transition-colors hover:bg-event-hover"
                style={{
                  padding: "clamp(14px, min(1.2vw, 2.1vh), 44px) clamp(12px, 1.67vw, 64px)",
                  fontSize: "clamp(14px, min(1.1vw, 2vh), 40px)",
                }}
              >
                GOT IT <ArrowIcon />
              </button>
            ) : (
              <div style={{ height: "clamp(48px, min(4.5vw, 6.3vh), 140px)" }} />
            )}
          </div>
        </div>
      )}
      {/* ENTRANCE ANIMATION */}
      {(wipeState === "entering" || wipeState === "leaving") && (
        <Wipe
          key={wipeState}
          tone="text-event"
          duration={1100}
          reverse={wipeState === "leaving"}
          label={wipeState === "entering" ? "◆ DRAFT EVENT ◆" : undefined}
        />
      )}
    </div>
  );
}