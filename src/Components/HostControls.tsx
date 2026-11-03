import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampToViewport, movedEnough } from "../Logic/dragMath";

// Host tempo controls: step back one action, pause/play. The whole bar can be
// dragged anywhere on screen (even by its buttons - a click still clicks, only a
// real drag moves it). Its position is remembered; double-click the label to
// put it back at top-centre.
const STORAGE_KEY = "godfinger-host-controls-pos";
const MARGIN = 8;

type Pos = { x: number; y: number };

function loadPos(): Pos | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.x === "number" && typeof p?.y === "number" ? { x: p.x, y: p.y } : null;
  } catch {
    return null; // storage unavailable (private mode etc.): just don't remember
  }
}
function savePos(p: Pos | null) {
  try {
    if (p) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-5 fill-current text-[#66667D]" aria-hidden="true">
      <circle cx="9" cy="6" r="1.7" />
      <circle cx="15" cy="6" r="1.7" />
      <circle cx="9" cy="12" r="1.7" />
      <circle cx="15" cy="12" r="1.7" />
      <circle cx="9" cy="18" r="1.7" />
      <circle cx="15" cy="18" r="1.7" />
    </svg>
  );
}

const ICON = "w-5 h-5 fill-current";

function RewindIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path d="M11 6v12L2.5 12 11 6zm10 0v12l-8.5-6L21 6z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className={ICON} aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
    </svg>
  );
}

export function HostControls({
  paused,
  canRewind,
  steps,
  onRewind,
  onTogglePause,
}: {
  paused: boolean;
  canRewind: boolean;
  steps: number;
  onRewind: () => void;
  onTogglePause: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(loadPos); // null = default top-centre
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    active: boolean;
  } | null>(null);
  const lastPos = useRef<Pos | null>(pos);
  const justDragged = useRef(false);

  const clamp = (x: number, y: number): Pos => {
    const r = barRef.current?.getBoundingClientRect();
    return clampToViewport(
      { x, y },
      { w: r?.width ?? 0, h: r?.height ?? 0 },
      { w: window.innerWidth, h: window.innerHeight },
      MARGIN,
    );
  };

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const r = barRef.current?.getBoundingClientRect();
    if (!r) return;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: r.left,
      originY: r.top,
      active: false,
    };
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (!movedEnough(dx, dy)) return; // still just a click
      d.active = true;
      setDragging(true);
      // from here on every move/up goes to the bar, even if the pointer outruns it
      barRef.current?.setPointerCapture(e.pointerId);
    }
    const next = clamp(d.originX + dx, d.originY + dy);
    lastPos.current = next;
    setPos(next);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (!d.active) return;
    setDragging(false);
    savePos(lastPos.current);
    // the click that follows a drag must not press a button
    justDragged.current = true;
    window.setTimeout(() => {
      justDragged.current = false;
    }, 0);
  }

  // Window resized: pull the bar back on-screen if it ended up outside.
  useEffect(() => {
    function onResize() {
      if (!lastPos.current) return;
      const next = clamp(lastPos.current.x, lastPos.current.y);
      lastPos.current = next;
      setPos(next);
    }
    onResize(); // a position saved on a bigger screen may not fit this one
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPosition() {
    lastPos.current = null;
    setPos(null);
    savePos(null);
  }

  const button =
    "w-10 h-10 flex items-center justify-center border-2 border-[#353548] bg-[#1D1D2C] text-text-primary hover:bg-[#2A2A3E]";
  const placement = pos
    ? { left: pos.x, top: pos.y }
    : undefined; // default: top-centre, positioned by the classes below
  return (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={(e) => {
        if (justDragged.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      style={{ ...placement, touchAction: "none" }}
      title="Drag to move"
      className={`fixed z-50 flex items-center gap-3 bg-[#141420]/95 border-2 border-[#353548] pl-2 pr-3 py-2 select-none ${
        pos ? "" : "top-3 left-1/2 -translate-x-1/2"
      } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <GripIcon />
      <button
        onClick={onRewind}
        disabled={!canRewind}
        title="Rewind one step"
        aria-label="Rewind one step"
        className={`${button} ${canRewind ? "" : "opacity-30 cursor-not-allowed"}`}
      >
        <RewindIcon />
      </button>
      <div
        className="flex flex-col items-center min-w-[68px]"
        onDoubleClick={resetPosition}
        title="Double-click to put the controls back at the top"
      >
        <span className={`font-pixel text-[10px] ${paused ? "text-event" : "text-text-muted"}`}>
          {paused ? "PAUSED" : "LIVE"}
        </span>
        <span className="font-pixel text-[9px] text-[#66667D]">{Math.max(steps - 1, 0)} STEPS</span>
      </div>
      <button
        onClick={onTogglePause}
        title={paused ? "Play (Space)" : "Pause (Space)"}
        aria-label={paused ? "Play" : "Pause"}
        className={`${button} ${paused ? "bg-[#F5C518] text-[#141420] hover:bg-[#FFDA4D]" : ""}`}
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}
