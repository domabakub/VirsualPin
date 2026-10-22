"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { bars } from "@/instruments/ranat/model";
import { RanatSurface } from "./RanatSurface";
import type { RanatSceneProps } from "./RanatScene";
import "./ranat-3d.css";

const Scene = dynamic(() => import("./RanatScene").then(m => m.RanatScene), { ssr: false, loading: () => <div className="rn-model-loading">กำลังเตรียมระนาด 3D…</div> });
class ModelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function RanatPlayStage(props: RanatSceneProps) {
  const [flat, setFlat] = useState(false), [reduced, setReduced] = useState(false), [active, setActive] = useState(true), [seen, setSeen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const range = props.range ?? [0, 20];
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(query.matches); motion(); query.addEventListener("change", motion);
    let visible = true;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) setSeen(true); update(); });
    if (wrapper.current) observer.observe(wrapper.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); query.removeEventListener("change", motion); document.removeEventListener("visibilitychange", update); };
  }, []);
  const fallback = <div className="rn-flat-fallback">{props.cameraInput && <p role="status">แสดง 3D ไม่ได้ จึงตรวจหัวไม้สัมผัสลูกระนาดไม่ได้ · ใช้ปุ่มโน้ตสัมผัสแทน</p>}<RanatSurface {...props} mallets={props.poses} decorative={props.showcase}/></div>;
  return <div ref={wrapper} className={`rn-model-stage ${props.showcase ? "rn-model-showcase" : ""}`}>
    <div className="rn-model-view" onPointerUp={e => props.onUp?.(`pointer-${e.pointerId}`)} onPointerCancel={e => props.onUp?.(`pointer-${e.pointerId}`)} onLostPointerCapture={e => props.onUp?.(`pointer-${e.pointerId}`)}>
      {flat || (props.showcase && !seen) ? fallback : <ModelBoundary fallback={fallback}><Scene {...props} active={active} reducedMotion={reduced}/></ModelBoundary>}
    </div>
    {!props.showcase && <>
      <div className="rn-note-pads" role="group" aria-label="ปุ่มโน้ตระนาด" style={{ gridTemplateColumns: `repeat(${range[1] - range[0] + 1}, minmax(34px, 1fr))` }}>
        {bars.slice(range[0], range[1] + 1).map(bar => <button key={bar.id} type="button" disabled={bar.id >= (props.disabledFrom ?? 21)}
          aria-label={`${bar.label} ลูก ${bar.id + 1}`} data-aim={props.poses?.find(p => p.bar === bar.id)?.hand}
          onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); props.onDown?.(bar.id, `pad-${e.pointerId}`); }}
          onPointerUp={e => props.onUp?.(`pad-${e.pointerId}`)} onPointerCancel={e => props.onUp?.(`pad-${e.pointerId}`)} onLostPointerCapture={e => props.onUp?.(`pad-${e.pointerId}`)}
          onKeyDown={e => { if (["Enter", " "].includes(e.key) && !e.repeat) { e.preventDefault(); props.onDown?.(bar.id, `pad-key-${bar.id}`); } }}
          onKeyUp={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); props.onUp?.(`pad-key-${bar.id}`); } }} onBlur={() => props.onUp?.(`pad-key-${bar.id}`)}>
          <strong>{bar.label}</strong><small>{bar.id + 1}</small>
        </button>)}
      </div>
      <div className="rn-model-meta"><span>{props.cameraInput ? "ยกไม้แล้วลดลงให้หัวไม้สัมผัสลูกระนาด · ไม้ทองซ้าย / ไม้ฟ้าขวา" : "แตะลูกระนาดหรือปุ่มโน้ต · ไม้ทองซ้าย / ไม้ฟ้าขวา"}</span>{!props.cameraInput && <button type="button" onClick={() => setFlat(!flat)}>{flat ? "ดูแบบ 3D" : "ใช้ภาพ 2D"}</button>}</div>
    </>}
  </div>;
}
