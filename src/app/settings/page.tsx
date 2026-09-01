"use client";

import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BottomNav } from "@/components/navigation/BottomNav";
import { savePreferences, usePracticeData } from "@/hooks/usePracticeData";
import type { Preferences } from "@/lib/practice";

export default function SettingsPage() {
  const { preferences, ready, storageTemporary } = usePracticeData();
  const [changed, setChanged] = useState(false);
  function update(value: Partial<Preferences>) { savePreferences(value); setChanged(true); }
  return <div className="app-shell settings-page">
    <AppHeader active="settings" />
    <main id="main-content" tabIndex={-1} className="settings-main">
      <div className="settings-heading"><p className="eyebrow">MAKE IT YOURS</p><h1>เล่นในแบบที่ถนัด.</h1><p className="page-description">รายละเอียดเล็ก ๆ เพื่อประสบการณ์ที่เป็นคุณ</p></div>
      <fieldset disabled={!ready} className="settings-group"><legend className="sr-only">เสียง กล้อง และปุ่มลัด</legend>
        <div className="settings-row settings-camera"><div><label htmlFor="camera-facing" className="setting-label">กล้องเริ่มต้น</label><p id="camera-hint" className="setting-hint">เลือกมุมมองที่สะดวกสำหรับคุณ</p></div><select id="camera-facing" aria-describedby="camera-hint" value={preferences.facing} onChange={e => update({ facing: e.target.value as Preferences["facing"] })}><option value="user">กล้องหน้า · กระจก</option><option value="environment">กล้องหลัง · ภาพจริง</option></select></div>
        <div className="settings-row"><div className="volume-label"><label htmlFor="volume" className="setting-label">ระดับเสียง</label><output htmlFor="volume">{Math.round(preferences.volume * 100)}%</output></div><p className="setting-hint">เสียงพิณและเมโทรนอม</p><div className="volume-control"><button type="button" aria-label="ลดเสียง 5 เปอร์เซ็นต์" disabled={preferences.volume === 0} onClick={() => update({ volume: Math.max(0, Math.round(preferences.volume * 100 - 5) / 100) })} className="volume-step">−</button><input id="volume" type="range" min="0" max="100" step="5" value={Math.round(preferences.volume * 100)} onChange={e => update({ volume: Number(e.target.value) / 100 })} /><button type="button" aria-label="เพิ่มเสียง 5 เปอร์เซ็นต์" disabled={preferences.volume === 1} onClick={() => update({ volume: Math.min(1, Math.round(preferences.volume * 100 + 5) / 100) })} className="volume-step">+</button></div>{preferences.volume === 0 && <p className="setting-hint">ปิดเสียงอยู่ · เพิ่มระดับเสียงเพื่อฟังพิณ</p>}</div>
        <label className="settings-row shortcut-row" htmlFor="keyboard-shortcuts"><span><span className="setting-label">ปุ่มลัดคีย์บอร์ด</span><span className="setting-hint">ใช้ปุ่ม 1 / 2 / 3 เพื่อดีดแต่ละสาย</span></span><span className="switch-control"><input id="keyboard-shortcuts" type="checkbox" checked={preferences.shortcuts} onChange={e => update({ shortcuts: e.target.checked })} /><span aria-hidden="true" className="switch-track" /></span></label>
      </fieldset>
      <p role="status" className={`settings-status ${storageTemporary ? "text-red-800" : ""}`}>{storageTemporary ? "บันทึกถาวรไม่ได้ การตั้งค่านี้ใช้ได้เฉพาะครั้งนี้" : !ready ? "กำลังอ่านการตั้งค่า…" : changed ? "บันทึกการตั้งค่าแล้ว" : "บันทึกอัตโนมัติในเบราว์เซอร์นี้"}</p>
      <section className="settings-note"><h2>เรียบง่าย แม้ไม่ใช้กล้อง.</h2><p>ใช้ปุ่มหน้าจอเล่นพิณได้เสมอ หากเปิดกล้อง ภาพจะประมวลผลบนเครื่องของคุณ รุ่นทดลองยังไม่รองรับการปรับความไวตรวจจับมือ</p></section>
      <Link href="/songs" className="text-link settings-back">กลับไปเลือกแบบฝึก <span aria-hidden="true">›</span></Link>
    </main><AppFooter /><BottomNav />
  </div>;
}
