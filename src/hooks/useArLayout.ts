"use client";

import { useEffect, useState } from "react";
import { AR_LAYOUT_KEY, DEFAULT_LAYOUT, applyAppearanceToLayout, parseLayout, type HudId, type HudPatch, type HudLayout } from "@/lib/ar-layout";
import type { HudAppearance } from "@/lib/ar-appearance";

export function useArLayout() {
  const [saved, setSaved] = useState<HudLayout>(DEFAULT_LAYOUT);
  const [draft, setDraft] = useState<HudLayout>(DEFAULT_LAYOUT);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setSaved(parseLayout(localStorage.getItem(AR_LAYOUT_KEY))); }
      catch { setMessage("เบราว์เซอร์นี้ไม่อนุญาตให้บันทึกตำแหน่งถาวร"); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const begin = () => { setDraft(structuredClone(saved)); setMessage(""); setEditing(true); };
  const cancel = () => { setEditing(false); setMessage("ยกเลิกการแก้ไขแล้ว · ใช้ตำแหน่งเดิม"); };
  const save = () => {
    try {
      localStorage.setItem(AR_LAYOUT_KEY, JSON.stringify({ version: 1, items: draft }));
      setSaved(structuredClone(draft));
      setEditing(false);
      setMessage("บันทึกการจัดวางแล้ว · ใช้กับ AR ในเบราว์เซอร์นี้");
    } catch {
      setMessage("บันทึกไม่ได้ พื้นที่จัดเก็บอาจเต็มหรือถูกปิดกั้น · การแก้ไขยังอยู่ ลองบันทึกอีกครั้ง");
    }
  };
  const update = (id: HudId, patch: HudPatch) => setDraft(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  const reset = () => setDraft(structuredClone(DEFAULT_LAYOUT));
  const applyAppearance = (appearance: HudAppearance) => setDraft(current => applyAppearanceToLayout(current, appearance));
  return { layout: editing ? draft : saved, editing, ready, message, begin, cancel, save, update, reset, applyAppearance };
}
