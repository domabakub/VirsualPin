"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CameraIcon, ClockIcon, MusicIcon, PlayIcon, VolumeIcon } from "@/components/icons";
import { TouchPinControls } from "@/components/play/TouchPinControls";
import { VirtualPinCamera } from "@/components/play/VirtualPinCamera";
import type { StringIndex } from "@/data/songs";
import { usePinAudio } from "@/hooks/usePinAudio";
import { getPinNoteName } from "@/lib/audio/pinTuning";
import { createStudioMidi, createStudioWav } from "@/lib/studio/exporters";
import {
  BEATS_PER_BAR,
  STUDIO_BARS,
  STUDIO_BEATS,
  beatLabel,
  createStudioProject,
  quantizeNotes,
  readStudioProject,
  type QuantizeDivision,
  type StudioNote,
  type StudioProject,
} from "@/lib/studio/types";

const STORAGE_KEY = "virtual-pin-studio-v1";
type TransportState = "idle" | "count-in" | "recording" | "playing";
type InputMode = "touch" | "camera";

function fileSafeName(name: string) {
  const safe = name.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-");
  return safe || "virtual-pin-song";
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function notePosition(note: StudioNote) {
  return {
    left: `${note.beat / STUDIO_BEATS * 100}%`,
    width: `${Math.max(1.1, note.durationBeats / STUDIO_BEATS * 100)}%`,
    top: `${10 + note.string * 25}px`,
  };
}

export function StudioWorkspace() {
  const [project, setProject] = useState<StudioProject>(() => createStudioProject());
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "temporary">("loading");
  const [transport, setTransport] = useState<TransportState>("idle");
  const [playheadBeat, setPlayheadBeat] = useState(0);
  const [countIn, setCountIn] = useState<number | null>(null);
  const [metronome, setMetronome] = useState(true);
  const [frets, setFrets] = useState<[number, number, number]>([0, 0, 0]);
  const [activeString, setActiveString] = useState<StringIndex | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("touch");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notice, setNotice] = useState("พร้อมบันทึก · Count-in 1 ห้อง");
  const [exporting, setExporting] = useState<"wav" | "midi" | null>(null);
  const timersRef = useRef<number[]>([]);
  const transportStartedAtRef = useRef(0);
  const activeTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const sessionRef = useRef(0);
  const { unlock, pluck, click, percussion, status: audioStatus, error: audioError } = usePinAudio(project.pinMuted ? 0 : project.pinVolume);
  const secondsPerBeat = 60 / project.bpm;
  const selectedNote = project.notes.find(note => note.id === selectedNoteId) ?? null;

  const clearTransportTimers = useCallback(() => {
    timersRef.current.forEach(timer => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const stopTransport = useCallback((message?: string) => {
    sessionRef.current += 1;
    clearTransportTimers();
    setTransport("idle");
    setCountIn(null);
    if (message) setNotice(message);
  }, [clearTransportTimers]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = readStudioProject(window.localStorage.getItem(STORAGE_KEY));
      if (stored) {
        setProject(stored);
        setNotice(`เปิดโปรเจกต์เดิมแล้ว · ${stored.notes.length} โน้ต`);
      }
      setHydrated(true);
      setSaveState("saved");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...project, updatedAt: Date.now() }));
        setSaveState("saved");
      } catch {
        setSaveState("temporary");
      }
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [hydrated, project]);

  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) stopTransport("หยุดการเล่นแล้ว เพราะหน้าต่างถูกพัก");
    };
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => document.removeEventListener("visibilitychange", stopWhenHidden);
  }, [stopTransport]);

  useEffect(() => () => {
    clearTransportTimers();
    if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
  }, [clearTransportTimers]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, Math.max(0, delay));
    timersRef.current.push(timer);
  }, []);

  const startPlayhead = useCallback((mode: "playing" | "recording", session: number) => {
    const tick = () => {
      if (sessionRef.current !== session) return;
      const beat = (performance.now() - transportStartedAtRef.current) / 1_000 / secondsPerBeat;
      if (beat >= STUDIO_BEATS) {
        setPlayheadBeat(STUDIO_BEATS);
        stopTransport(mode === "recording" ? "บันทึกครบ 8 ห้องแล้ว" : "เล่นโปรเจกต์จบแล้ว");
        return;
      }
      setPlayheadBeat(beat);
      schedule(tick, 40);
    };
    tick();
  }, [schedule, secondsPerBeat, stopTransport]);

  const scheduleBacking = useCallback((session: number, includeMetronome: boolean) => {
    for (let beat = 0; beat < STUDIO_BEATS; beat += 1) {
      if (includeMetronome) schedule(() => {
        if (sessionRef.current === session) void click();
      }, beat * secondsPerBeat * 1_000);
    }
    if (project.drumEnabled && !project.drumMuted) {
      for (let step = 0; step < STUDIO_BEATS * 2; step += 1) {
        schedule(() => {
          if (sessionRef.current === session) void percussion(step, project.drumVolume);
        }, step * 0.5 * secondsPerBeat * 1_000);
      }
    }
  }, [click, percussion, project.drumEnabled, project.drumMuted, project.drumVolume, schedule, secondsPerBeat]);

  const playProject = useCallback(async () => {
    if (transport !== "idle") {
      stopTransport("หยุดที่ตำแหน่งปัจจุบัน");
      return;
    }
    if (!project.notes.length && !project.drumEnabled) {
      setNotice("ยังไม่มีโน้ตหรือ Drum Loop ให้เล่น");
      return;
    }
    if (!(await unlock())) return;
    stopTransport();
    const session = ++sessionRef.current;
    setPlayheadBeat(0);
    setTransport("playing");
    setNotice("กำลังเล่นโปรเจกต์");
    transportStartedAtRef.current = performance.now();
    if (!project.pinMuted) {
      project.notes.forEach(note => schedule(() => {
        if (sessionRef.current === session) void pluck(note.string, note.fret);
      }, note.beat * secondsPerBeat * 1_000));
    }
    scheduleBacking(session, metronome);
    startPlayhead("playing", session);
  }, [metronome, pluck, project.drumEnabled, project.notes, project.pinMuted, schedule, scheduleBacking, secondsPerBeat, startPlayhead, stopTransport, transport, unlock]);

  const startRecording = useCallback(async () => {
    if (transport === "recording" || transport === "count-in") {
      stopTransport("หยุดบันทึกแล้ว · เทคถูกเก็บบน Timeline");
      return;
    }
    if (transport === "playing") stopTransport();
    if (!(await unlock())) return;
    clearTransportTimers();
    const session = ++sessionRef.current;
    setTransport("count-in");
    setPlayheadBeat(0);
    setNotice(project.notes.length ? "Count-in · เทคใหม่จะแทนเทคพิณเดิม" : "Count-in · เตรียมเล่นพิณ");
    for (let count = 0; count < BEATS_PER_BAR; count += 1) {
      schedule(() => {
        if (sessionRef.current !== session) return;
        setCountIn(BEATS_PER_BAR - count);
        void click();
      }, count * secondsPerBeat * 1_000);
    }
    schedule(() => {
      if (sessionRef.current !== session) return;
      setProject(current => ({ ...current, notes: [], updatedAt: Date.now() }));
      setSelectedNoteId(null);
      setCountIn(null);
      setTransport("recording");
      setNotice("กำลังบันทึก · เล่นผ่านหน้าจอหรือกล้องได้เลย");
      transportStartedAtRef.current = performance.now();
      scheduleBacking(session, metronome);
      startPlayhead("recording", session);
    }, BEATS_PER_BAR * secondsPerBeat * 1_000);
  }, [clearTransportTimers, click, metronome, project.notes.length, schedule, scheduleBacking, secondsPerBeat, startPlayhead, stopTransport, transport, unlock]);

  const selectFret = useCallback((string: StringIndex, fret: number) => {
    setFrets(current => {
      const next: [number, number, number] = [...current];
      next[string] = fret;
      return next;
    });
  }, []);

  const pluckString = useCallback((string: StringIndex, fretOverride?: number) => {
    const detectedAt = performance.now();
    const fret = fretOverride ?? frets[string];
    if (fretOverride !== undefined) selectFret(string, fretOverride);
    setActiveString(string);
    if (activeTimerRef.current) window.clearTimeout(activeTimerRef.current);
    activeTimerRef.current = window.setTimeout(() => setActiveString(null), 180);

    if (transport === "recording") {
      const rawBeat = (detectedAt - transportStartedAtRef.current) / 1_000 / secondsPerBeat;
      if (rawBeat >= 0 && rawBeat < STUDIO_BEATS) {
        const note: StudioNote = {
          id: `${Math.round(detectedAt)}-${string}-${fret}`,
          beat: rawBeat,
          durationBeats: 0.5,
          string,
          fret,
          velocity: 96,
        };
        setProject(current => ({ ...current, notes: [...current.notes, note].sort((a, b) => a.beat - b.beat), updatedAt: Date.now() }));
        setSelectedNoteId(note.id);
      }
    }
    void pluck(string, fret);
  }, [frets, pluck, secondsPerBeat, selectFret, transport]);

  const applyQuantize = (division: Exclude<QuantizeDivision, "off">) => {
    setProject(current => ({ ...current, quantize: division, notes: quantizeNotes(current.notes, division), updatedAt: Date.now() }));
    setNotice(`จัดจังหวะทุกโน้ตเป็น ${division} แล้ว`);
  };

  const updateSelectedNote = (change: Partial<Pick<StudioNote, "string" | "fret" | "velocity">>) => {
    if (!selectedNoteId) return;
    setProject(current => ({
      ...current,
      notes: current.notes.map(note => note.id === selectedNoteId ? { ...note, ...change } : note),
      updatedAt: Date.now(),
    }));
  };

  const deleteSelectedNote = () => {
    if (!selectedNoteId) return;
    setProject(current => ({ ...current, notes: current.notes.filter(note => note.id !== selectedNoteId), updatedAt: Date.now() }));
    setSelectedNoteId(null);
    setNotice("ลบโน้ตที่เลือกแล้ว");
  };

  const newProject = () => {
    stopTransport();
    setProject(createStudioProject());
    setSelectedNoteId(null);
    setPlayheadBeat(0);
    setNotice("สร้างโปรเจกต์ใหม่ 8 ห้องแล้ว");
  };

  const exportProject = (kind: "wav" | "midi") => {
    if (exporting) return;
    if (!project.notes.length && !project.drumEnabled) {
      setNotice("บันทึกโน้ตหรือเพิ่ม Drum Loop ก่อน Export");
      return;
    }
    setExporting(kind);
    setNotice(kind === "wav" ? "กำลังเรนเดอร์ไฟล์ WAV…" : "กำลังสร้างไฟล์ MIDI…");
    window.setTimeout(() => {
      try {
        const baseName = fileSafeName(project.name);
        if (kind === "wav") download(createStudioWav(project), `${baseName}.wav`);
        else download(createStudioMidi(project), `${baseName}.mid`);
        setNotice(`Export ${kind.toUpperCase()} สำเร็จ · ตรวจไฟล์ในโฟลเดอร์ดาวน์โหลด`);
      } catch (reason) {
        console.error("Studio export failed", reason);
        setNotice(`Export ${kind.toUpperCase()} ไม่สำเร็จ กรุณาลองอีกครั้ง`);
      } finally {
        setExporting(null);
      }
    }, 80);
  };

  const noteSummary = useMemo(() => {
    if (!project.notes.length) return "ยังไม่มีเทคพิณ";
    const lastBeat = Math.max(...project.notes.map(note => note.beat));
    return `${project.notes.length} โน้ต · ถึงห้อง ${Math.min(STUDIO_BARS, Math.floor(lastBeat / BEATS_PER_BAR) + 1)}`;
  }, [project.notes]);

  return (
    <div className="studio-app">
      <header className="studio-topbar">
        <div className="studio-project-brand">
          <Link href="/" className="studio-back" aria-label="กลับหน้าหลัก">‹</Link>
          <div>
            <span>VIRTUAL PIN STUDIO</span>
            <input aria-label="ชื่อโปรเจกต์" value={project.name} maxLength={80} onChange={event => setProject(current => ({ ...current, name: event.target.value, updatedAt: Date.now() }))} />
          </div>
        </div>

        <div className="studio-transport" aria-label="ส่วนควบคุมการเล่น">
          <button type="button" className="studio-icon-button" aria-label="กลับจุดเริ่มต้น" onClick={() => { stopTransport(); setPlayheadBeat(0); }}>↤</button>
          <button type="button" className={`studio-icon-button ${transport === "playing" ? "is-active" : ""}`} aria-label={transport === "playing" ? "หยุด" : "เล่น"} onClick={() => { void playProject(); }}>
            {transport === "playing" ? "Ⅱ" : <PlayIcon aria-hidden="true" />}
          </button>
          <button type="button" className={`studio-record-button ${transport === "recording" || transport === "count-in" ? "is-recording" : ""}`} aria-label={transport === "recording" || transport === "count-in" ? "หยุดบันทึก" : "เริ่มบันทึก"} onClick={() => { void startRecording(); }}><span /></button>
          <div className="studio-display">
            <span><small>ตำแหน่ง</small><strong>{beatLabel(playheadBeat)}</strong></span>
            <label><small>BPM</small><input type="number" min="60" max="160" value={project.bpm} disabled={transport !== "idle"} onChange={event => setProject(current => ({ ...current, bpm: Math.max(60, Math.min(160, Number(event.target.value) || 96)), updatedAt: Date.now() }))} /></label>
            <span><small>ห้อง</small><strong>4/4</strong></span>
          </div>
          <button type="button" className={`studio-icon-button ${metronome ? "is-active" : ""}`} aria-pressed={metronome} aria-label="เปิดหรือปิดเมโทรนอม" onClick={() => setMetronome(value => !value)}><ClockIcon aria-hidden="true" /></button>
        </div>

        <div className="studio-export-actions">
          <button type="button" onClick={() => exportProject("midi")} disabled={Boolean(exporting)}>MIDI</button>
          <button type="button" className="studio-export-primary" onClick={() => exportProject("wav")} disabled={Boolean(exporting)}>{exporting === "wav" ? "กำลังสร้าง…" : "Export WAV"}</button>
        </div>
      </header>

      <main id="main-content" className="studio-main">
        <section className="studio-session-toolbar" aria-label="เครื่องมือโปรเจกต์">
          <div><button type="button" onClick={newProject}>โปรเจกต์ใหม่</button><span>8 ห้อง · Count-in 1 ห้อง</span></div>
          <div className="studio-save-state"><span className={saveState === "temporary" ? "is-warning" : ""} />{saveState === "loading" ? "กำลังเปิดโปรเจกต์" : saveState === "saving" ? "กำลังบันทึก…" : saveState === "temporary" ? "บันทึกถาวรไม่ได้" : "Auto-save แล้ว"}</div>
        </section>

        <div className="studio-arrangement">
          <aside className="studio-tracks" aria-label="รายการแทร็ก">
            <div className="studio-panel-title"><strong>แทร็ก</strong><span>2 แทร็ก</span></div>
            <article className="studio-track is-pin">
              <div className="studio-track-heading"><span className="studio-track-icon"><MusicIcon aria-hidden="true" /></span><div><strong>พิณหลัก</strong><small>{noteSummary}</small></div></div>
              <div className="studio-track-controls">
                <button type="button" aria-pressed={project.pinMuted} className={project.pinMuted ? "is-muted" : ""} onClick={() => setProject(current => ({ ...current, pinMuted: !current.pinMuted }))}>M</button>
                <label><VolumeIcon aria-hidden="true" /><input aria-label="ระดับเสียงพิณ" type="range" min="0" max="1" step="0.01" value={project.pinVolume} onChange={event => setProject(current => ({ ...current, pinVolume: Number(event.target.value) }))} /></label>
              </div>
            </article>
            <article className={`studio-track is-drum ${!project.drumEnabled ? "is-disabled" : ""}`}>
              <div className="studio-track-heading"><span className="studio-track-icon">●</span><div><strong>โปงลางบีต</strong><small>{project.drumEnabled ? "Isan Demo Beat · 8 ห้อง" : "ยังไม่ได้เพิ่ม Loop"}</small></div></div>
              {project.drumEnabled ? <div className="studio-track-controls">
                <button type="button" aria-pressed={project.drumMuted} className={project.drumMuted ? "is-muted" : ""} onClick={() => setProject(current => ({ ...current, drumMuted: !current.drumMuted }))}>M</button>
                <label><VolumeIcon aria-hidden="true" /><input aria-label="ระดับเสียง Drum Loop" type="range" min="0" max="1" step="0.01" value={project.drumVolume} onChange={event => setProject(current => ({ ...current, drumVolume: Number(event.target.value) }))} /></label>
              </div> : <button type="button" className="studio-add-loop" onClick={() => { setProject(current => ({ ...current, drumEnabled: true, updatedAt: Date.now() })); setNotice("เพิ่มโปงลางบีต 8 ห้องแล้ว"); }}>+ เพิ่ม Loop</button>}
            </article>
          </aside>

          <section className="studio-timeline-panel" aria-label="ไทม์ไลน์ 8 ห้อง">
            <div className="studio-timeline-toolbar">
              <span>Timeline</span>
              <div><button type="button" className={project.quantize === "1/8" ? "is-selected" : ""} onClick={() => applyQuantize("1/8")}>Quantize 1/8</button><button type="button" className={project.quantize === "1/16" ? "is-selected" : ""} onClick={() => applyQuantize("1/16")}>Quantize 1/16</button></div>
            </div>
            <div className="studio-ruler">{Array.from({ length: STUDIO_BARS }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <div className="studio-timeline">
              <div className="studio-lane studio-pin-lane">
                {!project.notes.length && <span className="studio-empty-lane">กด Record แล้วเล่นพิณ โน้ตจะปรากฏที่นี่</span>}
                {project.notes.map(note => <button key={note.id} type="button" aria-label={`${getPinNoteName(note.string, note.fret, true)} ที่ ${beatLabel(note.beat)}`} className={`studio-note-block string-${note.string} ${selectedNoteId === note.id ? "is-selected" : ""}`} style={notePosition(note)} onClick={() => setSelectedNoteId(note.id)}><span>{note.fret}</span></button>)}
              </div>
              <div className="studio-lane studio-drum-lane">
                {project.drumEnabled ? <div className="studio-drum-region"><strong>Isan Demo Beat</strong><span>{Array.from({ length: 16 }, (_, index) => <i key={index} className={index % 4 === 0 ? "is-accent" : ""} />)}</span></div> : <span className="studio-empty-lane">เพิ่ม Drum Loop จากแทร็กด้านซ้าย</span>}
              </div>
              <div className="studio-playhead" style={{ left: `${Math.min(100, playheadBeat / STUDIO_BEATS * 100)}%` }} />
            </div>
          </section>
        </div>

        <section className="studio-lower">
          <div className="studio-note-editor">
            <div className="studio-panel-title"><div><strong>Note Editor</strong><span>{selectedNote ? `${getPinNoteName(selectedNote.string, selectedNote.fret, true)} · ${beatLabel(selectedNote.beat)}` : "เลือกโน้ตบน Timeline เพื่อแก้ไข"}</span></div>{selectedNote && <button type="button" onClick={deleteSelectedNote}>ลบโน้ต</button>}</div>
            {selectedNote ? <div className="studio-editor-form">
              <label>สาย<select value={selectedNote.string} onChange={event => updateSelectedNote({ string: Number(event.target.value) as StringIndex })}><option value="0">สาย 1 · E4</option><option value="1">สาย 2 · A3</option><option value="2">สาย 3 · E3</option></select></label>
              <label>เฟรต<select value={selectedNote.fret} onChange={event => updateSelectedNote({ fret: Number(event.target.value) })}>{Array.from({ length: 7 }, (_, fret) => <option key={fret} value={fret}>{fret} · {getPinNoteName(selectedNote.string, fret, true)}</option>)}</select></label>
              <label>น้ำหนัก<output>{selectedNote.velocity}</output><input type="range" min="30" max="127" value={selectedNote.velocity} onChange={event => updateSelectedNote({ velocity: Number(event.target.value) })} /></label>
              <button type="button" onClick={() => { void pluck(selectedNote.string, selectedNote.fret); }}>ฟังโน้ตนี้</button>
            </div> : <div className="studio-editor-empty"><span>○</span><p>หลังบันทึก ให้เลือกกล่องโน้ตสีเขียวบน Timeline<br />จากนั้นเปลี่ยนสาย เฟรต หรือน้ำหนักการดีดได้</p></div>}
          </div>

          <div className="studio-instrument">
            <div className="studio-panel-title">
              <div><strong>Input</strong><span>{inputMode === "camera" ? "Hand Tracking" : "Touch Pin"} · เสียง {audioStatus === "ready" ? "พร้อม" : "ยังไม่เปิด"}</span></div>
              <div className="studio-input-tabs"><button type="button" className={inputMode === "touch" ? "is-selected" : ""} onClick={() => setInputMode("touch")}>สัมผัส</button><button type="button" className={inputMode === "camera" ? "is-selected" : ""} onClick={() => setInputMode("camera")}><CameraIcon aria-hidden="true" /> กล้อง</button></div>
            </div>
            <div className="studio-instrument-body">
              {inputMode === "touch" ? <TouchPinControls frets={frets} activeString={activeString} onSelectFret={selectFret} onPluck={pluckString} /> : <VirtualPinCamera frets={frets} activeString={activeString} onSelectFret={selectFret} onPluck={pluckString} onUnlockAudio={() => { void unlock(); }} />}
            </div>
          </div>
        </section>

        <footer className="studio-status" aria-live="polite">
          <span className={`studio-status-dot ${transport === "recording" ? "is-recording" : ""}`} />
          <strong>{countIn ? `เตรียมตัว ${countIn}` : notice}</strong>
          <span>{audioError ?? `Audio: ${audioStatus} · ${project.notes.length} โน้ต`}</span>
        </footer>
      </main>
    </div>
  );
}
