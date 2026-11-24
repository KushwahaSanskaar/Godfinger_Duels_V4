import type { PlayerId } from "../types";
import type { TimelineNode, TimelineNodeStatus } from "../Logic/timeline";
import { NODE_ICON, DiamondIcon } from "./TimelineIcons";

const STATUS_STYLE: Record<TimelineNodeStatus, string> = {
  done: "text-event",
  current: "text-event scale-110",
  upcoming: "text-text-muted",
  unreached: "text-text-muted opacity-30",
};

const WINNER_STYLE = {
  p1: "text-p1",
  p2: "text-p2",
};

const TURN_COLOR: Record<PlayerId, string> = {
  p1: "text-p1",
  p2: "text-p2",
};

function styleFor(node: TimelineNode): string {
  if (node.status === "done" && node.winner) return WINNER_STYLE[node.winner];
  return STATUS_STYLE[node.status];
}

function Connector({ lit }: { lit: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mx-1.5 h-0.5 w-12 ${lit ? "bg-event" : "bg-text-muted/40"
        }`}
    />
  );
}

function TurnDot({
  player,
  status,
}: {
  player: PlayerId;
  status: TimelineNodeStatus;
}) {
  const size = status === "current" ? "scale-125" : "";
  return (
    <span
      className={`flex transition-transform duration-200 ${TURN_COLOR[player]} ${size}`}
    >
      <DiamondIcon filled={status !== "upcoming"} />
    </span>
  );
}

function NodeBox({ node }: { node: TimelineNode }) {
  const icon = NODE_ICON[node.kind];
  return (
    <span
      title={node.label}
      className={`relative flex items-center justify-center transition-transform duration-200 ${styleFor(node)}`}
    >
      {icon ?? node.label}
      {node.replay && (
        <span className="absolute -top-2 -right-2 text-[10px]">↻</span>
      )}
    </span>
  );
}

export function Timeline({ nodes }: { nodes: TimelineNode[] }) {
  return (
    <ol className="flex flex-wrap items-center justify-center gap-y-3 font-pixel text-[14px]">
      {nodes.map((node, index) => (
        <li key={node.id} className="flex items-center">
          {index > 0 && (
            <Connector lit={node.status === "done" || node.status === "current"} />
          )}
          {node.kind === "turn" && node.player ? (
            <TurnDot player={node.player} status={node.status} />
          ) : (
            <NodeBox node={node} />
          )}
        </li>
      ))}
    </ol>
  );
}