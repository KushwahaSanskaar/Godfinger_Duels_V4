import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CLASS_GROUPS } from "../Data/modes";
import { AgentCard } from "../Components/AgentCard";
import type { Agent } from "../types";

const BASE_SIZE = 112;
const MAX_ROWS = 6;
const GROUP_GAP = 8;
const CARD_GAP = 6;
const FRAME_PADDING = 6;

type Selection = "none" | "p1" | "p2" | "mirror" | "selected-p1" | "selected-p2";

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
  confirmColor?: string;
}

export function AgentPool({
  agents, cardSize, showHeaders = true, flat = false,
  banned, showBanOverlay, unavailableGroups = [], selection,
  unavailable: unavailableFn, onClick, onConfirm, confirmLabel, confirmColor,
}: AgentPoolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [spaceBelowTop, setSpaceBelowTop] = useState(() => typeof window !== "undefined" ? window.innerHeight - 260 : 720);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const groups = useMemo(() => CLASS_GROUPS.map(group => ({
    ...group,
    agents: agents.filter(a => group.specialties.includes(a.specialty)),
  })), [agents]);

  useLayoutEffect(() => {
    if (flat) return;
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      setAvailableWidth(node.clientWidth);
      setSpaceBelowTop(Math.max(250, window.innerHeight - node.getBoundingClientRect().top - 20));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [flat]);

  // Column sizing math
  const divisionColumns = availableWidth >= 1000 ? 5 : availableWidth >= 680 ? 3 : availableWidth >= 420 ? 2 : 1;
  const wideLayout = divisionColumns === 5;
  const groupCardColumns = groups.map(g => Math.max(1, Math.ceil(g.agents.length / MAX_ROWS)));
  const totalCardColumns = groupCardColumns.reduce((sum, n) => sum + n, 0);
  const maxCount = Math.max(1, ...groups.map(g => g.agents.length));
  const desiredAgentColumns = Math.max(1, Math.ceil(maxCount / MAX_ROWS));

  const byWidth = wideLayout
    ? Math.floor((availableWidth - (groups.length - 1) * GROUP_GAP
      - groups.length * (FRAME_PADDING * 2 + 4)
      - (totalCardColumns - groups.length) * CARD_GAP) / totalCardColumns)
    : Math.floor(((availableWidth - (divisionColumns - 1) * GROUP_GAP) / divisionColumns
      - FRAME_PADDING * 2 - 4 - (desiredAgentColumns - 1) * CARD_GAP) / desiredAgentColumns);

  const divisionRows = Math.ceil(groups.length / divisionColumns);
  // The preview grows when card rows leave extra vertical space available.
  const headerHeight = wideLayout ? Math.max(82, Math.min(148, Math.floor(spaceBelowTop * 0.15))) : 80;
  const verticalChrome = headerHeight + divisionRows * (61 + GROUP_GAP);
  const heightForCards = Math.max(0, spaceBelowTop - verticalChrome);
  const byHeight = Math.floor(heightForCards / (MAX_ROWS * divisionRows) - CARD_GAP);
  const actualSize = cardSize ?? Math.max(42, Math.min(360, byWidth, wideLayout ? byHeight : 360));
  const previewSize = wideLayout ? Math.max(52, Math.min(118, headerHeight - 22)) : 52;

  const selectedAgent = agents.find(a => selection?.(a).startsWith("selected"));
  const highlightedAgent = selectedAgent ?? agents.find(a => a.id === hoveredId) ?? null;
  const highlightedSelection = highlightedAgent ? selection?.(highlightedAgent) ?? "none" : "none";
  const highlightedBanned = highlightedAgent ? banned.includes(highlightedAgent.id) : false;
  const highlightedLocked = highlightedAgent
    ? unavailableGroups.some(label => groups.find(g => g.label === label)?.agents.some(a => a.id === highlightedAgent.id)) ||
      (!showBanOverlay && highlightedBanned) || !!unavailableFn?.(highlightedAgent)
    : false;
  const highlightColor = highlightedSelection.endsWith("p1") || highlightedSelection === "p1"
    ? "#3A8EF6" : highlightedSelection.endsWith("p2") || highlightedSelection === "p2"
      ? "#E63946" : "#F5C518";

  const renderAgent = (a: Agent, groupLocked: boolean) => {
    const isBanned = banned.includes(a.id);
    const state = selection?.(a) ?? "none";
    return (
      <div key={a.id} onMouseEnter={() => setHoveredId(a.id)} onFocus={() => setHoveredId(a.id)}>
        <AgentCard
          agent={a}
          banned={showBanOverlay && isBanned}
          unavailable={groupLocked || (!showBanOverlay && isBanned) || !!unavailableFn?.(a)}
          selection={state}
          onClick={() => onClick(a)}
          onConfirm={state.startsWith("selected") && onConfirm ? () => onConfirm(a) : undefined}
          confirmLabel={confirmLabel}
          confirmColor={confirmColor}
          size={actualSize}
        />
      </div>
    );
  };

  // Reduced detail mode available to other phases with identical behavior (currently: ScoreSubmit).
  if (flat) {
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {agents.map(a => {
          const isBanned = banned.includes(a.id);
          return <AgentCard key={a.id} agent={a} size={cardSize ?? BASE_SIZE}
            banned={showBanOverlay && isBanned}
            unavailable={(!showBanOverlay && isBanned) || !!unavailableFn?.(a)}
            selection={selection?.(a) ?? "none"} onClick={() => onClick(a)} />;
        })}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="responsive-agent-pool w-full min-w-0" style={{ color: "#EEEAF5" }}>
      {/* Fixed-position preview on the left, title on the right. */}
      <div className="flex min-w-0 items-center gap-3 border-b-4 border-[#7962A1] bg-[#1A1728] px-[clamp(8px,.8vw,22px)] py-[clamp(5px,.4vw,12px)]" style={{ minHeight: wideLayout ? headerHeight : undefined }}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative hidden shrink-0 overflow-hidden bg-[#292036] sm:block" style={{ width: previewSize, height: previewSize }}>
            {highlightedAgent ? (
              <img src={`/agents/agents_full/${highlightedAgent.id}_full.webp`} alt={highlightedAgent.name}
                className="absolute inset-0 h-full w-full object-cover object-top"
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = `/agents/${highlightedAgent.id}.webp`; }} />
            ) : <div className="flex h-full items-center justify-center font-pixel text-[#8B759F]">?</div>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-pixel text-white" style={{ fontSize: "clamp(11px,.9vw,26px)" }}>
              {highlightedAgent?.name.toUpperCase() ?? "SELECT AN AGENT"}
            </div>
            <div className="truncate font-mono font-bold text-[#B8ABC9]" style={{ fontSize: "clamp(10px,.65vw,18px)" }}>
              {highlightedAgent ? `${highlightedAgent.specialty.toUpperCase()} / ${highlightedAgent.faction.toUpperCase()}` : "HOVER TO INSPECT"}
            </div>
            <div className="truncate font-pixel md:hidden" style={{ color: highlightColor, fontSize: "clamp(9px,.6vw,16px)" }}>
              {highlightedAgent ? (highlightedBanned ? "BANNED" : highlightedLocked ? "LOCKED" : highlightedSelection.startsWith("selected") ? "READY" : "AVAILABLE") : `${agents.length} AGENTS`}
            </div>
          </div>
          <div className="hidden shrink-0 font-pixel md:block" style={{ color: highlightColor, fontSize: "clamp(10px,.65vw,18px)" }}>
            {highlightedAgent ? (highlightedBanned ? "BANNED" : highlightedLocked ? "LOCKED" : highlightedSelection.startsWith("selected") ? "READY" : "AVAILABLE") : `${agents.length} AGENTS`}
          </div>
        </div>
        <div className="shrink-0 border-l-2 border-[#463C59] pl-3 text-right">
          <div className="font-pixel text-[#E4D4FF]" style={{ fontSize: "clamp(11px,.85vw,23px)" }}>AGENT SELECT</div>
          <div className="font-mono font-bold text-[#A79BBC]" style={{ fontSize: "clamp(10px,.7vw,19px)" }}>FIVE DIVISIONS</div>
        </div>
      </div>

      <div className="grid items-start" style={{
        gridTemplateColumns: wideLayout
          ? groupCardColumns.map(n => `${n}fr`).join(" ")
          : `repeat(${divisionColumns}, minmax(0, 1fr))`,
        gap: GROUP_GAP, marginTop: GROUP_GAP,
      }}>
        {groups.map((group, index) => {
          const groupLocked = unavailableGroups.includes(group.label);
          const columns = groupCardColumns[index];
          return (
            <section key={group.label} className="min-w-0 border-2 border-[#463C59] bg-[#191624]" style={{ opacity: groupLocked ? .8 : 1 }}>
              {showHeaders && (
                <div className="relative flex min-h-[48px] items-center justify-center border-b-2 border-[#66547D] bg-[#30263D] px-1 py-1 text-center">
                  <span className="absolute left-1 top-1 font-mono font-bold text-[#CBA6F1]" style={{ fontSize: "clamp(8px,.48vw,13px)" }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 font-pixel text-white leading-tight" style={{ fontSize: group.label.toLowerCase().includes("rupture") && group.label.toLowerCase().includes("armorer") ? "clamp(8px, .53vw, 16px)" : "clamp(11px, .85vw, 25px)" }}>
                    {group.label.split("/").map((part, partIndex) => (
                      <span key={partIndex} className="block whitespace-nowrap">{part.trim().toUpperCase()}</span>
                    ))}
                  </span>
                  {groupLocked && <span className="absolute right-1 top-1 font-mono text-[#FF9099]" style={{ fontSize: "clamp(8px,.48vw,13px)" }}>LOCK</span>}
                </div>
              )}
              <div className="p-3" style={{ padding: FRAME_PADDING }}>
                <div className="grid justify-center" style={{
                  gridTemplateColumns: `repeat(${columns}, ${actualSize}px)`,
                  gap: CARD_GAP,
                }}>
                  {group.agents.map(a => renderAgent(a, groupLocked))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

    </div>
  );
}
