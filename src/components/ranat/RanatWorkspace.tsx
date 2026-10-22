"use client";
import Link from "next/link";
import { InstrumentNav } from "@/components/navigation/InstrumentNav";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { articulations, bars, NUMBER_KEYS, ranatKeyboardIndex, type Articulation, type RanatEvent, type RanatTake } from "@/instruments/ranat/model";
import { useRanat } from "@/instruments/ranat/useRanat";
import { RanatPlayStage } from "./RanatPlayStage";
import { renderRanatWave } from "@/instruments/ranat/export";
const RanatCamera = dynamic(() => import("./RanatCamera").then(m => m.RanatCamera), { ssr: false, loading: () => <div className="rn-camera-loading">กำลังเตรียมโหมดกล้อง…</div> });
const RanatArCamera = dynamic(() => import("./RanatArCamera").then(m => m.RanatArCamera), { ssr: false, loading: () => <div className="rn-camera-loading">กำลังเตรียมโหมด AR…</div> });

const demos = [0, 2, 4, 5, 4, 2, 1, 0, 2, 4, 6, 5, 4, 2, 1, 0];
function downloadTake(take: RanatTake) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(take, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = `ranat-${take.id}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function RanatWorkspace() {
  const audio = useRanat();
  const { begin, release, endPattern } = audio;
  const [mode, setMode] = useState<Articulation>("direct"), [offset, setOffset] = useState(7);
  const [input, setInput] = useState<"touch" | "camera" | "ar">("touch");
  const [cameraPause, setCameraPause] = useState(0);
  const [zoom, setZoom] = useState(false), [start, setStart] = useState(7), [help, setHelp] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null), [exportError, setExportError] = useState("");
  const keys = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const modeInfo = articulations.find(a => a.id === mode)!;
  const paired = mode === "pair" || mode === "kro", maxBase = paired ? 20 - offset : 20;
  const keyStart = Math.min(start, Math.max(0, maxBase - 7));
  const reset = useCallback(() => { endPattern(); keys.current.clear(); }, [endPattern]);
  const trigger = useCallback((bar: number, owner: string) => { void begin(bar, mode, offset, owner, "touch", bar % 2 ? "R" : "L"); }, [begin, mode, offset]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;
      const index = ranatKeyboardIndex(e.code, e.key);
      if (index < 0 || ((zoom || input !== "touch") && index >= 8) || keyStart + index > maxBase || e.repeat || keys.current.has(e.code)) return;
      e.preventDefault(); keys.current.add(e.code); void begin(keyStart + index, mode, offset, e.code, "keyboard", index % 2 ? "R" : "L");
    };
    const up = (e: KeyboardEvent) => { if (keys.current.delete(e.code)) release(e.code); };
    const clear = () => { for (const code of keys.current) release(code); keys.current.clear(); };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", hidden);
    return () => { clear(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", hidden); };
  }, [begin, release, keyStart, mode, offset, zoom, input, maxBase]);
  async function demo() {
    reset(); const events: RanatEvent[] = demos.flatMap((bar, index) => ([
      { id: `demo-${index}-l`, bar, onsetMs: index * 280, velocity: .65, hand: "L" as const, source: "demo" as const, assisted: true },
      { id: `demo-${index}-r`, bar: bar + 7, onsetMs: index * 280, velocity: .62, hand: "R" as const, source: "demo" as const, assisted: true },
    ])); await audio.playEvents(events, demos.length * 280);
  }
  async function exportWave(take: RanatTake) {
    setExporting(take.id); setExportError("");
    try {
      const url = URL.createObjectURL(await renderRanatWave(take));
      const a = document.createElement("a"); a.href = url; a.download = `ranat-${take.id}.wav`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError("สร้างไฟล์เสียงไม่ได้ ลองอีกครั้งหรือเก็บไฟล์โน้ตไว้ก่อน"); }
    finally { setExporting(null); }
  }
  async function readTakeFile(file?: File) {
    if (!file) return;
    setExportError("");
    try { if (file.size > 5_000_000) throw new Error("Too large"); audio.importTake(JSON.parse(await file.text())); }
    catch { setExportError("อ่านไฟล์โน้ตไม่ได้ กรุณาใช้ไฟล์ JSON จาก Ranat Next ขนาดไม่เกิน 5 MB"); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }
  return <div className="rn-page app-shell">
    <header className="rn-header"><Link href="/instruments" className="app-brand">ranat next<span>.</span></Link><nav aria-label="เครื่องดนตรี"><Link href="/instruments/phin">Phin Next</Link><Link href="/instruments/ranat">รู้จักระนาด</Link></nav><Link className="rn-back" href="/instruments">เครื่องดนตรีทั้งหมด <span>↗</span></Link></header>
    <InstrumentNav current="ranat" />
    <main id="main-content" className="rn-main" tabIndex={-1}>
      <section className="rn-heading"><div><p className="eyebrow">THE NEXT CHAPTER OF THAI SOUND</p><h1>สองไม้.<span> หนึ่งทำนอง.</span></h1><p className="rn-intro">สัมผัสเสียงระนาดเอก เล่นอย่างอิสระ ในจังหวะของคุณ</p></div><button className="ui-button rn-demo" onClick={audio.playing ? audio.stop : demo}><span aria-hidden="true">{audio.playing ? "■" : "▷"}</span>{audio.playing ? "หยุดฟัง" : "ฟังตัวอย่าง"}</button></section>
      <section className="rn-stage" aria-label="พื้นที่เล่นระนาด">
        <div className="rn-stage-top"><div><span className={`rn-dot ${audio.active ? "rn-dot-active" : ""}`}/><span>RANAT EK</span><span className="rn-small-tag">เสียงสังเคราะห์</span></div><div className="rn-input-switch" aria-label="วิธีเล่น"><button aria-pressed={input === "touch"} onClick={() => { reset(); setInput("touch"); }}>สัมผัส / คีย์บอร์ด</button><button aria-pressed={input === "camera"} onClick={() => { reset(); void audio.unlock(); setInput("camera"); }}>กล้อง <small>ทดลอง</small></button><button aria-pressed={input === "ar"} onClick={() => { reset(); void audio.unlock(); setInput("ar"); }}>AR <small>ทดลอง</small></button></div></div>
        <div className="rn-stage-caption"><p>{audio.active ? "ปล่อยมือ ให้เสียงค่อย ๆ จาง" : mode === "direct" ? "เริ่มต้นด้วยเสียงแรกของคุณ" : modeInfo.description}</p><span>{paired ? `คู่ ${offset + 1} · ระบบช่วยวางไม้ที่สอง` : "21 ลูกระนาด · 3 ช่วงเสียง"}</span></div>
        {input === "ar" ? <RanatArCamera mode={mode} offset={offset} rangeStart={keyStart} hits={audio.hits} suspended={audio.playing} pauseToken={cameraPause} onBegin={audio.begin} onRelease={audio.release} onStop={audio.endPattern} onUnlock={audio.unlock} onTouch={trigger}/> : input === "camera" ? <RanatCamera mode={mode} offset={offset} rangeStart={keyStart} hits={audio.hits} suspended={audio.playing} pauseToken={cameraPause} onBegin={audio.begin} onRelease={audio.release} onStop={audio.endPattern} onUnlock={audio.unlock} onTouch={trigger}/> : <RanatPlayStage hits={audio.hits} onDown={trigger} onUp={audio.release} disabledFrom={maxBase + 1} range={zoom ? [keyStart, Math.min(keyStart + 7, 20)] : [0, 20]}/>}
        <div className="rn-stage-bottom"><div className="rn-hands"><span><i className="rn-left"/>ไม้ซ้าย</span><span><i className="rn-right"/>ไม้ขวา</span></div><div className="rn-range"><button disabled={input !== "touch"} aria-pressed={zoom} onClick={() => { reset(); setZoom(!zoom); }}>{zoom ? "ดูเต็มราง" : "เล่น 8 ลูก"}</button><label>ช่วงเสียง<select aria-label="ช่วงเสียงคีย์บอร์ดและพื้นที่ขยาย" value={start} onChange={e => { reset(); setStart(Number(e.target.value)); }}><option value="0">ต่ำ</option><option value="7">กลาง</option><option value="13">สูง</option></select></label></div></div>
        <div className="rn-keyboard-guide" aria-label="ปุ่มคีย์บอร์ดตามช่วงเสียง"><p>แตะปุ่มเลขด้านล่าง หรือกดเลข 1–0 บนคีย์บอร์ด · ใช้ A S D F G H J K L ; ได้ด้วย</p><div className="rn-keyboard-map">{Array.from(NUMBER_KEYS, (key, i) => {
          const bar = keyStart + i;
          const enabled = bar <= maxBase && (!(zoom || input !== "touch") || i < 8);
          return <button key={key} type="button" disabled={!enabled} aria-label={`ปุ่ม ${key}: ${enabled ? `${bars[bar].label} ลูก ${bar + 1}` : "ไม่ใช้ในช่วงนี้"}`}
            onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); trigger(bar, `number-pointer-${e.pointerId}`); }}
            onPointerUp={e => release(`number-pointer-${e.pointerId}`)} onPointerCancel={e => release(`number-pointer-${e.pointerId}`)} onLostPointerCapture={e => release(`number-pointer-${e.pointerId}`)}
            onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); if (!e.repeat) trigger(bar, `number-key-${key}`); } }}
            onKeyUp={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); release(`number-key-${key}`); } }} onBlur={() => release(`number-key-${key}`)}
            ><kbd>{key}</kbd><small>{enabled ? `${bars[bar].label} · ${bar + 1}` : "—"}</small></button>;
        })}</div><small>เปลี่ยนช่วงเสียง ต่ำ / กลาง / สูง เพื่อเล่นครบทั้งราง · แป้นตัวเลขด้านขวาใช้ได้เมื่อเปิด Num Lock</small></div>
        {!audio.ready && <button className="rn-unlock ui-button" onClick={() => void audio.unlock()}>เปิดเสียง แล้วลองแตะระนาด <span>↗</span></button>}
      </section>
      <section className="rn-control-deck" aria-label="ปรับวิธีเล่น">
        <div className="rn-techniques"><div className="rn-label-row"><p className="eyebrow">MAKE IT YOUR OWN</p><button className="rn-help-button" aria-expanded={help} onClick={() => setHelp(!help)}>วิธีเล่น <span>ⓘ</span></button></div><div className="rn-mode-grid">{articulations.map((item, i) => <button key={item.id} aria-pressed={mode === item.id} onClick={() => { reset(); setMode(item.id); }}><span className="rn-mode-number">0{i + 1}</span><strong>{item.title}</strong><small>{item.english}</small></button>)}</div><p className="rn-technique-hint">{modeInfo.description}</p></div>
        <div className="rn-settings"><label className="rn-setting">คู่เสียง<select value={offset} disabled={!paired} onChange={e => { reset(); setOffset(Number(e.target.value)); }}>{[1, 2, 3, 4, 5, 7].map(value => <option key={value} value={value}>คู่ {value + 1}{value === 7 ? " · Octave" : ""}</option>)}</select></label><label className="rn-setting">ความดัง <output>{audio.volume}%</output><input aria-label="ความดัง" type="range" min="0" max="100" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))}/></label><label className="rn-setting">ความถี่กรอ <output>{audio.rate} ครั้ง/วิ</output><input aria-label="ความถี่กรอ" type="range" min="4" max="16" value={audio.rate} disabled={mode !== "kro" && mode !== "roll"} onChange={e => audio.setRate(Number(e.target.value))}/></label></div>
      </section>
      {help && <section className="rn-guide ui-panel"><h2>ให้สองมือเล่าเรื่องเดียวกัน.</h2><div><p><strong>ตีเอง</strong> กด 1 2 3 4 5 6 7 8 9 0 เรียงจากเสียงต่ำไปสูงตามช่วงที่เลือก หรือใช้ A S D F G H J K L ; กดหลายปุ่มพร้อมกันเพื่อตีคู่ได้ โหมดเล่น 8 ลูกใช้เลข 1–8</p><p><strong>ตีคู่ / กรอช่วย</strong> เลือกโน้ตฐานเพียงลูกเดียว ระบบวางไม้อีกอันให้ คู่แปดห่างกัน 7 ตำแหน่ง ลูกที่ไม่มีคู่สูงจะจางลง</p><p><strong>กรอ กับ รัว</strong> กดเลขค้างเพื่อเล่นต่อเนื่อง ปล่อยปุ่มเพื่อหยุด กรอสลับสองเสียง รัวสลับไม้บนลูกเดียว เมื่อเปลี่ยนช่วงเสียงหรือออกจากหน้าต่างจะหยุดการกดค้าง</p></div><small>เสียงชุดทดลองแบ่ง 7 ขั้นเท่ากันต่อช่วงคู่แปด ยังไม่ใช่ชุดเสียงระนาดจริงที่ผ่านการตรวจโดยครูดนตรี</small></section>}
      <section className="rn-transport ui-panel" aria-label="จังหวะและการบันทึก"><div className="rn-metronome"><button className={`rn-round ${audio.metronome ? "is-on" : ""}`} aria-pressed={audio.metronome} aria-label="เปิดปิดเครื่องให้จังหวะ" onClick={() => void audio.setMetronome()}>♩</button><label><span className="eyebrow">TEMPO</span><input aria-label="ความเร็วจังหวะ BPM" type="number" min="40" max="180" value={audio.bpm} onChange={e => audio.setBpm(Math.max(40, Math.min(180, Number(e.target.value) || 40)))}/><span>BPM</span></label><div className="rn-beats" aria-hidden="true">{[0,1,2,3].map(i => <i key={i} className={audio.beat === i ? "is-on" : ""}/>)}</div></div><div className="rn-record-controls"><span>{audio.isRecording ? "กำลังเก็บทำนองของคุณ · สูงสุด 5 นาที" : "เก็บเสียงแรก ไว้เป็นทำนองของคุณ"}</span><button className={`ui-button ${audio.isRecording ? "rn-recording" : ""}`} disabled={!audio.storageReady} onClick={() => void audio.toggleRecording()}><span className="rn-record-dot"/>{audio.isRecording ? "หยุดและบันทึก" : "อัดทำนอง"}</button><button className="rn-stop" aria-label="หยุดเสียงและบันทึก" onClick={() => { setCameraPause(value => value + 1); audio.saveRecording(); audio.stop(); }}>■</button></div></section>
      <div className="rn-status" role="status">{exportError || audio.error || audio.notice || (audio.isRecording ? "บันทึกเฉพาะโน้ต ไม่บันทึกภาพจากกล้อง" : "เคล็ดลับ: หูฟังแบบสายช่วยให้จังหวะที่ได้ยินตรงกับมือมากขึ้น")}</div>
      {audio.takes.length > 0 && <section className="rn-takes"><div className="rn-label-row"><h2>ทำนองของคุณ<span>.</span></h2><small>12 บันทึกล่าสุดในเบราว์เซอร์นี้</small></div>{audio.takes.map(take => <div className="rn-take" key={take.id}><span className="rn-take-icon">♫</span><div><strong>{take.name}</strong><small>{take.events.length} เสียง · {Math.ceil(take.durationMs / 1000)} วินาที{take.events.some(e => e.assisted) ? " · ใช้ตัวช่วยบรรเลง" : " · ตีเอง"}</small></div><button onClick={() => void audio.playEvents(take.events, take.durationMs)} aria-label={`ฟัง ${take.name}`}>▷ ฟัง</button><button disabled={exporting !== null} onClick={() => void exportWave(take)} aria-label={`ดาวน์โหลดเสียง WAV ${take.name}`}>{exporting === take.id ? "กำลังสร้าง…" : "↓ WAV"}</button><button onClick={() => downloadTake(take)} aria-label={`ดาวน์โหลด ${take.name}`}>↓ <span>เก็บไฟล์โน้ต</span></button></div>)}</section>}
      <div className="rn-import"><button disabled={!audio.storageReady} onClick={() => fileInput.current?.click()}>↑ เปิดไฟล์ทำนองที่เก็บไว้</button><input ref={fileInput} type="file" accept=".json,application/json" aria-label="เปิดไฟล์โน้ต Ranat Next" hidden onChange={e => void readTakeFile(e.target.files?.[0])}/></div><footer className="rn-footer"><span>ranat next.</span><p>เสียงของวัฒนธรรม ในจังหวะของคุณ</p><Link href="/instruments">พบเครื่องดนตรีอื่น ↗</Link></footer>
    </main>
  </div>;
}
