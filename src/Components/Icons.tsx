// Every icon in the app lives here. Sized in em so it scales with the text it sits in;
// pass className to override the size.

interface IconProps {
  className?: string;
}

const LINE = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PIXEL = {
  fill: "currentColor",
  shapeRendering: "crispEdges" as const,
  "aria-hidden": true,
};

export function ArrowIcon({ className = "h-[1em] w-[1.2em]" }: IconProps) {
  return (
    <svg viewBox="0 0 12 10" className={className} {...PIXEL}>
      <path d="M0 4h8V2h2v2h2v2h-2v2H8V6H0z" />
    </svg>
  );
}

export function CloseIcon({ className = "h-[1em] w-[1em]" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function PolarityIcon({
  positive,
  className = "h-[1em] w-[1em]",
}: IconProps & { positive: boolean }) {
  return (
    <svg className={className} {...LINE} stroke-width={3.5}>
      <path d="M5 12h14" />
      {positive && <path d="M12 5v14" />}
    </svg>
  );
}

export function WarningIcon({
  className = "inline-block h-[1.1em] w-[1.1em] align-[-0.15em]",
}: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function InfoIcon({ className = "h-[1.3em] w-[1.3em] shrink-0" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

export function HourglassIcon({ className = "h-[1.3em] w-[1.3em]" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}

export function PlayIcon({ className = "h-[1em] w-[1em]" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </svg>
  );
}

export function PauseIcon({ className = "h-[1em] w-[1em]" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <rect x="14" y="3" width="5" height="18" rx="1" />
      <rect x="5" y="3" width="5" height="18" rx="1" />
    </svg>
  );
}

export function RewindIcon({ className = "h-[1em] w-[1em]" }: IconProps) {
  return (
    <svg className={className} {...LINE}>
      <path d="M12 6a2 2 0 0 0-3.414-1.414l-6 6a2 2 0 0 0 0 2.828l6 6A2 2 0 0 0 12 18z" />
      <path d="M22 6a2 2 0 0 0-3.414-1.414l-6 6a2 2 0 0 0 0 2.828l6 6A2 2 0 0 0 22 18z" />
    </svg>
  );
}