"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import { type Articulation, type RanatSource, bars } from "@/instruments/ranat/model";
import { DEFAULT_CALIBRATION, HAND_TIMEOUT_MS, HandMalletController, displayMalletPoses, previewMalletPoses, type MalletCommand, type MalletFrame, type PalmSample } from "@/instruments/ranat/handMallets";
import { AR_PLACEMENT_KEY, AR_PLACEMENT_LIMITS, AR_REGION_MESSAGES, DEFAULT_AR_PLACEMENT, clampPlacement, parsePlacement, regionFromBars, serializePlacement, videoToView, type ArPlacement, type ScreenBar } from "@/instruments/ranat/ar";
import type { RanatHit } from "./RanatScene";

const Scene = dynamic(() => import("./RanatScene").then(m => m.RanatScene), { ssr: false, loading: () => <div className="rn-model-loading">กำลังเตรียมระนาด 3D…</div> });
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const COUNT = 8;
const empty: MalletFrame = { poses: [], commands: [], ambiguous: false };
const sliders: { key: "scale" | "opacity" | "swing"; label: string }[] = [
  { key: "scale", label: "ขนาด" }, { key: "opacity", label: "ความชัด" }, { key: "swing", label: "ระยะยกมือ" },
];

/** Camera overlay: the ranat is drawn on the live video and is played where it appears. */
export function RanatArCamera({ mode, offset, rangeStart, hits, suspended, pauseToken, onBegin, onRelease, onStop, onUnlock, onTouch }: {
  mode: Articulation; offset: number; rangeStart: number; hits: RanatHit[]; suspended: boolean; pauseToken: number;
  onBegin: (bar: number, mode: Articulation, offset: number, owner: string, source: RanatSource, hand?: "L" | "R", velocity?: number) => Promise<void>;
  onRelease: (owner: string) => void; onStop: () => void; onUnlock: () => Promise<boolean>; onTouch: (bar: number, owner: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null), stageRef = useRef<HTMLDivElement>(null);
  const camera = useCamera(videoRef);
  const mirrored = camera.facing === "user";
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready", mirrored);
  const [saved, setSaved] = useState<ArPlacement>(DEFAULT_AR_PLACEMENT), [draft, setDraft] = useState<ArPlacement | null>(null);
  const placement = draft ?? saved, editing = draft !== null;
  const [screenBars, setScreenBars] = useState<ScreenBar[]>([]);
  const [message, setMessage] = useState(""), [running, setRunning] = useState(false), [sensitivity, setSensitivity] = useState(.5);
  const [frame, setFrame] = useState<MalletFrame>(empty);
  const controller = useRef(new HandMalletController()), lastFrame = useRef(0), startRequest = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; from: ArPlacement } | null>(null);
  const callbacks = useRef({ onBegin, onRelease, mode, offset });
  useEffect(() => { callbacks.current = { onBegin, onRelease, mode, offset }; }, [onBegin, onRelease, mode, offset]);

  const region = useMemo(() => regionFromBars(screenBars, rangeStart, COUNT, placement.swing), [screenBars, rangeStart, placement.swing]);
  const calibration = region.calibration;
  const config = useMemo(() => ({ calibration: calibration ?? DEFAULT_CALIBRATION, start: rangeStart, count: COUNT, mode, offset, sensitivity }), [calibration, rangeStart, mode, offset, sensitivity]);
  const arProps = useMemo(() => ({ placement, onBars: setScreenBars }), [placement]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSaved(parsePlacement(localStorage.getItem(AR_PLACEMENT_KEY))); }
      catch { setMessage("เบราว์เซอร์นี้ไม่อนุญาตให้จำตำแหน่งระนาด · ใช้ตำแหน่งเริ่มต้น"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dispatch = useCallback((commands: MalletCommand[]) => {
    const cb = callbacks.current;
    for (const command of commands) {
      if (command.kind === "release") cb.onRelease(command.owner);
      else void cb.onBegin(command.bar, cb.mode, cb.offset, command.owner, "camera", command.hand, command.kind === "strike" ? command.velocity : .72);
    }
  }, []);
  const resetTracking = useCallback(() => { dispatch(controller.current.reset()); lastFrame.current = 0; setFrame(empty); }, [dispatch]);
  const invalidateStart = useCallback(() => { startRequest.current++; }, []);
  const pause = useCallback(() => { invalidateStart(); setRunning(false); resetTracking(); onStop(); }, [invalidateStart, onStop, resetTracking]);

  useEffect(() => {
    const video = videoRef.current, stage = stageRef.current;
    const view = stage ? { width: stage.clientWidth, height: stage.clientHeight } : { width: 0, height: 0 };
    const source = { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0 };
    const points: PalmSample[] = tracker.hands.map(hand => {
      const anchor = [0, 5, 9, 13, 17].reduce((p, i) => ({ x: p.x + hand.landmarks[i].x / 5, y: p.y + hand.landmarks[i].y / 5 }), { x: 0, y: 0 });
      return { ...videoToView(anchor, source, view, mirrored), hand: hand.side === "Left" ? "L" : "R", confidence: hand.confidence };
    });
    lastFrame.current = tracker.frameTime;
    if (camera.phase !== "ready" || tracker.phase !== "tracking" || document.hidden) return;
    if (!running || suspended || editing || !calibration) {
      dispatch(controller.current.reset());
      const preview = { poses: previewMalletPoses(points, tracker.frameTime, config), commands: [], ambiguous: false };
      const animation = requestAnimationFrame(() => setFrame(preview));
      return () => cancelAnimationFrame(animation);
    }
    const result = controller.current.update(points, tracker.frameTime, config);
    dispatch(result.commands);
    const animation = requestAnimationFrame(() => setFrame({ ...result, poses: result.poses.length ? result.poses : previewMalletPoses(points, tracker.frameTime, config) }));
    return () => cancelAnimationFrame(animation);
  }, [tracker.hands, tracker.frameTime, tracker.phase, mirrored, camera.phase, running, suspended, editing, calibration, config, dispatch]);

  useEffect(() => {
    const currentController = controller.current;
    const timer = setInterval(() => {
      if (lastFrame.current && performance.now() - lastFrame.current > HAND_TIMEOUT_MS) resetTracking();
    }, 60);
    const hide = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", hide);
    return () => { invalidateStart(); clearInterval(timer); window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", hide); dispatch(currentController.reset()); };
  }, [dispatch, pause, resetTracking, invalidateStart]);
  // Any change to what a gesture means stops the session; the player starts again deliberately.
  useEffect(() => {
    dispatch(controller.current.reset());
    const timer = setTimeout(pause, 0);
    return () => clearTimeout(timer);
  }, [mode, offset, rangeStart, sensitivity, suspended, pauseToken, editing, mirrored, pause, dispatch]);
  useEffect(() => {
    if (camera.phase === "ready" && tracker.phase !== "error" && calibration) return;
    dispatch(controller.current.reset());
    const timer = setTimeout(pause, 0);
    return () => clearTimeout(timer);
  }, [camera.phase, tracker.phase, calibration, pause, dispatch]);

  async function startPlaying() {
    const request = ++startRequest.current;
    const unlocked = await onUnlock();
    if (request !== startRequest.current) return;
    if (!unlocked) { setMessage("เปิดเสียงไม่สำเร็จ กรุณาลองอีกครั้ง"); return; }
    resetTracking(); setRunning(true); setMessage("");
  }
  const update = (patch: Partial<ArPlacement>) => setDraft(current => clampPlacement({ ...(current ?? saved), ...patch }));
  function save() {
    if (!draft) return;
    try { localStorage.setItem(AR_PLACEMENT_KEY, serializePlacement(draft)); setMessage("บันทึกตำแหน่งระนาดแล้ว · กดเริ่มจับมือเพื่อเล่น"); }
    catch { setMessage("บันทึกถาวรไม่ได้ · ใช้ตำแหน่งนี้จนกว่าจะปิดหน้า"); }
    setSaved(draft); setDraft(null);
  }
  function dragStart(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, from: placement };
  }
  function dragMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current, stage = stageRef.current;
    if (!start || start.id !== e.pointerId || !stage) return;
    update({ x: start.from.x + (e.clientX - start.x) / stage.clientWidth, y: start.from.y + (e.clientY - start.y) / stage.clientHeight });
  }
  function dragKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? .05 : .01, delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!delta) return;
    e.preventDefault(); update({ x: placement.x + delta[0], y: placement.y + delta[1] });
  }

  const ready = camera.phase === "ready" && tracker.phase === "tracking";
  const regionMessage = "reason" in region && screenBars.length ? AR_REGION_MESSAGES[region.reason] : "";
  const status = suspended ? "กำลังฟังบันทึก · พักการจับมือ" : editing ? "ลากระนาดไปวางบนโต๊ะหรือตรงหน้ามือ" : frame.ambiguous ? "มือซ้อนกัน · แยกมือแล้วลองใหม่"
    : running ? frame.poses.length ? "มือเหนือลูกไหน ไม้ก็อยู่ลูกนั้น · ลดมือถึงลูกเพื่อตี" : "ยกมือเหนือระนาดให้กล้องเห็น" : "ระนาดซ้อนบนภาพกล้อง · เล็งด้วยมือแล้วตีลงที่ลูกจริง";
  const strikeY = calibration ? (calibration.raised + (calibration.lowered - calibration.raised) * .62) * 100 : 0;
  return <div className="rn-ar-workspace">
    <div className="rn-air-toolbar rn-ar-toolbar"><div className="rn-air-copy"><p className="eyebrow">AR OVERLAY / ระนาดบนภาพกล้อง</p><h2>ระนาดอยู่ตรงหน้า.</h2><p role="status">{status}</p>
      <div className="rn-air-actions">{camera.phase !== "ready" ? <button className="ui-button" disabled={camera.phase === "requesting"} onClick={() => void camera.start()}>{camera.phase === "requesting" ? "กำลังเปิดกล้อง…" : "เปิดกล้อง AR"}</button> : <>
        <button className={`ui-button ${running ? "rn-air-running" : ""}`} disabled={!ready || suspended || editing || !calibration} onClick={() => running ? pause() : void startPlaying()}>{running ? "พักการจับมือ" : "เปิดเสียงและเริ่มตี"}</button>
        <button onClick={() => void camera.flip()}>สลับกล้อง</button>
        <button onClick={() => { pause(); setRunning(false); setDraft(null); camera.stop(); }}>ปิดกล้อง</button>
      </>}
        {!editing && <button onClick={() => { pause(); setDraft(placement); setMessage(""); }}>จัดตำแหน่งระนาด</button>}
      </div>
      {camera.phase === "ready" && !ready && !tracker.error && <small>กำลังเตรียมระบบจับมือครั้งแรก…</small>}
      {mode !== "direct" && <small>โหมดช่วยใช้มือหลักหนึ่งมือ อีกมืออยู่ในภาพได้{mode === "kro" || mode === "roll" ? " ลดมือค้างที่ลูกเพื่อเล่น ยกมือเพื่อหยุด" : " ยก–ลดหนึ่งครั้งเพื่อตีคู่"}</small>}
    </div></div>
    <div ref={stageRef} className="rn-ar-stage" data-editing={editing}>
      <video ref={videoRef} className="rn-ar-video" muted playsInline style={{ transform: mirrored ? "scaleX(-1)" : undefined }}/>
      {camera.phase !== "ready" && <div className="rn-ar-backdrop" aria-hidden="true"/>}
      <div className="rn-ar-model" style={{ opacity: placement.opacity }}
        onPointerUp={e => onRelease(`pointer-${e.pointerId}`)} onPointerCancel={e => onRelease(`pointer-${e.pointerId}`)} onLostPointerCapture={e => onRelease(`pointer-${e.pointerId}`)}>
        <SceneBoundary fallback={<p className="rn-ar-fallback">อุปกรณ์นี้แสดงระนาด 3D ไม่ได้ · ใช้โหมดกล้องหรือสัมผัสแทน</p>}>
          <Scene ar={arProps} hits={hits} poses={displayMalletPoses(frame.poses, mode, offset)} range={[rangeStart, rangeStart + COUNT - 1]}
            disabledFrom={mode === "pair" || mode === "kro" ? 21 - offset : 21} cameraInput={camera.phase === "ready" && !suspended} onDown={onTouch} onUp={onRelease}/>
        </SceneBoundary>
      </div>
      <canvas ref={canvasRef} className="rn-ar-hands" aria-hidden="true"/>
      {calibration && (editing || running) && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="rn-ar-guides" aria-hidden="true">
        <path d={`M${calibration.left * 100} ${calibration.raised * 100}H${calibration.right * 100}`} stroke="#a9edc4" strokeWidth=".5" vectorEffect="non-scaling-stroke"/>
        <path d={`M${calibration.left * 100} ${strikeY}H${calibration.right * 100}`} stroke="#f5c17e" strokeWidth=".5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke"/>
      </svg>}
      {editing && <div className="rn-ar-drag" role="application" tabIndex={0} aria-label="ลากหรือกดลูกศรเพื่อย้ายระนาด กด Shift เพื่อย้ายทีละมาก"
        onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onKeyDown={dragKey}><span>ลากเพื่อย้ายระนาด</span></div>}
      {camera.phase !== "ready" && !editing && <div className="rn-ar-intro"><span aria-hidden="true">◎</span><strong>เปิดกล้องเพื่อวางระนาดบนภาพจริง</strong><small>ตั้งกล้องให้เห็นโต๊ะและสองมือ · ประมวลผลบนอุปกรณ์ ไม่บันทึกวิดีโอ</small></div>}
      <span className="rn-ar-badge">{ready ? `${tracker.hands.length} มือ · ${tracker.fps} FPS` : "AR · ทดลอง"}</span>
    </div>
    {editing && <div className="rn-ar-editor" role="group" aria-label="จัดตำแหน่งระนาด">
      {sliders.map(({ key, label }) => <label key={key} className="rn-setting">{label}<output>{Math.round(placement[key] * 100)}%</output>
        <input type="range" aria-label={label} min={AR_PLACEMENT_LIMITS[key][0]} max={AR_PLACEMENT_LIMITS[key][1]} step=".01" value={placement[key]} onChange={e => update({ [key]: Number(e.target.value) } as Partial<ArPlacement>)}/></label>)}
      <div className="rn-ar-editor-actions"><button onClick={() => update(DEFAULT_AR_PLACEMENT)}>ค่าเริ่มต้น</button><button onClick={() => setDraft(null)}>ยกเลิก</button><button className="ui-button" onClick={save}>บันทึกตำแหน่ง</button></div>
    </div>}
    {(camera.error || tracker.error || regionMessage || message) && <p className="rn-air-message" role="status">{camera.error || tracker.error || regionMessage || message}</p>}
    <div className="rn-air-bottom"><div className="rn-air-hands">{(["L", "R"] as const).map(hand => { const pose = frame.poses.find(p => p.hand === hand); return <span key={hand} data-hand={hand} data-tracked={!!pose}><i/>{hand === "L" ? "ซ้าย" : "ขวา"}<strong>{pose ? `${bars[pose.bar].label} · ${pose.armed ? "พร้อมตี" : "ยกมือ"}` : "รอมือ"}</strong></span>; })}</div><label className="rn-air-sensitivity">ความไว<input aria-label="ความไวการตีผ่านกล้อง" type="range" min="0" max="1" step=".1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))}/></label></div>
    <p className="rn-air-footnote">เส้นเขียว = ยกเตรียม · เส้นทอง = ระดับลูกระนาด (ตี) · AR แบบซ้อนภาพ ยังไม่ยึดกับโต๊ะจริง · แตะลูกบนภาพเพื่อเล่นได้เช่นกัน</p>
  </div>;
}
