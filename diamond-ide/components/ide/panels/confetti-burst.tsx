import type { CSSProperties } from "react";

const CONFETTI_PIECES = Array.from({ length: 22 }, (_, index) => ({
  left: `${4 + (index * 4.2) % 92}%`,
  delay: `${(index % 6) * 0.08}s`,
  duration: `${2.2 + (index % 5) * 0.18}s`,
  drift: `${-36 + (index % 7) * 12}px`,
  rotate: `${index * 21}deg`,
  color: ["#f59e0b", "#34d399", "#60a5fa", "#f472b6"][index % 4]
}));

export function ConfettiBurst() {
  return (
    <div className="diamond-confetti">
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={index}
          className="diamond-confetti-piece"
          style={
            {
              left: piece.left,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
              ["--diamond-confetti-drift" as string]: piece.drift,
              ["--diamond-confetti-rotate" as string]: piece.rotate,
              background: piece.color
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
