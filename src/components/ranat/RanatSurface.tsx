"use client";
import { useId } from "react";
import { bars } from "@/instruments/ranat/model";
import type { MalletPose } from "@/instruments/ranat/handMallets";

export function RanatSurface({ hits = [], onDown, onUp, disabledFrom = 21, range = [0, 20], decorative = false, mallets = [], cameraInput = false }: {
  mallets?: MalletPose[]; cameraInput?: boolean;
  hits?: { bar: number; hand: "L" | "R"; stamp: number }[];
  onDown?: (bar: number, owner: string) => void; onUp?: (owner: string) => void;
  disabledFrom?: number; range?: [number, number]; decorative?: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const visible = bars.slice(range[0], range[1] + 1), width = 908 / visible.length;
  function position(index: number) { const relative = (index - (visible.length - 1) / 2) / (visible.length / 2); return { x: 56 + index * width, y: 123 - relative * relative * 59, length: 183 - index / visible.length * 39 }; }
  return <svg className="rn-instrument" viewBox="0 0 1020 440" role={decorative ? "img" : "group"} aria-label="ระนาดเอกไทย มุมมองคนเล่น" style={{ touchAction: decorative ? "auto" : "none" }}>
    <defs>
      <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#503120"/><stop offset=".12" stopColor="#996645"/><stop offset=".48" stopColor="#bb8660"/><stop offset=".9" stopColor="#7e4f34"/><stop offset="1" stopColor="#4d2d1e"/></linearGradient>
      <linearGradient id={`${id}-body`} x2="0" y2="1"><stop stopColor="#ab7250"/><stop offset=".25" stopColor="#74452e"/><stop offset="1" stopColor="#3c271e"/></linearGradient>
      <linearGradient id={`${id}-mallet`}><stop stopColor="#efeee4"/><stop offset=".45" stopColor="#fffdf2"/><stop offset="1" stopColor="#c6bfae"/></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#503d2c" stopOpacity=".24"/><stop offset="1" stopColor="#503d2c" stopOpacity="0"/></radialGradient>
      <pattern id={`${id}-grain`} width="24" height="128" patternUnits="userSpaceOnUse"><path d="M5 0 Q14 30 6 70 T12 128 M18 0 Q8 40 19 90 T18 128" stroke="#2b160d" strokeOpacity=".12" fill="none"/><path d="M2 0 Q8 35 2 78 T5 128" stroke="#f8d5a8" strokeOpacity=".19" fill="none"/></pattern>
    </defs>
    <ellipse cx="510" cy="353" rx="489" ry="69" fill={`url(#${id}-shadow)`}/>
    <path d="M35 188 Q510 330 985 174 L945 296 Q510 442 74 299Z" fill={`url(#${id}-body)`}/>
    <path d="M57 244 Q510 389 970 234 M69 267 Q510 411 958 256" stroke="#c69c5e" strokeWidth="3" fill="none" opacity=".75"/>
    <path d="M28 57 Q46 39 57 73 L79 275 50 258Z M977 54 Q994 39 996 68 L986 251 957 272Z" fill={`url(#${id}-body)`} stroke="#d2ac73" strokeWidth="3"/>
    <path d="M120 309 L119 352 151 348 157 321 M867 318 L875 350 906 349 900 309" fill="#5b3928"/>
    {visible.map((bar, index) => {
      const p = position(index), disabled = bar.id >= disabledFrom, hit = hits.find(h => h.bar === bar.id);
      return <g key={bar.id} role={decorative ? undefined : "button"} tabIndex={decorative || disabled ? undefined : 0} aria-disabled={!decorative && disabled ? true : undefined} aria-label={`${bar.label} ช่วง ${bar.register + 1} ลูก ${bar.id + 1}${disabled ? " นอกช่วงคู่เสียง" : ""}`} className={`rn-bar ${disabled ? "rn-bar-disabled" : ""}`} transform={`translate(${p.x} ${p.y})`}
        onPointerDown={decorative || disabled ? undefined : e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); onDown?.(bar.id, `pointer-${e.pointerId}`); }}
        onPointerUp={e => onUp?.(`pointer-${e.pointerId}`)} onPointerCancel={e => onUp?.(`pointer-${e.pointerId}`)} onLostPointerCapture={e => onUp?.(`pointer-${e.pointerId}`)}
        onKeyDown={e => { if (!decorative && !disabled && !e.repeat && ["Enter", " "].includes(e.key)) { e.preventDefault(); onDown?.(bar.id, `button-${bar.id}`); } }}
        onKeyUp={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); onUp?.(`button-${bar.id}`); } }} onBlur={() => onUp?.(`button-${bar.id}`)}>
        <rect x="1" y="8" width={width - 3} height={p.length} rx="5" fill="#422b20"/>
        <rect className="rn-bar-face" width={width - 4} height={p.length} rx="5" fill={`url(#${id}-wood)`} stroke="#d1a076" strokeWidth=".7"/>
        <rect width={width - 4} height={p.length} rx="5" fill={`url(#${id}-grain)`} pointerEvents="none"/>
        <path d={`M5 33 Q${width / 2} 27 ${width - 8} 33 M5 ${p.length - 29} Q${width / 2} ${p.length - 34} ${width - 8} ${p.length - 29}`} stroke="#d4c7a6" strokeWidth="2.5" fill="none" pointerEvents="none"/>
        {hit && <rect key={hit.stamp} className="rn-strike-flash" x="2" y="2" width={width - 8} height={p.length - 4} rx="4" fill={hit.hand === "L" ? "#ffcf75" : "#c2e7f5"} pointerEvents="none"/>}
        {!decorative && <><text x={(width - 4) / 2} y={p.length - 51} textAnchor="middle" fill="#fff0d4" fontSize={visible.length <= 10 ? 19 : 13} pointerEvents="none">{bar.label}</text><text x={(width - 4) / 2} y={p.length - 10} textAnchor="middle" fill="#e3c19b" fontSize="9" pointerEvents="none">{bar.id + 1}</text></>}
      </g>;
    })}
    <g fill="none" stroke="#c69c5e" opacity=".75"><path d="M467 356 Q487 330 510 358 Q533 330 553 356 Q529 383 510 358 Q491 383 467 356Z"/><path d="M490 356 Q510 316 530 356 Q510 392 490 356Z"/></g>
    {(["L", "R"] as const).map(hand => {
      const pose = mallets.find(p => p.hand === hand);
      if (cameraInput && !pose) return null;
      const hit = [...hits].reverse().find(h => h.hand === hand), found = visible.findIndex(b => b.id === (pose?.bar ?? hit?.bar));
      const p = position(found >= 0 ? found : Math.round(visible.length * (hand === "L" ? .3 : .7)));
      return <g key={hand} className="rn-mallet" style={{ transform: `translate(${p.x + width / 2}px, ${p.y + p.length * .53 - (pose ? Math.max(0, .62 - pose.v) * 95 : 0)}px)` }} pointerEvents="none">
        <g key={hit?.stamp} className={hit ? "rn-mallet-strike" : undefined}>
          <path d={`M0 5 L${hand === "L" ? -92 : 92} 240`} stroke="#d2af7d" strokeWidth="8"/><path d={`M-1 5 L${hand === "L" ? -93 : 91} 240`} stroke="#593e2d" strokeWidth="4"/>
          <ellipse cx="2" cy="8" rx="21" ry="14" fill="#3d3022" opacity=".25"/><ellipse cy="0" rx="20" ry="24" fill={`url(#${id}-mallet)`} stroke="#bdb49d"/>
          <path d="M-14 -15 Q0 -20 14 -15 M-17 -10 Q0 -15 17 -10 M-18 -5 Q0 -10 18 -5" stroke="#c8c0ab" fill="none" strokeWidth="1"/>
        </g>
      </g>;
    })}
  </svg>;
}
