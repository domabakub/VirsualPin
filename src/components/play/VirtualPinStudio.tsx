"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClockIcon, PlayIcon, VolumeIcon } from "@/components/icons";
import { AppHeader } from "@/components/navigation/AppHeader";
import type { Song, StringIndex } from "@/data/songs";
import { usePinAudio } from "@/hooks/usePinAudio";
import { readPractice, savePractice, usePracticeData } from "@/hooks/usePracticeData";
import { advancePractice, getPracticeAccuracy } from "@/lib/practice";
import { getPinNoteName } from "@/lib/audio/pinTuning";
import { VirtualPinCamera } from "./VirtualPinCamera";
import { TouchPinControls } from "./TouchPinControls";

export function VirtualPinStudio({ song, freePlay = false }: { song: Song; freePlay?: boolean }) {
  const { records, preferences, ready, storageTemporary } = usePracticeData();
  const record = records[song.slug]?.total === song.notes.length ? records[song.slug] : undefined;
  const step = record?.step ?? 0;
  const mistakes = record?.mistakes ?? 0;
  const [frets, setFrets] = useState<[number, number, number]>([0, 0, 0]);
  const [activeString, setActiveString] = useState<StringIndex | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [restartPending, setRestartPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [lastNote, setLastNote] = useState("");
  const [cameraLive, setCameraLive] = useState(false);
  const activeTimer = useRef<number | null>(null);
  const runningRef = useRef(false);
  const operationRef = useRef(0);
  const pluckingRef = useRef(false);
  const restartRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const { unlock, pluck, click, status: audioStatus, error: audioError } = usePinAudio(preferences.volume);
  const expected = !freePlay ? song.notes[step] : undefined;
  const complete = !freePlay && step >= song.notes.length;
  const accuracy = getPracticeAccuracy(step, mistakes);

  const selectFret = useCallback((string: StringIndex, fret: number) => {
    setFrets(current => {
      if (current[string] === fret) return current;
      const next: [number, number, number] = [...current];
      next[string] = fret;
      return next;
    });
  }, []);

  const pausePractice = useCallback(() => {
    operationRef.current += 1;
    runningRef.current = false;
    setPracticing(false);
    setMetronome(false);
    setStarting(false);
  }, []);

  const pluckString = useCallback(async (string: StringIndex, fretOverride?: number) => {
    if (pluckingRef.current) return;
    pluckingRef.current = true;
    const operation = operationRef.current;
    const playedFret = fretOverride ?? frets[string];
    try {
      const played = await pluck(string, playedFret);
      if (operation !== operationRef.current) return;
      if (!played) { setFeedback("เสียงยังไม่พร้อม · กดทดสอบเสียงแล้วลองอีกครั้ง"); return; }
      if (fretOverride !== undefined) selectFret(string, fretOverride);
      setActiveString(string);
      setLastNote(`${getPinNoteName(string, playedFret, true)} · สาย ${string + 1} เฟรต ${playedFret}`);
      if (activeTimer.current) window.clearTimeout(activeTimer.current);
      activeTimer.current = window.setTimeout(() => setActiveString(null), 220);
      if (freePlay || !runningRef.current) {
        setFeedback(freePlay ? "เล่นอิสระ · ไม่มีการให้คะแนน" : "กำลังลองเสียง · กดเริ่มหรือฝึกต่อเพื่อเก็บคะแนน");
        return;
      }
      // Read after audio resolves so queued gestures never score against a stale note.
      const current = readPractice(song.slug, song.notes.length) ?? { step: 0, mistakes: 0, total: song.notes.length, updatedAt: Date.now() };
      const target = song.notes[current.step];
      if (!target) return;
      const correct = target.string === string && target.fret === playedFret;
      const next = advancePractice(current, correct);
      savePractice(song.slug, next);
      if (next.step === song.notes.length) {
        pausePractice();
        setFeedback("ฝึกครบท่อนแล้ว ดูสรุปผลด้านล่างได้เลย");
      } else {
        const hint = correct ? song.notes[next.step] : target;
        setFeedback(`${correct ? "ถูกต้อง · ถัดไป" : "ลองอีกครั้ง"} ${hint.label} สาย ${hint.string + 1} เฟรต ${hint.fret}`);
      }
    } finally { pluckingRef.current = false; }
  }, [freePlay, frets, pausePractice, pluck, selectFret, song]);

  const startPractice = async () => {
    if (starting || complete) return;
    const operation = ++operationRef.current;
    setStarting(true);
    const audioReady = await unlock();
    if (operation !== operationRef.current) return;
    setStarting(false);
    if (!audioReady) { setFeedback("ยังเริ่มฝึกไม่ได้ · ลองทดสอบเสียงอีกครั้ง"); return; }
    runningRef.current = true;
    setPracticing(true);
    setFeedback("เริ่มได้ · เลือกเฟรตตามโน้ตด้านบน แล้วกดดีดสาย");
  };

  const testAudio = async () => {
    const played = await pluck(0, 0);
    setFeedback(played ? "เสียงพร้อม · ทดสอบสายเปล่า E4 แล้ว" : "เปิดเสียงไม่ได้ · ตรวจระดับเสียงหรือการปิดเสียงของอุปกรณ์");
  };

  const resetPractice = () => {
    pausePractice();
    savePractice(song.slug, { step: 0, mistakes: 0, total: song.notes.length, updatedAt: Date.now() });
    setFrets([0, 0, 0]);
    setRestartPending(false);
    setFeedback("เริ่มรอบใหม่แล้ว · กดเริ่มฝึกเมื่อพร้อม");
    requestAnimationFrame(() => startRef.current?.focus());
  };

  useEffect(() => { if (restartPending) cancelRef.current?.focus(); }, [restartPending]);
  useEffect(() => { if (complete && feedback.startsWith("ฝึกครบท่อน")) resultRef.current?.focus(); }, [complete, feedback]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (!preferences.shortcuts || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
        (target instanceof HTMLElement && (target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(target.tagName)))) return;
      if (["1", "2", "3"].includes(event.key)) { event.preventDefault(); void pluckString((Number(event.key) - 1) as StringIndex); }
    };
    window.addEventListener("keydown", onKeyDown);
    const onVisibility = () => { if (document.hidden) pausePractice(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("visibilitychange", onVisibility); };
  }, [pausePractice, pluckString, preferences.shortcuts]);

  useEffect(() => {
    if (!metronome) return;
    void click();
    const interval = window.setInterval(() => { void click(); }, 60_000 / song.bpm);
    return () => window.clearInterval(interval);
  }, [click, metronome, song.bpm]);

  useEffect(() => () => {
    operationRef.current += 1;
    runningRef.current = false;
    if (activeTimer.current) window.clearTimeout(activeTimer.current);
  }, []);

  return (
    <div className="practice-page">
      <AppHeader studio />
      <main id="main-content" tabIndex={-1} className="practice-main">
        <div className="practice-heading">
          <h1>{freePlay ? "เล่นพิณอิสระ" : song.title}</h1>
          <span className="practice-badge">{freePlay ? "FREE PLAY · ไม่เก็บคะแนน" : "PRACTICE · แบบฝึกตัวอย่าง"}</span>
        </div>
        <div className="practice-layout">
          <section className="ui-panel current-note-panel practice-current" aria-label={freePlay ? "โน้ตที่เล่นล่าสุด" : "โน้ตปัจจุบัน"}>
            <div className="current-note-top">
              <div>
                <p className="note-eyebrow">{freePlay ? "โน้ตที่เล่นล่าสุด" : complete ? "ฝึกสำเร็จ" : "โน้ตปัจจุบัน"}</p>
                <p className="current-note">{freePlay ? lastNote.split(" · ")[0] || "ลองดีดสาย" : complete ? "ครบทุกโน้ต ✓" : expected?.label}</p>
                {!freePlay && expected && <p className="note-details">สาย {expected.string + 1} · เฟรต {expected.fret} <span className="ml-2">{step}/{song.notes.length}</span></p>}
              </div>
              {!freePlay && !complete && <button ref={startRef} type="button" disabled={!ready || starting} onClick={practicing ? () => { pausePractice(); setFeedback("พักแล้ว · กดฝึกต่อเมื่อต้องการกลับมาเล่น"); } : () => { void startPractice(); }} className="ui-button ui-primary">{!practicing && <PlayIcon className="size-4" />}{starting ? "กำลังเปิดเสียง…" : practicing ? "พักการฝึก" : record && (step > 0 || mistakes > 0) ? "ฝึกต่อ" : "เริ่มฝึก"}</button>}
            </div>
            {!freePlay && <progress className="mt-3" value={step} max={song.notes.length} aria-label="ความคืบหน้าการฝึก" />}
          </section>
          <section aria-label="พื้นที่เล่นพิณ" className="practice-playing">
            <div className={`ui-panel touch-panel ${cameraLive ? "order-2" : "order-1"}`}>
              <TouchPinControls frets={frets} activeString={activeString} expected={practicing ? expected : undefined} onSelectFret={selectFret} onPluck={pluckString} />
              <p role="status" aria-atomic="true" className="mt-3 min-h-12 text-sm leading-6 text-slate-700">{feedback || (freePlay ? "เลือกเฟรตแล้วดีดได้เลย ไม่ต้องใช้กล้อง" : complete ? "ฝึกครบแล้ว · ดูสรุปผลหรือเริ่มรอบใหม่ได้ด้านล่าง" : step > 0 || mistakes > 0 ? "พบผลฝึกเดิม · กดฝึกต่อเพื่อเล่นจากโน้ตที่ค้างไว้" : "ลองเสียงได้ทันที หรือกดเริ่มฝึกเพื่อเก็บคะแนน")}</p>
              {freePlay && lastNote && <p className="text-sm font-medium text-blue-800">{lastNote}</p>}
            </div>
            <VirtualPinCamera frets={frets} activeString={activeString} expected={practicing ? expected : undefined} onSelectFret={selectFret} onPluck={pluckString} onUnlockAudio={() => { void unlock(); }} defaultFacing={preferences.facing} onLiveChange={setCameraLive} className={cameraLive ? "order-1" : "order-2"} />
          </section>
          <aside aria-label="ผลการฝึกและเครื่องมือ" className="practice-sidebar">
            {!freePlay && !complete && <section className="ui-panel practice-next"><h2 className="text-lg font-semibold">โน้ตถัดไป</h2><ol className="next-notes">{song.notes.slice(step + 1, step + 4).map((note, index) => <li key={index} className="min-w-0"><p className="text-lg font-semibold">{note.label}</p><p className="text-xs text-slate-600">สาย {note.string + 1}<br />เฟรต {note.fret}</p></li>)}</ol>{step === song.notes.length - 1 && <p className="mt-2 text-sm text-slate-600">เหลือโน้ตสุดท้ายแล้ว</p>}</section>}
            <section className="ui-panel practice-audio">
              <h2 className="text-lg font-semibold">เสียงและจังหวะ</h2>
              <div className="mt-3 grid gap-2">
                <button type="button" onClick={() => { void testAudio(); }} className="ui-button"><VolumeIcon className="size-4" />{audioStatus === "ready" ? "ทดสอบเสียง · พร้อม" : "เปิดและทดสอบเสียง"}</button>
                <button type="button" aria-pressed={metronome} onClick={async () => { if (metronome) { setMetronome(false); return; } const operation = operationRef.current; if (await unlock() && operation === operationRef.current) setMetronome(true); }} className="ui-button"><ClockIcon className="size-4" />เมโทรนอม {metronome ? "เปิด" : "ปิด"} · {song.bpm} BPM</button>
                {audioError && <p role="alert" className="text-sm text-red-800">{audioError}</p>}
                {freePlay && <Link href="/studio" className="ui-button ui-primary">เปิด Studio Mode</Link>}
                <Link href="/settings" className="ui-button">ตั้งค่าเสียงและกล้อง</Link>
              </div>
            </section>
            {!freePlay && <section className="ui-panel practice-results">
              <h2 ref={resultRef} tabIndex={-1} className="text-lg font-semibold">{complete ? "สรุปการฝึก" : "ผลการฝึกรอบนี้"}</h2>
              <dl className="practice-stats">
                <div><dt>สายและเฟรตถูกต้อง</dt><dd>{accuracy === null ? "—" : `${accuracy}%`}</dd></div>
                <div><dt>คะแนน</dt><dd>{step * 100}</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-5 text-slate-600">{complete ? `เล่นครบ ${song.notes.length} โน้ต · ลองผิด ${mistakes} ครั้ง` : "ให้คะแนนจากสายและเฟรต ยังไม่ประเมินจังหวะ"}</p>
              <p role="status" className={`mt-2 text-xs leading-5 ${storageTemporary ? "text-red-800" : "text-slate-600"}`}>{!ready ? "กำลังอ่านผลฝึก…" : storageTemporary ? "บันทึกถาวรไม่ได้ ผลจะหายเมื่อปิดหรือโหลดหน้าใหม่" : "บันทึกในเบราว์เซอร์นี้ · ไม่ซิงก์ข้ามเครื่อง"}</p>
              {complete && <Link href="/songs" className="ui-button ui-primary mt-4 w-full">เลือกแบบฝึกถัดไป</Link>}
              {(record || complete) && <button ref={restartRef} type="button" className="ui-button mt-3 w-full" onClick={() => { pausePractice(); setRestartPending(true); }}>เริ่มรอบใหม่</button>}
              {restartPending && <div role="group" aria-label="ยืนยันเริ่มรอบใหม่" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3" onKeyDown={event => { if (event.key === "Escape") { setRestartPending(false); restartRef.current?.focus(); } }}>
                <p className="text-sm text-amber-950">ล้างคะแนนรอบนี้และเริ่มจากโน้ตแรก?</p>
                <div className="mt-3 flex flex-wrap gap-2"><button ref={cancelRef} type="button" className="ui-button" onClick={() => { setRestartPending(false); restartRef.current?.focus(); }}>เก็บผลเดิม</button><button type="button" className="ui-button ui-primary" onClick={resetPractice}>ยืนยันเริ่มใหม่</button></div>
              </div>}
            </section>}
            <details className="ui-panel practice-help text-sm leading-6 text-slate-700">
              <summary className="min-h-11 cursor-pointer font-semibold text-[#102544]">วิธีเล่นและข้อมูลแบบฝึก</summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5"><li>เลือกเฟรต 0–6 ของสายที่ต้องการ แล้วกด “ดีด”</li><li>โหมดเพลง: กดเริ่ม แล้วเล่นตามสายและเฟรตในกล่องโน้ตปัจจุบัน</li><li>เปิดกล้องเมื่อต้องการใช้มือจริง หรือใช้ปุ่มหน้าจอต่อได้เสมอ</li></ol>
              <p className="mt-3">{preferences.shortcuts ? "ปุ่มลัดเปิดอยู่: 1 / 2 / 3 สำหรับดีดแต่ละสาย" : "เปิดปุ่มลัด 1 / 2 / 3 ได้ที่หน้าตั้งค่า"}</p>
              {!freePlay && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-950">แบบฝึกนี้ใช้ทดสอบระบบ ยังไม่ใช่ทำนองต้นฉบับที่ตรวจสอบแล้ว ใช้การตั้งสาย E4 / A3 / E3</p>}
            </details>
          </aside>
        </div>
      </main>
    </div>
  );
}
