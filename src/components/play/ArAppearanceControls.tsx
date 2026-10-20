"use client";

import { useState, type CSSProperties } from "react";
import { DEFAULT_APPEARANCE, HUD_PALETTES, HUD_STYLES, appearanceVariables, type HudAppearance } from "@/lib/ar-appearance";

type Props = {
  appearance: HudAppearance;
  label: string;
  onChange: (appearance: HudAppearance) => void;
  onApplyAll: (appearance: HudAppearance) => void;
};

export function ArAppearanceControls({ appearance, label, onChange, onApplyAll }: Props) {
  const [message, setMessage] = useState("");
  const update = (patch: Partial<HudAppearance>) => { onChange({ ...appearance, ...patch }); setMessage(""); };
  return <div className="ar-appearance-controls">
    <div className="ar-appearance-preview" data-hud-style={appearance.style} style={appearanceVariables(appearance) as CSSProperties} aria-label="ตัวอย่างสีและรูปแบบ">
      <span>ตัวอย่าง · {label}</span><div className="ar-appearance-sample"><strong>Aa <small>สาย 1</small></strong><i>เลือก</i></div>
    </div>
    <fieldset className="ar-appearance-fieldset"><legend>รูปแบบ</legend><div className="ar-style-options">
      {HUD_STYLES.map(style => <button key={style.id} type="button" aria-pressed={appearance.style === style.id} onClick={() => update({ style: style.id })}><span className={`ar-style-sample is-${style.id}`} aria-hidden="true"><i /></span>{style.label}</button>)}
    </div></fieldset>
    <fieldset className="ar-appearance-fieldset"><legend>ชุดสี</legend><div className="ar-palette-options">
      {HUD_PALETTES.map(palette => <button key={palette.label} type="button" title={palette.label} aria-label={`ชุดสี${palette.label}`} aria-pressed={appearance.accent === palette.accent && appearance.surface === palette.surface && appearance.text === palette.text} onClick={() => update({ accent: palette.accent, surface: palette.surface, text: palette.text })}><span style={{ background: palette.surface }}><i style={{ background: palette.accent }} /></span><small>{palette.label}</small></button>)}
    </div></fieldset>
    <fieldset className="ar-appearance-fieldset"><legend>เลือกสีเอง</legend>
      {([["accent", "สีหลัก / เส้นสาย"], ["surface", "สีพื้น"], ["text", "สีตัวอักษร"]] as const).map(([key, title]) => <label key={key} className="ar-color-field"><input aria-label={title} type="color" value={appearance[key]} onChange={event => update({ [key]: event.target.value })} /><span>{title}<output>{appearance[key].toUpperCase()}</output></span></label>)}
    </fieldset>
    {([["radius", "ความโค้งมุม", 0, 24], ["weight", "ความหนาเส้น", 1, 3]] as const).map(([key, title, min, max]) => <label key={key} className="ar-slider"><span>{title}<output>{appearance[key]} px</output></span><input aria-label={title} type="range" min={min} max={max} step={1} value={appearance[key]} onChange={event => update({ [key]: Number(event.target.value) })} /></label>)}
    <button type="button" className="ar-apply-appearance" onClick={() => { onApplyAll(appearance); setMessage("ใช้กับทั้ง 8 ชิ้นแล้ว · กดบันทึกเพื่อเก็บรูปแบบ"); }}>ใช้กับทุกชิ้นส่วน</button>
    <button type="button" className="ar-reset-appearance" onClick={() => { onChange({ ...DEFAULT_APPEARANCE }); setMessage("คืนสีและรูปแบบของชิ้นนี้แล้ว"); }}>คืนสีและรูปแบบของชิ้นนี้</button>
    <p className="ar-editor-note">ใช้กับ {label} · ดูผลบนกล้องได้ทันที</p>
    {message && <p role="status" className="ar-appearance-message">{message}</p>}
  </div>;
}
