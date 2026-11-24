import type { ReactNode } from "react";
import type { TimelineNodeKind } from "../Logic/timeline";

function Icon({
    children,
    className = "",
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={`w-6 h-6 ${className}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {children}
        </svg>
    );
}

export function DiamondIcon({ filled }: { filled: boolean }) {
    return (
        <Icon className={filled ? "fill-current" : ""}>
            <path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z" />
        </Icon>
    );
}

const BanIcon = (
    <Icon>
        <circle cx="12" cy="12" r="10" />
        <path d="M4.929 4.929 19.07 19.071" />
    </Icon>
);

const DiceIcon = (
    <Icon>
        <rect width="12" height="12" x="2" y="10" rx="2" ry="2" />
        <path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" />
        <path d="M6 18h.01" />
        <path d="M10 14h.01" />
        <path d="M15 6h.01" />
        <path d="M18 9h.01" />
    </Icon>
);

const ScaleIcon = (
    <Icon>
        <path d="M12 3v18" />
        <path d="m19 8 3 8a5 5 0 0 1-6 0zV7" />
        <path d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1" />
        <path d="m5 8 3 8a5 5 0 0 1-6 0zV7" />
        <path d="M7 21h10" />
    </Icon>
);

const SwordsIcon = (
    <Icon>
        <path d="m13 19 6-6" />
        <path d="M14.5 17.5 3.586 6.586A2 2 0 013 5.172V3h2.172a2 2 0 011.414.586L17.5 14.5" />
        <path d="m14.828 6.172 2.586-2.586A2 2 0 0118.828 3H21v2.172a2 2 0 01-.586 1.414l-2.586 2.586" />
        <path d="m16 16 4 4" />
        <path d="m19 21 2-2" />
        <path d="m5 14 4 4" />
        <path d="m5 21-2-2" />
        <path d="M7.5 16.5 4 20" />
    </Icon>
);

export const NODE_ICON: Partial<Record<TimelineNodeKind, ReactNode>> = {
    ban: BanIcon,
    event: DiceIcon,
    modifier: DiceIcon,
    affix: ScaleIcon,
    fight: SwordsIcon,
};