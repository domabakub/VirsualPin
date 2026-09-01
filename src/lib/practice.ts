export type PracticeRecord = {
  step: number;
  mistakes: number;
  total: number;
  updatedAt: number;
};

export type Preferences = {
  facing: "user" | "environment";
  volume: number;
  shortcuts: boolean;
};

export type PracticeData = {
  version: 1;
  records: Record<string, PracticeRecord>;
  preferences: Preferences;
};

export function emptyPracticeData(): PracticeData {
  return { version: 1, records: {}, preferences: { facing: "user", volume: 0.8, shortcuts: false } };
}

export function parsePracticeData(raw: string | null): PracticeData {
  const result = emptyPracticeData();
  if (!raw) return result;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1) return result;
    const p = value.preferences;
    if (p) {
      if (p.facing === "user" || p.facing === "environment") result.preferences.facing = p.facing;
      if (typeof p.volume === "number" && Number.isFinite(p.volume)) result.preferences.volume = Math.max(0, Math.min(1, p.volume));
      if (typeof p.shortcuts === "boolean") result.preferences.shortcuts = p.shortcuts;
    }
    if (value.records && typeof value.records === "object" && !Array.isArray(value.records)) {
      for (const [slug, record] of Object.entries(value.records)) {
        if (!/^[a-z0-9-]+$/.test(slug) || !record || typeof record !== "object") continue;
        const r = record as PracticeRecord;
        if (Number.isSafeInteger(r.total) && r.total > 0 && r.total <= 10000 &&
          Number.isSafeInteger(r.step) && r.step >= 0 && r.step <= r.total &&
          Number.isSafeInteger(r.mistakes) && r.mistakes >= 0 &&
          Number.isSafeInteger(r.updatedAt) && r.updatedAt > 0) {
          result.records[slug] = { step: r.step, mistakes: r.mistakes, total: r.total, updatedAt: r.updatedAt };
        }
      }
    }
  } catch { /* Corrupt or old local data must not prevent opening the app. */ }
  return result;
}

export function getPracticeAccuracy(step: number, mistakes: number) {
  return step + mistakes > 0 ? Math.round(step / (step + mistakes) * 100) : null;
}

export function advancePractice(record: PracticeRecord, correct: boolean, now = Date.now()): PracticeRecord {
  if (record.step >= record.total) return record;
  return { ...record, step: record.step + Number(correct), mistakes: record.mistakes + Number(!correct), updatedAt: now };
}
