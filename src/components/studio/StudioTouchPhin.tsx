"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { StringIndex } from "@/data/songs";
import { getPhinMidi, getPhinNoteName } from "@/lib/audio/phinTuning";
import {
  TOUCH_KEYS,
  TOUCH_PHIN_FRETS,
  TOUCH_SCALES,
  isMidiInTouchScale,
  type TouchScaleId,
} from "@/lib/studio/touchPhin";

type Props = {
  keyRoot: number;
  scale: TouchScaleId;
  scaleLock: boolean;
  bendRange: 1 | 2;
  onKeyRootChange: (root: number) => void;
  onScaleChange: (scale: TouchScaleId) => void;
  onScaleLockChange: (locked: boolean) => void;
  onBendRangeChange: (range: 1 | 2) => void;
  onGestureStart: (gestureId: string, string: StringIndex, fret: number) => void;
  onGesturePitch: (gestureId: string, cents: number) => void;
  onGestureEnd: (gestureId: string) => void;
};

type Gesture = {
  gestureId: string;
  string: StringIndex;
  initialFret: number;
  currentFret: number;
  bendCents: number;
  startY: number;
};

const VISUAL_STRINGS: StringIndex[] = [2, 1, 0];

export function StudioTouchPhin({
  keyRoot,
  scale,
  scaleLock,
  bendRange,
  onKeyRootChange,
  onScaleChange,
  onScaleLockChange,
  onBendRangeChange,
  onGestureStart,
  onGesturePitch,
  onGestureEnd,
}: Props) {
  const neckRef = useRef<HTMLDivElement>(null);
  const gesturesRef = useRef(new Map<number, Gesture>());
  const activeStringsRef = useRef(new Map<StringIndex, number>());
  const visualFrameRef = useRef<number | null>(null);
  const onGestureEndRef = useRef(onGestureEnd);
  const [activeGestures, setActiveGestures] = useState<Gesture[]>([]);
  const [readout, setReadout] = useState({ note: "E4 · สาย 1 เฟรต 0", bend: 0 });

  useEffect(() => {
    onGestureEndRef.current = onGestureEnd;
  }, [onGestureEnd]);

  const scheduleVisualUpdate = useCallback(() => {
    if (visualFrameRef.current !== null) return;
    visualFrameRef.current = window.requestAnimationFrame(() => {
      visualFrameRef.current = null;
      setActiveGestures(Array.from(gesturesRef.current.values()));
    });
  }, []);

  const allowed = useCallback((string: StringIndex, fret: number) => (
    !scaleLock || isMidiInTouchScale(getPhinMidi(string, fret), keyRoot, scale)
  ), [keyRoot, scale, scaleLock]);

  const finishGesture = useCallback((pointerId: number) => {
    const gesture = gesturesRef.current.get(pointerId);
    if (!gesture) return;
    gesturesRef.current.delete(pointerId);
    if (activeStringsRef.current.get(gesture.string) === pointerId) activeStringsRef.current.delete(gesture.string);
    onGestureEndRef.current(gesture.gestureId);
    scheduleVisualUpdate();
  }, [scheduleVisualUpdate]);

  useEffect(() => () => {
    if (visualFrameRef.current !== null) window.cancelAnimationFrame(visualFrameRef.current);
    const finish = onGestureEndRef.current;
    gesturesRef.current.forEach(gesture => finish(gesture.gestureId));
    gesturesRef.current.clear();
    activeStringsRef.current.clear();
  }, []);

  const startGesture = (event: ReactPointerEvent<HTMLButtonElement>, string: StringIndex, fret: number) => {
    if (!allowed(string, fret) || activeStringsRef.current.has(string)) return;
    event.preventDefault();
    const gestureId = `touch-${event.pointerId}-${Math.round(event.timeStamp)}`;
    const gesture: Gesture = { gestureId, string, initialFret: fret, currentFret: fret, bendCents: 0, startY: event.clientY };
    gesturesRef.current.set(event.pointerId, gesture);
    activeStringsRef.current.set(string, event.pointerId);
    event.currentTarget.setPointerCapture(event.pointerId);
    onGestureStart(gestureId, string, fret);
    setReadout({ note: `${getPhinNoteName(string, fret, true)} · สาย ${string + 1} เฟรต ${fret}`, bend: 0 });
    scheduleVisualUpdate();
  };

  const moveGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = gesturesRef.current.get(event.pointerId);
    const neck = neckRef.current;
    if (!gesture || !neck) return;
    event.preventDefault();
    const bounds = neck.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.999, (event.clientX - bounds.left) / Math.max(1, bounds.width)));
    const candidateFret = Math.min(TOUCH_PHIN_FRETS - 1, Math.floor(ratio * TOUCH_PHIN_FRETS));
    if (allowed(gesture.string, candidateFret)) gesture.currentFret = candidateFret;
    gesture.bendCents = Math.round(Math.max(-bendRange * 100, Math.min(bendRange * 100, (gesture.startY - event.clientY) * 4)));
    const totalCents = (gesture.currentFret - gesture.initialFret) * 100 + gesture.bendCents;
    onGesturePitch(gesture.gestureId, totalCents);
    setReadout({
      note: `${getPhinNoteName(gesture.string, gesture.currentFret, true)} · สาย ${gesture.string + 1} เฟรต ${gesture.currentFret}`,
      bend: gesture.bendCents,
    });
    scheduleVisualUpdate();
  };

  const activeAt = (string: StringIndex, fret: number) => activeGestures.some(gesture => gesture.string === string && gesture.currentFret === fret);

  return (
    <section className="studio-touch-phin" aria-label="พิณสัมผัส">
      <div className="studio-touch-toolbar">
        <div><strong>Touch Phin</strong><span>แตะโน้ต · ลากแนวนอนเพื่อ Slide · ลากขึ้นลงเพื่อดันสาย</span></div>
        <div className="studio-touch-settings">
          <label>คีย์<select value={keyRoot} onChange={event => onKeyRootChange(Number(event.target.value))}>{TOUCH_KEYS.map(key => <option key={key.value} value={key.value}>{key.label}</option>)}</select></label>
          <label>สเกล<select value={scale} onChange={event => onScaleChange(event.target.value as TouchScaleId)}>{TOUCH_SCALES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>ดันสาย<select value={bendRange} onChange={event => onBendRangeChange(Number(event.target.value) as 1 | 2)}><option value="1">±1 เสียงครึ่ง</option><option value="2">±2 เสียงครึ่ง</option></select></label>
          <label className="studio-scale-lock"><input type="checkbox" checked={scaleLock} onChange={event => onScaleLockChange(event.target.checked)} />Smart Scale</label>
        </div>
      </div>

      <div className="studio-touch-stage">
        <Image className="studio-touch-reference" src="/assets/phin/phin-touch-reference.jpg" alt="" aria-hidden="true" width={465} height={659} priority draggable={false} />
        <div className="studio-touch-neck" ref={neckRef}>
          <span className="studio-touch-middle-string" aria-hidden="true" />
          {Array.from({ length: TOUCH_PHIN_FRETS }, (_, fret) => <div className="studio-touch-fret" data-fret={fret} key={fret}>
            {VISUAL_STRINGS.map(string => {
              const midi = getPhinMidi(string, fret);
              const inScale = isMidiInTouchScale(midi, keyRoot, scale);
              const isRoot = midi % 12 === keyRoot;
              const disabled = scaleLock && !inScale;
              return <button
                key={string}
                type="button"
                aria-label={`${getPhinNoteName(string, fret, true)} สาย ${string + 1} เฟรต ${fret}`}
                aria-disabled={disabled}
                className={`studio-touch-note ${inScale ? "is-in-scale" : "is-out-scale"} ${isRoot ? "is-root" : ""} ${activeAt(string, fret) ? "is-active" : ""}`}
                onPointerDown={event => startGesture(event, string, fret)}
                onPointerMove={moveGesture}
                onPointerUp={event => finishGesture(event.pointerId)}
                onPointerCancel={event => finishGesture(event.pointerId)}
                onLostPointerCapture={event => finishGesture(event.pointerId)}
              ><span>{getPhinNoteName(string, fret)}</span></button>;
            })}
          </div>)}
        </div>
        <div className="studio-touch-readout" aria-live="polite"><span>กำลังเล่น</span><strong>{readout.note}</strong></div>
        <div className="studio-touch-bend"><span>Pitch Bend</span><strong>{readout.bend > 0 ? "+" : ""}{readout.bend} cents</strong></div>
      </div>
      <div className="studio-touch-legend"><span><i />โน้ตในสเกล</span><span><i className="is-root" />Root note</span><span>เล่นพร้อมกันได้หนึ่งนิ้วต่อสาย</span></div>
    </section>
  );
}
