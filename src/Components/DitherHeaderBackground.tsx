import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  isBan: boolean;
  eventActive?: boolean;
}

const BASE_PIXEL_SIZE = 7;
const BASE_WIDTH = 1920;
const BASE_HEIGHT = 96;
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export function DitherHeaderBackground({ isBan, eventActive = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 80 });

  const baseColor = eventActive ? "#B8860B" : "#E63946";
  const ditherColor = eventActive ? "#F5C518" : "#3A8EF6";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.ceil(entry.contentRect.width);
      const height = Math.ceil(entry.contentRect.height);
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height }
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    const pixelSize = Math.max(
      4,
      Math.min(28, Math.round(BASE_PIXEL_SIZE * Math.max(
        width / BASE_WIDTH,
        height / BASE_HEIGHT
      )))
    );
    const canvasWidth = width * 2;
    canvas.width = canvasWidth;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, height);
    ctx.fillStyle = ditherColor;

    const cols = Math.ceil(canvasWidth / pixelSize);
    const rows = Math.ceil(height / pixelSize);
    for (let row = 0; row < rows; row++) {
      const y = row * pixelSize;
      const diagonalX = width * (0.10 + 0.02 * ((y + pixelSize / 2) / height));
      const solidStart = Math.max(0, Math.ceil(diagonalX / pixelSize + 3));
      ctx.fillRect(solidStart * pixelSize, y, canvasWidth - solidStart * pixelSize, pixelSize);

      const firstCol = Math.max(0, Math.floor(diagonalX / pixelSize - 3));
      for (let col = firstCol; col < Math.min(cols, solidStart); col++) {
        const distance = (col * pixelSize - diagonalX) / pixelSize;
        const coverage = Math.max(0, Math.min(1, (distance + 3) / 6));
        const threshold = (BAYER[row % 4][col % 4] + 0.5) / 16;
        if (coverage > threshold) {
          ctx.fillRect(col * pixelSize, y, pixelSize + 1, pixelSize + 1);
        }
      }
    }
  }, [size, ditherColor]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ backgroundColor: baseColor }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute left-0 top-0 max-w-none pointer-events-none"
        style={{
          width: size.width * 2,
          height: size.height,
          transform: `translate3d(${isBan ? size.width * 0.78 : 0}px, 0, 0)`,
          transition: "transform 450ms steps(14, end)",
        }}
      />
    </div>
  );
}
