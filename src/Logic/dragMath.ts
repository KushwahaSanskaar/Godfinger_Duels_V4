// Pure helpers for dragging the host control bar around the screen.

export interface Point {
  x: number;
  y: number;
}
export interface Size {
  w: number;
  h: number;
}

// Keeps a box of `size` fully inside the viewport (with a small margin), so the
// bar can never be dragged, or left after a window resize, off-screen.
export function clampToViewport(p: Point, size: Size, viewport: Size, margin = 0): Point {
  const maxX = Math.max(margin, viewport.w - size.w - margin);
  const maxY = Math.max(margin, viewport.h - size.h - margin);
  return {
    x: Math.min(Math.max(p.x, margin), maxX),
    y: Math.min(Math.max(p.y, margin), maxY),
  };
}

// A press only becomes a drag once the pointer has travelled this far, so a
// normal click on a button still just clicks.
export const DRAG_THRESHOLD = 6;
export function movedEnough(dx: number, dy: number, threshold = DRAG_THRESHOLD): boolean {
  return Math.hypot(dx, dy) >= threshold;
}
