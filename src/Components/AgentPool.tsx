import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CLASS_GROUPS } from "../Data/modes";
import { AgentCard } from "../Components/AgentCard";
import type { Agent } from "../types";

const BASE_SIZE = 112;
const MAX_ROWS = 6;
const GROUP_GAP = 8;
const CARD_GAP = 6;
const FRAME_PADDING = 6;
const STATUS_COLOR: Record<string, string> = {
  READY: "#F5C518",
  AVAILABLE: "#B8ABC9",
  BANNED: "#FF6C77",
  LOCKED: "#8B759F",
};
const LOCKED_TEXTURE =
  "repeating-linear-gradient(135deg, transparent 0 8px, rgba(255,108,119,0.12) 8px 10px)";

type Selection =
  | "none"
  | "p1"
  | "p2"
  | "mirror"
  | "selected-p1"
  | "selected-p2";

interface AgentPoolProps {
  agents: Agent[];
  cardSize?: number;
  showHeaders?: boolean;
  flat?: boolean;
  banned: string[];
  showBanOverlay: boolean;
  unavailableGroups?: string[];
  selection?: (agent: Agent) => Selection;
  unavailable?: (agent: Agent) => boolean;
  onClick: (agent: Agent) => void;
  onConfirm?: (agent: Agent) => void;
  confirmLabel?: string;
}

