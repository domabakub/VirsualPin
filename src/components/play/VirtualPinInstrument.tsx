"use client";

import type { StringIndex } from "@/data/songs";

const STRING_LABELS = ["สาย 1 · D", "สาย 2 · F♯", "สาย 3 · A"];
const FRET_LABELS = ["0", "1", "2", "3", "4", "5", "6"];

type Props = {
  frets: [number, number, number];
  activeString: StringIndex | null;
  expected?: { string: StringIndex; fret: number };
  onSelectFret: (string: StringIndex, fret: number) => void;
  onPluck: (string: StringIndex) => void;
};

export function VirtualPinInstrument({ frets, activeString, expected, onSelectFret, onPluck }: Props) {
  return (
    <div className="absolute inset-x-[3%] top-[34%] z-10 h-[43%] min-h-48 select-none" aria-label="พิณเสมือนสามสาย">
      <div className="absolute inset-y-[7%] left-[2%] w-[12%] rounded-[45%_28%_28%_45%] border border-amber-200/30 bg-[radial-gradient(circle_at_60%_50%,#d69a51,#7b431f_72%)] shadow-[0_16px_45px_rgba(0,0,0,.45)]">
        <span className="absolute left-[24%] top-[16%] size-3 rounded-full bg-[#3a2116] shadow-[0_28px_0_#3a2116,0_56px_0_#3a2116]" />
      </div>
      <div className="absolute inset-y-[10%] left-[11%] right-[10%] overflow-hidden rounded-xl border-y border-amber-200/30 bg-[linear-gradient(180deg,#8f5228,#5c321d_48%,#784522)] shadow-[0_12px_35px_rgba(0,0,0,.36)]">
        <div className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(3deg,transparent_0,transparent_10px,#f8d99c_11px,transparent_12px)]" />
        <div className="absolute inset-y-0 left-[11%] right-[3%] grid grid-cols-7">
          {FRET_LABELS.map((fret, index) => <div key={fret} className="relative border-r border-amber-100/45"><span className="absolute right-1 top-1 text-[8px] text-amber-100/35">{index}</span></div>)}
        </div>

        {[0, 1, 2].map((stringNumber) => {
          const string = stringNumber as StringIndex;
          const active = activeString === string;
          return <span key={`line-${string}`} className={`pointer-events-none absolute left-0 right-0 z-10 block h-[2px] -translate-y-1/2 bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-100 transition ${active ? "animate-pulse shadow-[0_0_16px_#facc15]" : "shadow-[0_1px_2px_#000]"}`} style={{ top: `${25 + string * 25}%` }} />;
        })}

        {[0, 1, 2].map((stringNumber) => {
          const string = stringNumber as StringIndex;
          const active = activeString === string;
          return (
            <button key={string} type="button" onClick={() => onPluck(string)} aria-label={`ดีด ${STRING_LABELS[string]}`} className="group absolute left-0 z-40 grid h-[23%] w-[11%] -translate-y-1/2 place-items-center" style={{ top: `${25 + string * 25}%` }}>
              <span className={`grid size-7 place-items-center rounded-full border text-[9px] font-bold transition ${active ? "scale-110 border-yellow-200 bg-yellow-300 text-amber-950 shadow-[0_0_16px_#facc15]" : "border-amber-100/35 bg-[#3a2116]/75 text-amber-100/70 group-hover:border-amber-100 group-hover:bg-amber-200 group-hover:text-amber-950"}`}>{string + 1}</span>
            </button>
          );
        })}

        <div className="absolute inset-y-0 left-[11%] right-[3%] z-30 grid grid-cols-7">
          {FRET_LABELS.map((fretLabel, fret) => (
            <div key={fretLabel} className="grid grid-rows-3">
              {[0, 1, 2].map((stringNumber) => {
                const string = stringNumber as StringIndex;
                const selected = frets[string] === fret;
                const isExpected = expected?.string === string && expected.fret === fret;
                return <button key={string} type="button" aria-label={`สาย ${string + 1} เฟรต ${fret}`} onClick={(event) => { event.stopPropagation(); onSelectFret(string, fret); }} className="relative grid place-items-center"><span className={`size-4 rounded-full border transition ${selected ? "scale-110 border-emerald-200 bg-emerald-400 shadow-[0_0_12px_#4ade80]" : isExpected ? "animate-pulse border-blue-200 bg-blue-400 shadow-[0_0_12px_#60a5fa]" : "border-transparent bg-transparent hover:border-white/30 hover:bg-white/10"}`} /></button>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-y-0 right-[1%] w-[13%] rounded-[30%_60%_50%_35%] border border-amber-200/30 bg-[radial-gradient(circle_at_35%_50%,#d6984e,#75401e_68%)] shadow-[0_18px_50px_rgba(0,0,0,.45)] before:absolute before:left-[34%] before:top-[32%] before:size-8 before:rounded-full before:border-[7px] before:border-[#432717]/70" />
      <p className="absolute -bottom-3 left-[13%] text-[9px] tracking-[.12em] text-white/35">แตะจุดเพื่อเลือกเฟรต · แตะสายหรือกด 1 2 3 เพื่อดีด</p>
    </div>
  );
}
