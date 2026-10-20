"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from "react";
import { HUD_IDS, HUD_ITEMS, clamp, hudRect, type HudId, type HudItem, type HudLayout, type HudPatch, type StringOrder } from "@/lib/ar-layout";
import { DEFAULT_APPEARANCE, appearanceVariables, type HudAppearance } from "@/lib/ar-appearance";
import { ArAppearanceControls } from "./ArAppearanceControls";

type EditorProps = {
  layout: HudLayout;
  selected: HudId;
  onSelect: (id: HudId) => void;
  onUpdate: (id: HudId, patch: HudPatch) => void;
  onReset: () => void;
  onSave: () => void;
  onCancel: () => void;
  onApplyAppearance: (appearance: HudAppearance) => void;
};

export function ArLayoutEditor({ layout, selected, onSelect, onUpdate, onReset, onSave, onCancel, onApplyAppearance }: EditorProps) {
  const item = layout[selected];
  const [tab, setTab] = useState<"layout" | "appearance">("layout");
  const tabId = useId();
  return <aside className={`ar-layout-editor ${tab === "appearance" ? "is-appearance-tab" : ""}`} aria-label="เครื่องมือจัดวางหน้าจอ">
    <div className="ar-editor-heading"><span className="eyebrow">YOUR SPACE, YOUR WAY</span><h3>จัดให้เข้ามือคุณ</h3><p>แตะเลือกชิ้นส่วน แล้วลากไปยังตำแหน่งที่ถนัด</p></div>
    <div className="ar-component-list" role="group" aria-label="เลือกชิ้นส่วน">
      {HUD_IDS.map((id, index) => <button key={id} type="button" aria-pressed={selected === id} onClick={() => onSelect(id)}><span className="ar-component-number">{String(index + 1).padStart(2, "0")}</span><span>{HUD_ITEMS[id].label}</span><span className="ar-component-state">{!layout[id].visible ? "ซ่อน" : selected === id ? "●" : "↗"}</span></button>)}
    </div>
    <div className="ar-item-settings">
      <div className="ar-selected-title"><strong>{HUD_ITEMS[selected].label}</strong><label className="ar-visibility"><input type="checkbox" checked={item.visible} onChange={e => onUpdate(selected, { visible: e.target.checked })} />แสดง</label></div>
      <div role="tablist" aria-label="การปรับแต่งชิ้นส่วน" className="ar-settings-tabs">
        {([['layout', 'จัดตำแหน่ง'], ['appearance', 'สีและรูปแบบ']] as const).map(([id, label]) => <button key={id} type="button" role="tab" id={`${tabId}-${id}`} aria-selected={tab === id} aria-controls={`${tabId}-${id}-panel`} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === "Home" ? "layout" : event.key === "End" ? "appearance" : id === "layout" ? "appearance" : "layout";
          setTab(next);
          document.getElementById(`${tabId}-${next}`)?.focus();
        }}>{label}</button>)}
      </div>
      <div role="tabpanel" id={`${tabId}-layout-panel`} aria-labelledby={`${tabId}-layout`} hidden={tab !== "layout"}>
      {([
        ["scale", "ขนาด", 75, 140], ["opacity", "ความทึบ", 30, 100],
        ["x", "ตำแหน่งแนวนอน", 0, 100], ["y", "ตำแหน่งแนวตั้ง", 0, 100],
      ] as const).map(([key, label, min, max]) => <label key={key} className="ar-slider"><span>{label}<output>{Math.round(item[key] * 100)}%</output></span><input aria-label={label} type="range" min={min} max={max} value={Math.round(item[key] * 100)} onChange={e => onUpdate(selected, { [key]: Number(e.target.value) / 100 })} /></label>)}
      {selected === "strings" && <fieldset className="ar-string-settings">
        <legend>ปรับแต่งสาย</legend>
        <label className="ar-slider"><span>ระยะห่างระหว่างสาย<output>{Math.round(layout.strings.spacing * 100)}%</output></span><input aria-label="ระยะห่างระหว่างสาย" type="range" min={60} max={120} step={5} value={Math.round(layout.strings.spacing * 100)} onChange={event => onUpdate("strings", { spacing: Number(event.target.value) / 100 })} /></label>
        <p className="ar-string-order-label">ลำดับจากบนลงล่าง</p>
        <ol className="ar-string-order" aria-label="ลำดับสายจากบนลงล่าง">
          {layout.strings.order.map((string, row) => <li key={string}><span><small>{["บน", "กลาง", "ล่าง"][row]}</small>สาย {string + 1}</span><div>{([-1, 1] as const).map(direction => <button key={direction} type="button" disabled={row + direction < 0 || row + direction > 2} aria-label={`เลื่อนสาย ${string + 1} ${direction === -1 ? "ขึ้น" : "ลง"}`} onClick={() => {
            const order = [...layout.strings.order] as StringOrder;
            [order[row], order[row + direction]] = [order[row + direction], order[row]];
            onUpdate("strings", { order });
          }}>{direction === -1 ? "↑" : "↓"}</button>)}</div></li>)}
        </ol>
        <p className="ar-editor-note">พื้นที่ตรวจจับและคอพิณเรียงตามสายที่จัดไว้ เสียงของแต่ละสายคงเดิม</p>
      </fieldset>}
      {selected === "frets" && <p className="ar-editor-note">แถบนี้แสดงเฟรตที่เลือก ตั้งจุดเริ่มของมือด้วยปุ่ม “ตั้งเฟรต 0”</p>}
      </div>
      <div role="tabpanel" id={`${tabId}-appearance-panel`} aria-labelledby={`${tabId}-appearance`} hidden={tab !== "appearance"}>
        <ArAppearanceControls key={selected} appearance={item.appearance ?? DEFAULT_APPEARANCE} label={HUD_ITEMS[selected].label} onChange={appearance => onUpdate(selected, { appearance })} onApplyAll={onApplyAppearance} />
      </div>
    </div>
    <div className="ar-editor-actions"><button type="button" className="ui-button ui-primary" onClick={onSave}>บันทึกการจัดวาง</button><button type="button" className="ui-button" onClick={onCancel}>ยกเลิก</button></div>
    <button type="button" className="ar-reset-button" onClick={onReset}>↺ คืนค่าเริ่มต้น</button>
    <p className="ar-editor-footnote">บันทึกบนเบราว์เซอร์นี้ · ปรับตามขนาดหน้าจอ<br />ใช้ปุ่มลูกศรเพื่อขยับชิ้นส่วนที่เลือก</p>
  </aside>;
}