export function AgentPool({
  agents,
  cardSize,
  showHeaders = true,
  flat = false,
  banned,
  showBanOverlay,
  unavailableGroups = [],
  selection,
  unavailable: unavailableFn,
  onClick,
  onConfirm,
  confirmLabel,
}: AgentPoolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [spaceBelowTop, setSpaceBelowTop] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight - 260 : 720,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      CLASS_GROUPS.map((group) => ({
        ...group,
        agents: agents.filter((a) => group.specialties.includes(a.specialty)),
        parts: group.label.split("/").map((part) => part.trim().toUpperCase()),
      })),
    [agents],
  );

  useLayoutEffect(() => {
    if (flat) return;
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      setAvailableWidth(node.clientWidth);
      setSpaceBelowTop(
        Math.max(
          250,
          window.innerHeight - node.getBoundingClientRect().top - 20,
        ),
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [flat]);

  // Column sizing math
  const divisionColumns =
    availableWidth >= 1000
      ? 5
      : availableWidth >= 680
        ? 3
        : availableWidth >= 420
          ? 2
          : 1;
  const wideLayout = divisionColumns === 5;
  const groupCardColumns = groups.map((g) =>
    Math.max(1, Math.ceil(g.agents.length / MAX_ROWS)),
  );
  const totalCardColumns = groupCardColumns.reduce((sum, n) => sum + n, 0);
  const maxCount = Math.max(1, ...groups.map((g) => g.agents.length));
  const desiredAgentColumns = Math.max(1, Math.ceil(maxCount / MAX_ROWS));

  const byWidth = wideLayout
    ? Math.floor(
      (availableWidth -
        (groups.length - 1) * GROUP_GAP -
        groups.length * (FRAME_PADDING * 2 + 4) -
        (totalCardColumns - groups.length) * CARD_GAP) /
      totalCardColumns,
    )
    : Math.floor(
      ((availableWidth - (divisionColumns - 1) * GROUP_GAP) /
        divisionColumns -
        FRAME_PADDING * 2 -
        4 -
        (desiredAgentColumns - 1) * CARD_GAP) /
      desiredAgentColumns,
    );

  const divisionRows = Math.ceil(groups.length / divisionColumns);
  // The preview grows when card rows leave extra vertical space available.
  const headerHeight = wideLayout
    ? Math.max(72, Math.min(110, Math.floor(spaceBelowTop * 0.135)))
    : 80;
  const verticalChrome = headerHeight + divisionRows * (61 + GROUP_GAP);
  const heightForCards = Math.max(0, spaceBelowTop - verticalChrome);
  const byHeight = Math.floor(
    heightForCards / (MAX_ROWS * divisionRows) - CARD_GAP,
  );
  const actualSize =
    cardSize ??
    Math.max(42, Math.min(360, byWidth, wideLayout ? byHeight : 360));
  const previewSize = wideLayout
    ? Math.max(52, Math.min(118, headerHeight - 22))
    : 52;

  // One label size for every section: the longest word has to fit the narrowest section.
  const narrowestSection = Math.min(
    ...groupCardColumns.map((n) => n * actualSize + (n - 1) * CARD_GAP),
  );
  const longestWord = Math.max(...groups.flatMap((g) => g.parts.map((p) => p.length)));
  const labelSize = Math.max(
    9,
    Math.min(16, Math.floor(narrowestSection / (longestWord * 0.9))),
  );
  const labelLines = Math.max(...groups.map((g) => g.parts.length));

  const selectedAgent = agents.find((a) =>
    selection?.(a).startsWith("selected"),
  );
  const highlightedAgent =
    selectedAgent ?? agents.find((a) => a.id === hoveredId) ?? null;
  const highlightedSelection = highlightedAgent
    ? (selection?.(highlightedAgent) ?? "none")
    : "none";
  const highlightedBanned = highlightedAgent
    ? banned.includes(highlightedAgent.id)
    : false;
  const highlightedLocked = highlightedAgent
    ? unavailableGroups.some((label) =>
      groups
        .find((g) => g.label === label)
        ?.agents.some((a) => a.id === highlightedAgent.id),
    ) ||
    (!showBanOverlay && highlightedBanned) ||
    !!unavailableFn?.(highlightedAgent)
    : false;
  const status = highlightedAgent
    ? highlightedBanned
      ? "BANNED"
      : highlightedLocked
        ? "LOCKED"
        : highlightedSelection.startsWith("selected")
          ? "READY"
          : "AVAILABLE"
    : `${agents.length} AGENTS`;
  const statusColor = STATUS_COLOR[status] ?? "#8B759F";

  const renderAgent = (a: Agent, groupLocked: boolean) => {
    const isBanned = banned.includes(a.id);
    const state = selection?.(a) ?? "none";
    return (
      <div
        key={a.id}
        onMouseEnter={() => setHoveredId(a.id)}
        onFocus={() => setHoveredId(a.id)}
      >
        <AgentCard
          agent={a}
          banned={showBanOverlay && isBanned}
          unavailable={
            groupLocked || (!showBanOverlay && isBanned) || !!unavailableFn?.(a)
          }
          selection={state}
          onClick={() => onClick(a)}
          onConfirm={
            state.startsWith("selected") && onConfirm
              ? () => onConfirm(a)
              : undefined
          }
          confirmLabel={confirmLabel}
          size={actualSize}
        />
      </div>
    );
  };

  // Reduced detail mode available to other phases with identical behavior.
  if (flat) {
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {agents.map((a) => {
          const isBanned = banned.includes(a.id);
          return (
            <AgentCard
              key={a.id}
              agent={a}
              size={cardSize ?? BASE_SIZE}
              banned={showBanOverlay && isBanned}
              unavailable={
                (!showBanOverlay && isBanned) || !!unavailableFn?.(a)
              }
              selection={selection?.(a) ?? "none"}
              onClick={() => onClick(a)}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="responsive-agent-pool w-full min-w-0 mx-auto max-w-[calc(100%-1.5rem)] select-none"
      style={{ color: "#EEEAF5" }}
    >
      <div
        className="relative flex min-w-0 items-stretch gap-[clamp(8px,.8vw,22px)] overflow-hidden border-b-4 bg-plate pr-[clamp(24px,1.5vw,64px)]"
        style={{
          minHeight: wideLayout ? headerHeight : undefined,
          borderColor: status === "READY" ? "#F5C518" : "#7962A1",
          backgroundImage:
            "linear-gradient(90deg, #1A1728 30%, transparent 75%), repeating-linear-gradient(135deg, transparent 0 10px, rgba(121,98,161,0.14) 10px 12px)",
        }}
      >
        <div
          className="relative hidden shrink-0 overflow-hidden bg-chip sm:block"
          style={{
            width: previewSize + 24,
            clipPath: "polygon(0% 0%, 100% 0%, 88% 100%, 0% 100%)",
          }}
        >
          {highlightedAgent ? (
            <img
              src={`/agents/agents_full/${highlightedAgent.id}_full.webp`}
              alt={highlightedAgent.name}
              className="absolute inset-0 h-full w-full object-cover object-top"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `/agents/${highlightedAgent.id}.webp`;
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-pixel text-lavender">
              ?
            </div>
          )}
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-[clamp(3px,.3vw,8px)] py-[clamp(5px,.4vw,12px)]">
          <div
            className="text-trim font-pixel text-lavender"
            style={{ fontSize: "clamp(8px,.5vw,14px)" }}
          >
            AGENT SELECT
          </div>
          <div
            className="text-trim truncate font-pixel text-white"
            style={{ fontSize: "clamp(13px,1.2vw,32px)" }}
          >
            {highlightedAgent?.name.toUpperCase() ?? "SELECT AN AGENT"}
          </div>
          <div className="flex min-w-0 gap-[clamp(4px,.3vw,8px)]">
            {highlightedAgent ? (
              [highlightedAgent.specialty, highlightedAgent.faction].map(
                (label) => (
                  <span
                    key={label}
                    className="text-trim truncate border border-chrome bg-chip px-[clamp(5px,.4vw,12px)] py-[clamp(3px,.25vw,7px)] font-sans font-bold text-lavender-light"
                    style={{ fontSize: "clamp(10px,.65vw,18px)" }}
                  >
                    {label.toUpperCase()}
                  </span>
                ),
              )
            ) : (
              <span
                className="text-trim font-sans font-bold text-lavender"
                style={{ fontSize: "clamp(10px,.65vw,18px)" }}
              >
                HOVER TO INSPECT
              </span>
            )}
          </div>
        </div>
        <div
          className="text-trim relative shrink-0 self-center border-2 px-[clamp(8px,.7vw,20px)] py-[clamp(5px,.4vw,11px)] font-pixel"
          style={{
            color: statusColor,
            borderColor: statusColor,
            backgroundColor: statusColor + "1A",
            fontSize: "clamp(10px,.7vw,20px)",
          }}
        >
          {status}
        </div>
      </div>

      <div
        className="grid items-stretch"
        style={{
          gridTemplateColumns: wideLayout
            ? groupCardColumns.map((n) => `${n}fr`).join(" ")
            : `repeat(${divisionColumns}, minmax(0, 1fr))`,
          gap: GROUP_GAP,
          marginTop: GROUP_GAP,
        }}
      >
        {groups.map((group, index) => {
          const groupLocked = unavailableGroups.includes(group.label);
          const columns = groupCardColumns[index];
          return (
            <section
              key={group.label}
              className="flex min-w-0 flex-col border-2 border-chrome bg-plate"
            >
              {showHeaders && (
                <div
                  className={`flex items-center justify-center border-b-2 px-1 text-center ${
                    groupLocked
                      ? "border-p2-alt2/60 bg-ink"
                      : "border-chrome-strong bg-chrome-fill"
                  }`}
                  style={{
                    fontSize: labelSize,
                    height: `calc(${labelLines}em + ${(labelLines - 1) * 0.4}em + 1.4em)`,
                    backgroundImage: groupLocked ? LOCKED_TEXTURE : undefined,
                  }}
                >
                  <span
                    className={`flex flex-col items-center gap-[0.4em] font-pixel font-bold leading-none ${
                      groupLocked ? "text-lavender" : "text-white"
                    }`}
                  >
                    {group.parts.map((part) => (
                      <span key={part} className="text-trim whitespace-nowrap">
                        {part}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              <div className="flex-1" style={{ padding: FRAME_PADDING }}>
                <div
                  className="grid justify-center"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, ${actualSize}px)`,
                    gap: CARD_GAP,
                  }}
                >
                  {group.agents.map((a) => renderAgent(a, groupLocked))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}