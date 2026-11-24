import type { Agent, ClassGroup, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { AgentPool } from "../Components/AgentPool";
import { useEffect, useState } from "react";
import { useTurnTimer } from "../Hooks/useTurnTimer";
import { TIMER_CONFIG } from "../Data/timers";
import { HudStatusPortal } from "../Components/HudStatusPortal";
import { Timer } from "../Components/Timer";

interface BanPhaseProps {
  pool: Agent[];
  classGroups: ClassGroup[];
  banned: string[];
  bannedGroups: string[];
  banIndex: number;
  banTurn: PlayerId | null;
  displayName: (p: PlayerId | null) => string;
  onBan: (agent: Agent) => void;
  onTimeout: () => void;
}

export function BanPhase({
  pool,
  classGroups,
  banned,
  bannedGroups,
  banIndex,
  banTurn,
  displayName,
  onBan,
  onTimeout,
}: BanPhaseProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  // Clear the highlighted agent every time the turn advances (banIndex changes).
  useEffect(() => {
    setSelectedAgent(null);
  }, [banIndex]);

  const timeLeft = useTurnTimer(
    TIMER_CONFIG.banSeconds,
    `ban-${banIndex}`,
    true,
    onTimeout,
  );

  return (
    <Card>
      <HudStatusPortal>
        <Timer
          timeLeft={timeLeft}
          total={TIMER_CONFIG.banSeconds}
          turnKey={`ban-${banIndex}`}
        />
      </HudStatusPortal>
      <div>
        <AgentPool
          agents={pool}
          banned={banned}
          showBanOverlay={true}
          unavailableGroups={bannedGroups}
          selection={(a) =>
            a.id === selectedAgent?.id
              ? banTurn === "p2"
                ? "selected-p2"
                : "selected-p1"
              : "none"
          }
          onClick={setSelectedAgent}
          onConfirm={(a) => {
            onBan(a);
            setSelectedAgent(null);
          }}
          confirmLabel="BAN"
        />
      </div>
    </Card>
  );
}