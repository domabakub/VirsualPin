"use client";

import { useCallback, useEffect, useRef } from "react";
import type { StringIndex } from "@/data/songs";

const BASE_FREQUENCIES: Record<StringIndex, number> = { 0: 146.83, 1: 185, 2: 220 };

export function getPinFrequency(string: StringIndex, fret: number) {
  return BASE_FREQUENCIES[string] * 2 ** (fret / 12);
}

/** Lightweight physical-style synthesis keeps latency low and requires no audio downloads. */
export function usePinAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const context = new AudioContext({ latencyHint: "interactive" });
      const master = context.createGain();
      master.gain.value = 0.68;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }
    return contextRef.current;
  }, []);

  const unlock = useCallback(async () => {
    const context = getContext();
    if (context.state === "suspended") await context.resume();
  }, [getContext]);

  const pluck = useCallback((string: StringIndex, fret: number) => {
    const context = getContext();
    const master = masterRef.current;
    if (!master) return;
    void context.resume();
    const now = context.currentTime;
    const frequency = getPinFrequency(string, fret);

    const tone = context.createOscillator();
    const harmonic = context.createOscillator();
    const toneGain = context.createGain();
    const harmonicGain = context.createGain();
    const filter = context.createBiquadFilter();

    tone.type = "triangle";
    tone.frequency.setValueAtTime(frequency, now);
    harmonic.type = "sine";
    harmonic.frequency.setValueAtTime(frequency * 2.01, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4200, now);
    filter.frequency.exponentialRampToValueAtTime(900, now + 1.25);
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.72, now + 0.008);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
    harmonicGain.gain.setValueAtTime(0.18, now);
    harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

    tone.connect(toneGain).connect(filter);
    harmonic.connect(harmonicGain).connect(filter);
    filter.connect(master);
    tone.start(now);
    harmonic.start(now);
    tone.stop(now + 1.4);
    harmonic.stop(now + 0.5);
  }, [getContext]);

  const click = useCallback(() => {
    const context = getContext();
    const master = masterRef.current;
    if (!master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }, [getContext]);

  useEffect(() => () => {
    void contextRef.current?.close();
  }, []);

  return { unlock, pluck, click };
}
