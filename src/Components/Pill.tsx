import type { ReactNode } from "react";

type Tone = "neutral" | "p1" | "p2";

interface PillProps {
  children: ReactNode;
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "off white",
  p1: "cyan",
  p2: "red",
};

export function Pill({ children, tone = "neutral" }: PillProps) {
  return <span className={` ${toneClasses[tone]}`}>{children}</span>;
}
