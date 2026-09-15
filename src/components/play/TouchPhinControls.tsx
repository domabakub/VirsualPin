"use client";

import Image from "next/image";
import type { StringIndex } from "@/data/songs";
import { getPhinNoteName } from "@/lib/audio/phinTuning";

type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  onSelectFret: (string: StringIndex, fret: number) => void;
  onPluck: (string: StringIndex, fret?: number) => void;
};

const VISUAL_STRINGS: StringIndex[] = [2, 1, 0];

export function TouchPhinControls({ frets, activeString, expected, onSelectFret, onPluck }: Props) {
  return (
    <fieldset className="freeplay-touch-phin">
        <legend className="sr-only">แตะตำแหน่งโน้ตบนคอพิณ</legend>
        <div className="freeplay-touch-heading">
          <div>
            <strong>Touch Phin</strong>
            <span>แตะโน้ตบนคอพิณเพื่อเล่นทันที</span>
          </div>
          <span className="freeplay-touch-hint">แตะได้ทุกสาย · เฟรต 0–6</span>
        </div>
        <div className="freeplay-touch-stage">
          <Image
            className="freeplay-touch-reference"
            src="/assets/phin/phin-touch-reference.jpg"
            alt=""
            aria-hidden="true"
            width={465}
            height={659}
            priority
            draggable={false}
          />
          <div className="freeplay-touch-neck">
            <span className="freeplay-touch-middle-string" aria-hidden="true" />
            {Array.from({ length: 7 }, (_, fret) => (
              <div className="freeplay-touch-fret" data-fret={fret} key={fret}>
                {VISUAL_STRINGS.map(string => {
                  const noteName = getPhinNoteName(string, fret, true);
                  const isActive = activeString === string && frets[string] === fret;
                  const isExpected = expected?.string === string && expected.fret === fret;
                  return (
                    <button
                      key={string}
                      type="button"
                      aria-label={`${noteName} สาย ${string + 1} เฟรต ${fret}`}
                      className={`freeplay-touch-note ${fret === 0 ? "is-open" : ""} ${isExpected ? "is-expected" : ""} ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        onSelectFret(string, fret);
                        onPluck(string, fret);
                      }}
                    >
                      <span>{getPhinNoteName(string, fret)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="freeplay-touch-label" aria-hidden="true">คอพิณ 3 สาย</div>
        </div>
        <div className="freeplay-touch-legend" aria-hidden="true">
          <span><i />โน้ตบนคอพิณ</span>
          <span><i className="is-open" />สายเปล่า</span>
          <span>แตะซ้ำเพื่อเล่นจังหวะของคุณ</span>
        </div>
    </fieldset>
  );
}
