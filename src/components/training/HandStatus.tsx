import { HandIcon } from "@/components/icons";
import type { HandSide, TrackedHand } from "@/lib/hand-tracking/types";

function HandCard({ side, hand }: { side: HandSide; hand?: TrackedHand }) {
  const isLeft = side === "Left";
  const accent = isLeft ? "#f4b94f" : "#67ef98";
  return (
    <div className="glass flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ color: accent, background: `${accent}16` }}>
        <HandIcon className={isLeft ? "-scale-x-100" : ""} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] tracking-[.12em] text-white/45">{isLeft ? "LEFT HAND" : "RIGHT HAND"}</span>
        <span className="block truncate text-sm font-medium">{hand ? `ตรวจพบ · ${Math.round(hand.confidence * 100)}%` : "กำลังค้นหา…"}</span>
      </span>
      <span className={`ml-auto size-2.5 shrink-0 rounded-full ${hand ? "animate-pulse" : "bg-white/20"}`} style={hand ? { background: accent, boxShadow: `0 0 12px ${accent}` } : undefined} />
    </div>
  );
}

export function HandStatus({ hands, vertical = false }: { hands: TrackedHand[]; vertical?: boolean }) {
  return (
    <div className={`flex gap-3 ${vertical ? "flex-col" : "max-sm:flex-col"}`}>
      <HandCard side="Left" hand={hands.find((hand) => hand.side === "Left")} />
      <HandCard side="Right" hand={hands.find((hand) => hand.side === "Right")} />
    </div>
  );
}
