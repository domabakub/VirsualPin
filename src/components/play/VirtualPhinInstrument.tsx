"use client";

import type { StringIndex } from "@/data/songs";
import type { StringOrder } from "@/lib/ar-layout";

const STRING_ORDER: StringOrder = [2, 1, 0];
const VISUAL_FRETS = [0, 1, 2, 3, 4, 5, 6];
type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  locked?: { string: StringIndex; fret: number };
  cameraActive: boolean;
  stringOrder?: StringOrder;
};

// A functional fret guide over the live camera, not an illustration of an instrument.
export function VirtualPhinInstrument({ frets, activeString, expected, locked, cameraActive, stringOrder = STRING_ORDER }: Props) {
  if (!cameraActive) return null;
  return <div className="ar-instrument-guide" aria-hidden="true">
    <div className="absolute inset-x-2 bottom-2 top-6 grid grid-cols-7">{VISUAL_FRETS.map(fret => <div key={fret} className="ar-instrument-fret relative grid grid-rows-3 border-l">
      <span className="absolute -top-5 left-1 text-xs">{fret}</span>
      {stringOrder.map(string => {
        const target = expected?.string === string && expected.fret === fret;
        const focused = locked?.string === string && locked.fret === fret;
        return <span key={string} className={`ar-instrument-string ${activeString === string ? "is-playing" : ""}`}><span className={`ar-instrument-note ${target ? "is-target" : focused ? "is-focused" : frets[string] === fret ? "is-current" : ""}`} /></span>;
      })}
    </div>)}</div>
  </div>;
}
