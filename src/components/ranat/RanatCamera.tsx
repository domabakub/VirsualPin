"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import { type Articulation, type RanatSource, bars } from "@/instruments/ranat/model";
import { validateCalibration, type Calibration } from "@/instruments/ranat/camera";
import { DEFAULT_CALIBRATION, HAND_TIMEOUT_MS, HandMalletController, displayMalletPoses, previewMalletPoses, type MalletCommand, type MalletFrame, type PalmSample } from "@/instruments/ranat/handMallets";
import { RanatPlayStage } from "./RanatPlayStage";
import type { RanatHit } from "./RanatScene";

const steps = ["เลื่อนมือไปขอบซ้ายที่เอื้อมสบาย", "เลื่อนมือไปขอบขวาที่เอื้อมสบาย", "ยกมือขึ้นในท่าเตรียมตี", "ลดมือลงในท่าตี"];
const empty: MalletFrame = { poses: [], commands: [], ambiguous: false };
export function RanatCamera({ mode, offset, hits, suspended, pauseToken, onBegin, onRelease, onStop, onUnlock, onTouch }: {
  mode: Articulation; offset: number; hits: RanatHit[]; suspended: boolean; pauseToken: number;
  onBegin: (bar: number, mode: Articulation, offset: number, owner: string, source: RanatSource, hand?: "L" | "R", velocity?: number) => Promise<void>;
  onRelease: (owner: string) => void; onStop: () => void; onUnlock: () => Promise<boolean>; onTouch: (bar: number, owner: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useCamera(videoRef);
  const tracker = useHandTracking(videoRef, canvasRef, camera.phase === "ready", camera.facing === "user");
  const running = camera.phase === "ready" && tracker.phase === "tracking";
  const [calibration, setCalibration] = useState<Calibration>(DEFAULT_CALIBRATION);
  const [step, setStep] = useState<number | null>(null), [countdown, setCountdown] = useState<number | null>(null);
  const [message, setMessage] = useState(""), [sensitivity, setSensitivity] = useState(.5);
  const [frame, setFrame] = useState<MalletFrame>(empty), [aspect, setAspect] = useState(16 / 9);
  const controller = useRef(new HandMalletController()), lastFrame = useRef(0), captureSamples = useRef<number[]>([]);
  const latestPoints = useRef<PalmSample[]>([]), captureTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacks = useRef({ onBegin, onRelease, mode, offset });
  const config = useMemo(() => ({ calibration, start: 0, count: 21, mode, offset, sensitivity }), [calibration, mode, offset, sensitivity]);
  useEffect(() => { callbacks.current = { onBegin, onRelease, mode, offset }; }, [onBegin, onRelease, mode, offset]);
  const dispatch = useCallback((commands: MalletCommand[]) => {
    const cb = callbacks.current;
    for (const command of commands) {
      if (command.kind === "release") cb.onRelease(command.owner);
      else void cb.onBegin(command.bar, cb.mode, cb.offset, command.owner, "camera", command.hand, command.kind === "strike" ? command.velocity : .72);
    }
  }, []);
  const resetTracking = useCallback(() => {
    dispatch(controller.current.reset()); lastFrame.current = 0; setFrame(empty);
  }, [dispatch]);
  const pause = useCallback(() => {
    resetTracking(); onStop();
    if (captureTimer.current) clearInterval(captureTimer.current);
    captureTimer.current = null; setCountdown(null);
  }, [onStop, resetTracking]);
  useEffect(() => {
    const points: PalmSample[] = tracker.hands.map(hand => {
      const anchor = [0, 5, 9, 13, 17].reduce((p, i) => ({ x: p.x + hand.landmarks[i].x / 5, y: p.y + hand.landmarks[i].y / 5 }), { x: 0, y: 0 });
      return { ...anchor, x: camera.facing === "user" ? 1 - anchor.x : anchor.x, hand: hand.side === "Left" ? "L" : "R", confidence: hand.confidence };
    });
    latestPoints.current = points; lastFrame.current = tracker.frameTime;
    if (camera.phase !== "ready" || tracker.phase !== "tracking" || document.hidden) return;
    if (!running || suspended || step !== null) {
      dispatch(controller.current.reset());
      const preview = { poses: previewMalletPoses(points, tracker.frameTime, config), commands: [], ambiguous: false };
      const animation = requestAnimationFrame(() => setFrame(preview));
      return () => cancelAnimationFrame(animation);
    }
    const result = controller.current.update(points, tracker.frameTime, config);
    // Sound is dispatched by head-to-bar contact in the 3D scene.
    const animation = requestAnimationFrame(() => setFrame({ ...result, commands: [] }));
    return () => cancelAnimationFrame(animation);
  }, [tracker.hands, tracker.frameTime, tracker.phase, camera.facing, camera.phase, running, suspended, step, config, dispatch]);
  useEffect(() => {
    const currentController = controller.current;
    const timer = setInterval(() => {
      if (lastFrame.current && performance.now() - lastFrame.current > HAND_TIMEOUT_MS) { latestPoints.current = []; resetTracking(); }
    }, 60);
    const hide = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", hide);
    return () => { clearInterval(timer); window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", hide); dispatch(currentController.reset()); if (captureTimer.current) clearInterval(captureTimer.current); };
  }, [dispatch, pause, resetTracking]);
  useEffect(() => {
    dispatch(controller.current.reset());
    const timer = setTimeout(pause, 0);
    return () => clearTimeout(timer);
  }, [mode, offset, sensitivity, suspended, pauseToken, pause, dispatch]);
  useEffect(() => {
    if (camera.phase === "ready" && tracker.phase !== "error") return;
    dispatch(controller.current.reset());
    const timer = setTimeout(pause, 0);
    return () => clearTimeout(timer);
  }, [camera.phase, tracker.phase, pause, dispatch]);
  function cancelCapture() { if (captureTimer.current) clearInterval(captureTimer.current); captureTimer.current = null; setCountdown(null); }
  function calibrate() { pause(); cancelCapture(); captureSamples.current = []; setStep(0); setMessage(""); }
  function capture() {
    if (step === null || countdown !== null) return;
    let remaining = 2; setCountdown(remaining); setMessage("วางเมาส์ได้เลย ค้างมือในตำแหน่งที่ต้องการ");
    captureTimer.current = setInterval(() => {
      remaining--; setCountdown(remaining); if (remaining > 0) return;
      cancelCapture();
      const points = latestPoints.current.filter(p => p.confidence >= .55);
      if (points.length !== 1 || performance.now() - lastFrame.current > HAND_TIMEOUT_MS) { setMessage("ให้กล้องเห็นมือเดียวชัด ๆ แล้วจับตำแหน่งอีกครั้ง"); return; }
      captureSamples.current[step] = step < 2 ? points[0].x : points[0].y;
      if (step < 3) { setStep(step + 1); setMessage(""); return; }
      const [left, right, raised, lowered] = captureSamples.current, next = { left, right, raised, lowered };
      if (!validateCalibration(next)) { setStep(0); setMessage("ขอบซ้ายต้องอยู่ก่อนขอบขวา และท่าตีต้องต่ำกว่าท่ายก ลองตั้งพื้นที่อีกครั้ง"); return; }
      setCalibration(next); setStep(null); setMessage("ตั้งพื้นที่แล้ว ยกมือก่อนตีได้เลย");
    }, 1000);
  }

  const ready = camera.phase === "ready" && tracker.phase === "tracking";
  const status = suspended ? "กำลังฟังบันทึก · พักการจับมือ" : frame.ambiguous ? "มือซ้อนกัน · แยกมือแล้วลองใหม่" : running ? frame.poses.length ? "เล็งลูกระนาด แล้วยก–ลดมือเพื่อตี" : "ยกมือถึงเส้นเขียว แล้วลดผ่านเส้นทอง" : "ขยับซ้าย–ขวาเพื่อเล็ง · ลดมือเพื่อตี";
  return <div className="rn-air-workspace">
    <div className="rn-air-toolbar"><div className="rn-air-copy"><p className="eyebrow">HAND PLAY / เล่นด้วยมือ</p><h2>มือขยับ. ไม้ตาม.</h2><p role="status">{status}</p>
      <div className="rn-air-actions"><button className="ui-button" onClick={async () => { if (await onUnlock()) { await onBegin(10, "direct", 1, "sound-test", "touch", "R", .8); setMessage("ส่งโน้ตทดสอบแล้ว · หากไม่ได้ยิน ให้ตรวจระดับเสียงอุปกรณ์"); } else setMessage("เปิดเสียงไม่สำเร็จ กรุณาแตะทดสอบเสียงอีกครั้ง"); }}>ทดสอบเสียง</button>{camera.phase !== "ready" ? <button className="ui-button" disabled={camera.phase === "requesting"} onClick={() => { void onUnlock(); void camera.start(); }}>{camera.phase === "requesting" ? "กำลังเปิดกล้อง…" : "เปิดกล้อง"}</button> : <>
        <button onClick={calibrate} disabled={!ready}>ตั้งพื้นที่เล่น</button><button onClick={() => { pause(); cancelCapture(); setStep(null); camera.stop(); }}>ปิดกล้อง</button>
      </>}</div>
      {camera.phase === "ready" && !ready && !tracker.error && <small>กำลังเตรียมระบบจับมือครั้งแรก…</small>}
      {mode !== "direct" && <small>โหมดช่วยใช้มือหลักหนึ่งมือ อีกมืออยู่ในภาพได้{mode === "kro" || mode === "roll" ? " ลดมือค้างเพื่อเล่น ยกมือเพื่อหยุด" : " ยก–ลดหนึ่งครั้งเพื่อตีคู่"}</small>}
    </div><div className="rn-air-preview" style={{ aspectRatio: aspect }}>
      <video ref={videoRef} muted playsInline onLoadedMetadata={e => { const v = e.currentTarget; if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight); }} style={{ transform: camera.facing === "user" ? "scaleX(-1)" : undefined }}/><canvas ref={canvasRef}/>
      {camera.phase === "ready" && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="rn-air-guides" aria-hidden="true"><rect x={calibration.left*100} y={calibration.raised*100} width={(calibration.right-calibration.left)*100} height={(calibration.lowered-calibration.raised)*100} fill="none" stroke="#fff8" strokeWidth=".5"/><path d={`M${calibration.left*100} ${(calibration.raised+(calibration.lowered-calibration.raised)*.45)*100}H${calibration.right*100}`} stroke="#a9edc4" strokeWidth=".8"/><path d={`M${calibration.left*100} ${(calibration.raised+(calibration.lowered-calibration.raised)*.62)*100}H${calibration.right*100}`} stroke="#f5c17e" strokeWidth=".8" strokeDasharray="2 2"/></svg>}
      {camera.phase !== "ready" && <div className="rn-air-placeholder"><span aria-hidden="true">◎</span><small>ให้กล้องเห็นสองมือ</small></div>}<span className="rn-air-preview-label">{ready ? `${tracker.hands.length} มือ · ${tracker.fps} FPS` : "CAMERA PREVIEW"}</span>
    </div></div>
    {step !== null && <div className="rn-air-calibration"><strong>{step + 1}/4 · {steps[step]}</strong><button className="ui-button" disabled={countdown !== null || !ready} onClick={capture}>{countdown !== null ? `จับใน ${countdown}…` : "จับตำแหน่งใน 2 วินาที"}</button><button onClick={() => { cancelCapture(); setStep(null); }}>ยกเลิก</button></div>}
    {(camera.error || tracker.error || message) && <p className="rn-air-message" role="status">{camera.error || tracker.error || message}</p>}
    <RanatPlayStage hits={hits} poses={displayMalletPoses(frame.poses, mode, offset)} contactEnabled={running && !suspended && step === null && !frame.ambiguous} contactMode={mode} contactOffset={offset} onMalletCommands={dispatch} range={[0, 20]} disabledFrom={21} cameraInput={!suspended} onDown={onTouch} onUp={onRelease}/>
    <p className="rn-air-message" role="status">{running ? "พร้อมรับท่าตี" : "เปิดกล้องแล้วเล่นได้ทันที"} · เล่นได้ครบ 21 ลูก · {hits.length ? `รับโน้ตล่าสุด: ${bars[hits[hits.length - 1].bar].label} (ลูก ${hits[hits.length - 1].bar + 1})` : "ยังไม่มีโน้ตที่รับเข้า"}</p><div className="rn-air-bottom"><div className="rn-air-hands">{(["L", "R"] as const).map(hand => { const pose = frame.poses.find(p => p.hand === hand); return <span key={hand} data-hand={hand} data-tracked={!!pose}><i/>{hand === "L" ? "ซ้าย" : "ขวา"}<strong>{pose ? `${bars[pose.bar].label} · ${pose.armed ? "พร้อมตี" : "ยกมือ"}` : "รอมือ"}</strong></span>; })}</div><label className="rn-air-sensitivity">ความไว<input aria-label="ความไวการตีผ่านกล้อง" type="range" min="0" max="1" step=".1" value={sensitivity} onChange={e => setSensitivity(Number(e.target.value))}/></label></div>
    <p className="rn-air-footnote">เส้นเขียว = ยกเตรียม · เส้นทอง = ระดับตี · ประมวลผลภาพบนอุปกรณ์และไม่บันทึกวิดีโอ</p>
  </div>;
}
