"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, ClockIcon, HandIcon, PlayIcon, VolumeIcon } from "@/components/icons";
import { AppHeader } from "@/components/navigation/AppHeader";
import type { Song, StringIndex } from "@/data/songs";
import { usePhinAudio } from "@/hooks/usePhinAudio";
import { useQuickTakeRecorder } from "@/hooks/useQuickTakeRecorder";
import { readPractice, savePractice, usePracticeData } from "@/hooks/usePracticeData";
import { advancePractice, getPracticeAccuracy } from "@/lib/practice";
import { getPhinNoteName } from "@/lib/audio/phinTuning";
import { formatTakeDuration, type TakeInputSource } from "@/lib/takes/types";
import { VirtualPhinCamera } from "./VirtualPhinCamera";
import { TouchPhinControls } from "./TouchPhinControls";

type InputMode = "touch" | "ar";

function InputModeGateway({ onSelect }: { onSelect: (mode: InputMode) => void }) {
  return (
    <section className="play-mode-gateway" aria-labelledby="play-mode-title">
      <div className="play-mode-gateway-heading">
        <div>
          <p className="note-eyebrow">INPUT MODE</p>
          <h2 id="play-mode-title">เลือกวิธีเล่นของคุณ.</h2>
        </div>
        <p>เลือกครั้งแรก แล้วสลับได้จากปุ่มเดียวในพื้นที่เล่น</p>
      </div>
      <div className="play-mode-gateway-options">
        <button type="button" onClick={() => onSelect("touch")}>
          <span className="play-mode-gateway-top"><HandIcon /><b>01</b></span>
          <span className="play-mode-gateway-copy"><strong>แตะเล่นบนหน้าจอ</strong><small>จิ้มโน้ตบนคอพิณทั้ง 21 ตำแหน่ง เสียงออกทันที เหมาะกับการเริ่มเล่นเร็ว ๆ</small></span>
          <span className="play-mode-gateway-action">เลือก Touch <i aria-hidden="true">→</i></span>
        </button>
        <button type="button" onClick={() => onSelect("ar")}>
          <span className="play-mode-gateway-top"><CameraIcon /><b>02</b></span>
          <span className="play-mode-gateway-copy"><strong>เล่นด้วย AR กล้อง</strong><small>ใช้มือจริงจับเฟรตและดีดสาย ภาพประมวลผลบนอุปกรณ์และไม่ถูกบันทึก</small></span>
          <span className="play-mode-gateway-action">เลือก AR <i aria-hidden="true">→</i></span>
        </button>
      </div>
    </section>
  );
}

