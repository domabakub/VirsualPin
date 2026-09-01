"use client";

import type { StringIndex } from "@/data/songs";
import { getPinNoteName } from "@/lib/audio/pinTuning";

type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  onSelectFret: (string: StringIndex, fret: number) => void;
  onPluck: (string: StringIndex) => void;
};

export function TouchPinControls({ frets, activeString, expected, onSelectFret, onPluck }: Props) {
  return (
    <fieldset className="touch-controls">
      <legend>เลือกเฟรต แล้วกดดีดสาย</legend>
      {([0, 1, 2] as StringIndex[]).map(string => (
        <div key={string} className={`string-control ${expected?.string === string ? "is-expected" : ""}`}>
          <label htmlFor={`fret-${string}`}>สาย {string + 1}</label>
          <select id={`fret-${string}`} aria-label={`เฟรตสาย ${string + 1}`} value={frets[string]} onChange={event => onSelectFret(string, Number(event.target.value))}>
            {Array.from({ length: 7 }, (_, fret) => <option key={fret} value={fret}>{fret} · {getPinNoteName(string, fret, true)}{fret === 0 ? " สายเปล่า" : ""}</option>)}
          </select>
          <button type="button" aria-label={`ดีด สาย ${string + 1} · ${getPinNoteName(string, frets[string], true)}`} onClick={() => onPluck(string)} className={`ui-button ${activeString === string ? "ui-primary" : ""}`}>ดีด</button>
        </div>
      ))}
    </fieldset>
  );
}
