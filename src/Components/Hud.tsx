import { HostControls } from "./HostControls";
import { Timeline } from "./Timeline";
import type { TimelineNode } from "../Logic/timeline";
import { Panel } from "./Panel";

interface HudProps {
    paused: boolean;
    canRewind: boolean;
    steps: number;
    onRewind: () => void;
    onTogglePause: () => void;
    timeline: TimelineNode[];
}

export function Hud({ timeline, ...controls }: HudProps) {
    return (
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className={`flex ${controls.paused ? "relative z-[70]" : ""}`}>
                <HostControls {...controls} />
            </div>
            {timeline.length > 0 && (
                <Panel className="flex min-h-[64px] items-center px-4 [&>ol]:w-full">
                    <Timeline nodes={timeline} />
                </Panel>
            )}
            <div
                id="hud-status"
                className="flex items-center justify-end gap-6 text-white"
            />
        </div>
    );
}