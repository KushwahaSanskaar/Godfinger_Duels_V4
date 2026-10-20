import type { Agent, ClassGroup, PlayerId } from "../types";
import { Card } from "../Components/Card";
import { AgentPool } from "../Components/AgentPool";
import { useEffect, useState } from "react";
import { TIMER_CONFIG } from "../Data/timers";
import { HeaderStatusPortal } from "../Components/HeaderStatusPortal";

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
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIG.banSeconds);

  // Reset the clock every time the turn advances (banIndex changes).
  useEffect(() => {
    setTimeLeft(TIMER_CONFIG.banSeconds);
    setSelectedAgent(null);
  }, [banIndex]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, onTimeout]);

  return (
    <Card>
      <HeaderStatusPortal>
        {/* Left information */}
        <div className="flex flex-col gap-1 text-white">
          <span className="font-pixel text-[10px]">
            Ban {banIndex + 1} of {classGroups.length}
          </span>

          <span className="font-semibold text-sm">
            {displayName(banTurn)}'s ban
          </span>
        </div>

        {/* Right Information */}
        <div
          className={`font-pixel text-2xl ${timeLeft <= 10 ? "text-yellow-300" : "text-white"
            }`}
        >
          0:{timeLeft.toString().padStart(2, "0")}
        </div>
      </HeaderStatusPortal>
      <div>
        <AgentPool
          agents={pool}
          banned={banned}
          showBanOverlay={true}
          unavailableGroups={bannedGroups}
          selection={(a) => a.id === selectedAgent?.id ? (banTurn === "p2" ? "selected-p2" : "selected-p1") : "none"}
          onClick={setSelectedAgent}
          onConfirm={(a) => { onBan(a); setSelectedAgent(null); }}
          confirmLabel="BAN"
          confirmColor="#E63946"
        />
      </div>
    </Card >
  );
}