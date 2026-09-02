"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StringIndex } from "@/data/songs";
import { saveQuickTake } from "@/lib/takes/storage";
import { createQuickTake, type QuickTake, type QuickTakeNote, type TakeInputSource } from "@/lib/takes/types";

type RecorderStatus = "idle" | "armed" | "recording" | "saving";

function createId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function useQuickTakeRecorder(bpm?: number) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [noteCount, setNoteCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lastSavedTake, setLastSavedTake] = useState<QuickTake | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");
  const notesRef = useRef<QuickTakeNote[]>([]);
  const startedAtRef = useRef<number | null>(null);

  const updateStatus = useCallback((next: RecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const arm = useCallback(() => {
    notesRef.current = [];
    startedAtRef.current = null;
    setNoteCount(0);
    setElapsedMs(0);
    setLastSavedTake(null);
    updateStatus("armed");
  }, [updateStatus]);

  const cancel = useCallback(() => {
    notesRef.current = [];
    startedAtRef.current = null;
    setNoteCount(0);
    setElapsedMs(0);
    updateStatus("idle");
  }, [updateStatus]);

  const captureNote = useCallback((string: StringIndex, fret: number, source: TakeInputSource, confidence?: number) => {
    if (statusRef.current !== "armed" && statusRef.current !== "recording") return;
    const detectedAt = performance.now();
    if (startedAtRef.current === null) {
      startedAtRef.current = detectedAt;
      updateStatus("recording");
    }
    const onsetMs = Math.max(0, detectedAt - startedAtRef.current);
    notesRef.current.push({
      id: createId("note"),
      string,
      fret,
      velocity: 96,
      onsetMs,
      durationMs: 500,
      source,
      ...(confidence === undefined ? {} : { confidence }),
    });
    setNoteCount(notesRef.current.length);
    setElapsedMs(onsetMs);
  }, [updateStatus]);

  const stop = useCallback(async () => {
    if (statusRef.current === "idle" || statusRef.current === "saving") return null;
    if (!notesRef.current.length) { cancel(); return null; }
    updateStatus("saving");
    const naturalDuration = Math.max(...notesRef.current.map(note => note.onsetMs + note.durationMs));
    const take = createQuickTake({
      id: createId("take"),
      notes: notesRef.current,
      durationMs: naturalDuration,
      bpm,
    });
    const saved = await saveQuickTake(take);
    notesRef.current = [];
    startedAtRef.current = null;
    setElapsedMs(saved.durationMs);
    setLastSavedTake(saved);
    updateStatus("idle");
    return saved;
  }, [bpm, cancel, updateStatus]);

  useEffect(() => {
    if (status !== "recording") return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) setElapsedMs(performance.now() - startedAtRef.current);
    }, 250);
    return () => window.clearInterval(timer);
  }, [status]);

  return { status, noteCount, elapsedMs, lastSavedTake, arm, cancel, captureNote, stop };
}