type SurfaceProps = {
  layout: HudLayout;
  editing: boolean;
  selected: HudId;
  onSelect: (id: HudId) => void;
  onUpdate: (id: HudId, patch: Partial<HudItem>) => void;
  children: (id: HudId) => ReactNode;
  stringsRef: RefObject<HTMLDivElement | null>;
};

export function ArHudSurface({ layout, editing, selected, onSelect, onUpdate, children, stringsRef }: SurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: HudId; pointerId: number; startX: number; startY: number; x: number; y: number; travelX: number; travelY: number } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const startDrag = (event: PointerEvent<HTMLDivElement>, id: HudId) => {
    if (!editing || !event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    onSelect(id);
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = hudRect(id, layout[id], size.width, size.height);
    drag.current = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: layout[id].x, y: layout[id].y, travelX: size.width - rect.width, travelY: size.height - rect.height };
  };
  return <div ref={surfaceRef} className={`ar-hud-surface ${editing ? "is-editing" : ""}`}>
    {HUD_IDS.map(id => {
      const item = layout[id];
      const rect = hudRect(id, item, size.width, size.height);
      const appearance = item.appearance ?? DEFAULT_APPEARANCE;
      return <div key={id} ref={id === "strings" ? stringsRef : undefined} data-hud={id} data-hud-style={appearance.style}
        className={`ar-hud-item ar-hud-${id} ${editing && selected === id ? "is-selected" : ""} ${!item.visible ? "is-hidden" : ""}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, "--hud-opacity": item.opacity, "--hud-scale": item.scale, ...appearanceVariables(appearance) } as CSSProperties}
        role={editing ? "button" : undefined} tabIndex={editing ? 0 : undefined}
        aria-label={editing ? `จัดวาง ${HUD_ITEMS[id].label}` : undefined} aria-pressed={editing ? selected === id : undefined}
        onPointerDown={event => startDrag(event, id)}
        onPointerMove={event => {
          const current = drag.current;
          if (!current || current.id !== id || event.pointerId !== current.pointerId) return;
          onUpdate(id, { x: clamp(current.x + (event.clientX - current.startX) / Math.max(1, current.travelX), 0, 1), y: clamp(current.y + (event.clientY - current.startY) / Math.max(1, current.travelY), 0, 1) });
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
        onKeyDown={event => {
          if (!editing) return;
          const amount = event.shiftKey ? 0.05 : 0.01;
          const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key];
          if (delta) { event.preventDefault(); onSelect(id); onUpdate(id, { x: clamp(item.x + delta[0], 0, 1), y: clamp(item.y + delta[1], 0, 1) }); }
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); }
        }}>
        <div className="ar-hud-content" inert={editing}>{children(id)}</div>
        {editing && <><span className="ar-hud-label">{HUD_ITEMS[id].label}{!item.visible ? " · ซ่อน" : ""}</span><span className="ar-drag-grip" aria-hidden="true">⠿</span></>}
      </div>;
    })}
  </div>;
}
