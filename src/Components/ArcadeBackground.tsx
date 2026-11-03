import "../ArcadeBackground.css";

type Player = "p1" | "p2" | null;

interface Props {
  activePlayer: Player;
}

export function ArcadeBackground({ activePlayer }: Props) {
  return (
    <div
      className="arcade-bg"
      data-player={activePlayer ?? "neutral"}
      aria-hidden="true"
    >
      <div className="arcade-bg__color arcade-bg__color--p1" />
      <div className="arcade-bg__color arcade-bg__color--p2" />
    </div>
  );
}