export function VirtualPhinStudio({ song, freePlay = false, backHref, backLabel, practiceSource = "sample" }: { song: Song; freePlay?: boolean; backHref?: string; backLabel?: string; practiceSource?: "sample" | "take" }) {
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
  const [inputMode, setInputMode] = useState<InputMode | null>(null);
  const activeTimer = useRef<number | null>(null);
  const runningRef = useRef(false);
  const operationRef = useRef(0);
  const pluckingRef = useRef(false);
  const restartRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const { unlock, pluck, click, status: audioStatus, error: audioError } = usePhinAudio(preferences.volume);
  const takeRecorder = useQuickTakeRecorder(metronome ? song.bpm : undefined);
  const captureTakeNote = takeRecorder.captureNote;
  const stopTakeRecording = takeRecorder.stop;
  const takeRecorderStatus = takeRecorder.status;
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

  const pluckString = useCallback(async (string: StringIndex, fretOverride?: number, source: TakeInputSource = "keyboard") => {
    if (pluckingRef.current) return;
    pluckingRef.current = true;
    const operation = operationRef.current;
    const playedFret = fretOverride ?? frets[string];
    if (freePlay) captureTakeNote(string, playedFret, source);
    try {
      const played = await pluck(string, playedFret);
      if (operation !== operationRef.current) return;
      if (!played) { setFeedback("เสียงยังไม่พร้อม · กดทดสอบเสียงแล้วลองอีกครั้ง"); return; }
      if (fretOverride !== undefined) selectFret(string, fretOverride);
      setActiveString(string);
      setLastNote(`${getPhinNoteName(string, playedFret, true)} · สาย ${string + 1} เฟรต ${playedFret}`);
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
  }, [captureTakeNote, freePlay, frets, pausePractice, pluck, selectFret, song]);

  const pluckTouch = useCallback((string: StringIndex, fret?: number) => pluckString(string, fret, "touch"), [pluckString]);
  const pluckCamera = useCallback((string: StringIndex, fret?: number) => pluckString(string, fret, "camera"), [pluckString]);

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
    const onVisibility = () => {
      if (!document.hidden) return;
      pausePractice();
      if (freePlay && (takeRecorderStatus === "armed" || takeRecorderStatus === "recording")) void stopTakeRecording();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.removeEventListener("keydown", onKeyDown); document.removeEventListener("visibilitychange", onVisibility); };
  }, [freePlay, pausePractice, pluckString, preferences.shortcuts, stopTakeRecording, takeRecorderStatus]);

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

  const modeSwitch = inputMode && <button type="button" className="play-mode-switch" onClick={() => setInputMode(inputMode === "touch" ? "ar" : "touch")}>
    {inputMode === "touch" ? <CameraIcon /> : <HandIcon />}
    <span>สลับเป็น {inputMode === "touch" ? "AR" : "Touch"}</span>
  </button>;

  return (
    <div className="practice-page">
      <AppHeader studio studioBackHref={backHref} studioBackLabel={backLabel} />
      <main id="main-content" tabIndex={-1} className="practice-main">
        <div className="practice-heading">
          <h1>{freePlay ? "เล่นพิณอิสระ" : song.title}</h1>
          <span className="practice-badge">{freePlay ? "FREE PLAY · ไม่เก็บคะแนน" : practiceSource === "take" ? "PRACTICE · จากบันทึกของฉัน" : "PRACTICE · แบบฝึกตัวอย่าง"}</span>
        </div>
        {inputMode === null ? <InputModeGateway onSelect={setInputMode} /> : <div className={`practice-layout ${inputMode === "ar" ? "is-camera-mode" : ""}`}>
          <section className="ui-panel current-note-panel practice-current" aria-label={freePlay ? "โน้ตที่เล่นล่าสุด" : "โน้ตปัจจุบัน"}>
            <div className="current-note-top">
              <div>
                <p className="note-eyebrow">{freePlay ? "โน้ตที่เล่นล่าสุด" : complete ? "ฝึกสำเร็จ" : "โน้ตปัจจุบัน"}</p>
                <p className="current-note">{freePlay ? lastNote.split(" · ")[0] || "ลองเล่น" : complete ? "ครบทุกโน้ต ✓" : expected?.label}</p>
                {!freePlay && expected && <p className="note-details">สาย {expected.string + 1} · เฟรต {expected.fret} <span className="ml-2">{step}/{song.notes.length}</span></p>}
              </div>
              {!freePlay && !complete && <button ref={startRef} type="button" disabled={!ready || starting} onClick={practicing ? () => { pausePractice(); setFeedback("พักแล้ว · กดฝึกต่อเมื่อต้องการกลับมาเล่น"); } : () => { void startPractice(); }} className="ui-button ui-primary">{!practicing && <PlayIcon className="size-4" />}{starting ? "กำลังเปิดเสียง…" : practicing ? "พักการฝึก" : record && (step > 0 || mistakes > 0) ? "ฝึกต่อ" : "เริ่มฝึก"}</button>}
              {freePlay && <div className="quick-take-actions">
                {takeRecorder.status === "idle" ? <button type="button" className="ui-button ui-primary" onClick={takeRecorder.arm}><span className="quick-take-record-dot" />บันทึกไว้ฝึก</button> : <button type="button" className="ui-button ui-primary" disabled={takeRecorder.status === "saving"} onClick={() => { void takeRecorder.stop().then(take => { setFeedback(take ? `เก็บแล้ว · ${take.notes.length} โน้ต` : "ยังไม่มีโน้ต จึงไม่ได้สร้างบันทึก"); }); }}>{takeRecorder.status === "saving" ? "กำลังเก็บ…" : "หยุดและเก็บ"}</button>}
                {(takeRecorder.status === "armed" || takeRecorder.status === "recording") && <button type="button" className="quick-take-cancel" onClick={takeRecorder.cancel}>ยกเลิก</button>}
              </div>}
            </div>
            {freePlay && <p className="quick-take-status" role="status">{takeRecorder.status === "armed" ? "รอคุณเล่นโน้ตแรก…" : takeRecorder.status === "recording" ? `กำลังบันทึก · ${takeRecorder.noteCount} โน้ต · ${formatTakeDuration(takeRecorder.elapsedMs)}` : takeRecorder.lastSavedTake ? `บันทึกล่าสุด · ${takeRecorder.lastSavedTake.notes.length} โน้ต · ${formatTakeDuration(takeRecorder.lastSavedTake.durationMs)}` : "กดบันทึก แล้วเล่นตามปกติ ระบบจะเริ่มจับเวลาที่โน้ตแรก"}</p>}
            {freePlay && takeRecorder.lastSavedTake && <div className="quick-take-result"><Link href={`/takes/${takeRecorder.lastSavedTake.id}`} className="ui-button ui-primary">ฟังและดูโน้ต</Link><Link href={`/takes/${takeRecorder.lastSavedTake.id}/practice`} className="ui-button">ฝึกจากที่เล่นเมื่อกี้</Link></div>}
            {!freePlay && <progress className="mt-3" value={step} max={song.notes.length} aria-label="ความคืบหน้าการฝึก" />}
          </section>
          <section aria-label="พื้นที่เล่นพิณ" className="practice-playing">
            <div className="play-mode-stage">
              {inputMode === "touch" ? <><div className="play-mode-toolbar">{modeSwitch}<div className="play-mode-toolbar-copy"><h2>เล่นด้วย Touch</h2><p>แตะโน้ตบนหน้าจอเพื่อเล่นทันที</p></div></div><div className="ui-panel touch-panel">
                <TouchPhinControls frets={frets} activeString={activeString} expected={practicing ? expected : undefined} onSelectFret={selectFret} onPluck={pluckTouch} />
                <p role="status" aria-atomic="true" className="mt-3 min-h-12 text-sm leading-6 text-slate-700">{feedback || (freePlay ? "แตะโน้ตตำแหน่งใดก็ได้บนคอพิณ เสียงจะเล่นทันที" : complete ? "ฝึกครบแล้ว · ดูสรุปผลหรือเริ่มรอบใหม่ได้ด้านล่าง" : step > 0 || mistakes > 0 ? "พบผลฝึกเดิม · กดฝึกต่อเพื่อเล่นจากโน้ตที่ค้างไว้" : "กดเริ่มฝึก แล้วแตะโน้ตที่เรืองแสงบนคอพิณ")}</p>
                {freePlay && lastNote && <p className="text-sm font-medium text-blue-800">{lastNote}</p>}
              </div></> : <VirtualPhinCamera frets={frets} activeString={activeString} expected={practicing ? expected : undefined} onSelectFret={selectFret} onPluck={pluckCamera} onUnlockAudio={() => { void unlock(); }} defaultFacing={preferences.facing} standaloneMode modeSwitch={modeSwitch} />}
            </div>
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
                {freePlay && <Link href="/takes" className="ui-button">บันทึกของฉัน</Link>}
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
          </aside>
            <details className="ui-panel practice-help text-sm leading-6 text-slate-700">
              <summary className="min-h-11 cursor-pointer font-semibold text-[#102544]">วิธีเล่นและข้อมูลแบบฝึก</summary>
              {freePlay ? <ol className="mt-3 list-decimal space-y-2 pl-5"><li>เลือก “Touch” แล้วจิ้มตำแหน่งบนคอพิณเพื่อเล่นทันที</li><li>เลือก “AR” แล้วกดเปิดกล้องเมื่อต้องการใช้มือจริง</li><li>ใช้ปุ่มซ้ายบนของพื้นที่เล่นเพื่อสลับโหมด โน้ตจะต่อกันใน Take เดียว</li></ol> : <ol className="mt-3 list-decimal space-y-2 pl-5"><li>กดเริ่มฝึก แล้วแตะโน้ตที่เรืองแสงบนคอพิณตามลำดับ</li><li>ในโหมด AR ให้กดเปิดกล้องและเล่นสายกับเฟรตตามโน้ตปัจจุบัน</li><li>ใช้ปุ่มซ้ายบนของพื้นที่เล่นเพื่อสลับ Touch และ AR ได้ตลอด</li></ol>}
              <p className="mt-3">{preferences.shortcuts ? "ปุ่มลัดเปิดอยู่: 1 / 2 / 3 สำหรับดีดแต่ละสาย" : "เปิดปุ่มลัด 1 / 2 / 3 ได้ที่หน้าตั้งค่า"}</p>
              {!freePlay && practiceSource === "sample" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-amber-950">แบบฝึกนี้ใช้ทดสอบระบบ ยังไม่ใช่ทำนองต้นฉบับที่ตรวจสอบแล้ว ใช้การตั้งสาย E4 / A3 / E3</p>}
            </details>
        </div>}
      </main>
    </div>
  );
}
