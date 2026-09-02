"use client";

import type { StringIndex } from "@/data/songs";

const STRING_ORDER: StringIndex[] = [2, 1, 0];
const VISUAL_FRETS = [0, 1, 2, 3, 4, 5, 6];
type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  locked?: { string: StringIndex; fret: number };
  cameraActive: boolean;
};

// A functional fret guide over the live camera, not an illustration of an instrument.
export function VirtualPhinInstrument({ frets, activeString, expected, locked, cameraActive }: Props) {
  if (!cameraActive) return null;
  return <div className="pointer-events-none absolute inset-x-[15%] top-[62%] z-10 h-[24%] select-none rounded-xl border border-white/25 bg-black/45" aria-hidden="true">
    <div className="absolute inset-2 grid grid-cols-7">{VISUAL_FRETS.map(fret => <div key={fret} className="relative grid grid-rows-3 border-l border-white/25">
      <span className="absolute -top-5 left-1 text-xs text-white">{fret}</span>
      {STRING_ORDER.map(string => {
        const target = expected?.string === string && expected.fret === fret;
        const focused = locked?.string === string && locked.fret === fret;
        return <span key={string} className={`grid place-items-center border-b ${activeString === string ? "border-white" : "border-white/20"}`}><span className={`size-3 rounded-full ${target ? "bg-blue-300 ring-2 ring-white" : focused ? "bg-amber-300" : frets[string] === fret ? "bg-white/90" : ""}`} /></span>;
      })}
    </div>)}</div>
  </div>;
}
