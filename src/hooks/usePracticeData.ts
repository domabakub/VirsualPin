"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parsePracticeData, type PracticeData, type PracticeRecord, type Preferences } from "@/lib/practice";

const KEY = "virtual-phin.practice.v1";
const EVENT = "virtual-phin:practice-change";
let memory: string | null = null;
let temporary = false;

function read() {
  if (typeof window === "undefined") return null;
  if (temporary) return memory;
  try { return window.localStorage.getItem(KEY); }
  catch { return memory; }
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (data: PracticeData) => PracticeData) {
  const next = change(parsePracticeData(read()));
  memory = JSON.stringify(next);
  try { window.localStorage.setItem(KEY, memory); temporary = false; }
  catch { temporary = true; }
  window.dispatchEvent(new Event(EVENT));
}

export function savePractice(slug: string, record: PracticeRecord) {
  update(data => ({ ...data, records: { ...data.records, [slug]: record } }));
}

export function savePreferences(preferences: Partial<Preferences>) {
  update(data => ({ ...data, preferences: { ...data.preferences, ...preferences } }));
}

export function readPractice(slug: string, total: number): PracticeRecord | undefined {
  const record = parsePracticeData(read()).records[slug];
  return record?.total === total ? record : undefined;
}

export function usePracticeData() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const storageTemporary = useSyncExternalStore(subscribe, () => temporary, () => false);
  const data = useMemo(() => parsePracticeData(raw), [raw]);
  return { ...data, ready, storageTemporary };
}
