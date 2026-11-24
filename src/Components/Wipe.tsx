import type { CSSProperties } from "react";

interface WipeProps {
  tone: string; // text colour class; the slab and its edges use currentColor
  duration: number; // ms, covers + holds + clears; the swap underneath happens while covered (14%-80%)
  reverse?: boolean; // travel right to left
  label?: string; // stamped on the slab while it holds
}

// Ordered-dither fade: 50% checker against the slab, 25% further out.
const DITHER_50 = "repeating-conic-gradient(currentColor 0 25%, transparent 0 50%)";
const DITHER_25 = "repeating-conic-gradient(currentColor 0 25%, transparent 0 100%)";
const CELL = "clamp(3px, 1.6cqh, 9px)"; // one dither pixel

export function Wipe({ tone, duration, reverse = false, label }: WipeProps) {
  const impact = Math.round(duration * 0.14);
  const mirror = reverse ? "scaleX(-1)" : undefined;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-20 ${tone}`}
      style={
        { containerType: "size", transform: mirror, "--wipe-ms": `${duration}ms` } as CSSProperties
      }
    >
      <div className="wipe-slab absolute inset-0 bg-current">
        <div className="absolute inset-0 overflow-hidden">
          <div className="wipe-stripes absolute inset-y-0 -left-6 right-0" />
        </div>
        <div className="wipe-flash absolute inset-0 bg-bright" />

        {/* trailing dither */}
        <div
          className="absolute inset-y-0 right-full flex"
          style={{ width: "clamp(24px, 12cqw, 110px)" }}
        >
          {[DITHER_25, DITHER_50].map((image) => (
            <div
              key={image}
              className="h-full flex-1"
              style={{ backgroundImage: image, backgroundSize: `calc(${CELL} * 2) calc(${CELL} * 2)` }}
            />
          ))}
        </div>
        {/* leading blade */}
        <div
          className="absolute inset-y-0 left-full bg-bright"
          style={{ width: "clamp(2px, 0.8cqw, 6px)" }}
        />

        {label && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: mirror }}
          >
            <span
              className="text-trim whitespace-nowrap font-pixel font-bold tracking-widest text-ink"
              style={{ fontSize: "clamp(18px, min(4cqw, 14cqh), 96px)" }}
            >
              {Array.from(label).map((ch, i) => (
                <span
                  key={i}
                  className="wipe-letter inline-block"
                  style={{ animationDelay: `${impact + 40 + i * 24}ms` }}
                >
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}