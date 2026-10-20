export const HUD_STYLES = [
  { id: "soft", label: "นุ่มนวล" },
  { id: "glass", label: "กระจก" },
  { id: "outline", label: "เส้นขอบ" },
] as const;

export type HudAppearance = {
  style: typeof HUD_STYLES[number]["id"];
  accent: string;
  surface: string;
  text: string;
  radius: number;
  weight: number;
};

export const DEFAULT_APPEARANCE: HudAppearance = {
  style: "soft", accent: "#1689ed", surface: "#152331", text: "#edf6ff", radius: 13, weight: 1,
};

export const HUD_PALETTES = [
  { label: "ฟ้าเดิม", accent: "#1689ed", surface: "#152331", text: "#edf6ff" },
  { label: "มิ้นต์", accent: "#63d9b1", surface: "#16352f", text: "#edfff8" },
  { label: "ม่วง", accent: "#c4a0ff", surface: "#2b223d", text: "#f6f0ff" },
  { label: "อำพัน", accent: "#f4bd68", surface: "#342b20", text: "#fff6e8" },
  { label: "สว่าง", accent: "#0879e8", surface: "#f1f5f9", text: "#1e293b" },
] as const;

function hex(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

export function parseAppearance(value: unknown): HudAppearance {
  const input = value && typeof value === "object" ? value as Partial<HudAppearance> : {};
  return {
    style: HUD_STYLES.some(style => style.id === input.style) ? input.style! : DEFAULT_APPEARANCE.style,
    accent: hex(input.accent, DEFAULT_APPEARANCE.accent),
    surface: hex(input.surface, DEFAULT_APPEARANCE.surface),
    text: hex(input.text, DEFAULT_APPEARANCE.text),
    radius: typeof input.radius === "number" && Number.isFinite(input.radius) ? Math.min(24, Math.max(0, input.radius)) : DEFAULT_APPEARANCE.radius,
    weight: typeof input.weight === "number" && Number.isFinite(input.weight) ? Math.min(3, Math.max(1, input.weight)) : DEFAULT_APPEARANCE.weight,
  };
}

/** Choose readable text on filled accent buttons, including custom colours. */
export function accentForeground(color: string) {
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16) / 255);
  const linear = rgb.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722 > 0.179 ? "#000000" : "#ffffff";
}

export function appearanceVariables(appearance: HudAppearance) {
  return {
    "--hud-accent": appearance.accent,
    "--hud-surface-color": appearance.surface,
    "--hud-text": appearance.text,
    "--hud-on-accent": accentForeground(appearance.accent),
    "--hud-radius": `${appearance.radius}px`,
    "--hud-border-width": `${appearance.weight}px`,
  };
}
