"use client";

import { parseQuickTakeList, readQuickTake, type QuickTake } from "@/lib/takes/types";

const DB_NAME = "virtual-phin";
const DB_VERSION = 1;
const STORE_NAME = "quick-takes";
const FALLBACK_KEY = "virtual-phin.quick-takes.v1";
export const QUICK_TAKES_CHANGED = "virtual-phin:quick-takes-change";

let databasePromise: Promise<IDBDatabase> | null = null;
let memoryFallback: QuickTake[] = [];

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("เปิดฐานข้อมูล Quick Take ไม่สำเร็จ"));
  });
  return databasePromise;
}

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function readFallback() {
  if (typeof window === "undefined") return memoryFallback;
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    return raw ? parseQuickTakeList(JSON.parse(raw)) : memoryFallback;
  } catch { return memoryFallback; }
}

function writeFallback(takes: QuickTake[]) {
  memoryFallback = parseQuickTakeList(takes);
  try { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(memoryFallback)); }
  catch { /* Memory fallback keeps the current session usable. */ }
}

function notify() {
  window.dispatchEvent(new Event(QUICK_TAKES_CHANGED));
}

export async function listQuickTakes(): Promise<QuickTake[]> {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const values = await requestValue(transaction.objectStore(STORE_NAME).getAll());
    return parseQuickTakeList(values);
  } catch { return readFallback(); }
}

export async function getQuickTake(id: string): Promise<QuickTake | null> {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    return readQuickTake(await requestValue(transaction.objectStore(STORE_NAME).get(id)));
  } catch { return readFallback().find(take => take.id === id) ?? null; }
}

export async function saveQuickTake(take: QuickTake) {
  const safeTake = readQuickTake(take);
  if (!safeTake) throw new Error("ข้อมูล Quick Take ไม่ถูกต้อง");
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestValue(transaction.objectStore(STORE_NAME).put(safeTake));
  } catch {
    const takes = readFallback().filter(item => item.id !== safeTake.id);
    writeFallback([safeTake, ...takes]);
  }
  notify();
  return safeTake;
}

export async function deleteQuickTake(id: string) {
  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await requestValue(transaction.objectStore(STORE_NAME).delete(id));
  } catch { writeFallback(readFallback().filter(take => take.id !== id)); }
  notify();
}

export async function importQuickTakes(values: unknown) {
  const takes = parseQuickTakeList(values);
  for (const take of takes) await saveQuickTake(take);
  return takes.length;
}

