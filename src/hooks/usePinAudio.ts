"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StringIndex } from "@/data/songs";
import { createSynthWavUrl } from "@/lib/audio/wavSynth";
import { getPinFrequency } from "@/lib/audio/pinTuning";

// Open-string tuning for A minor: string 3 (top) E3, string 2 A3 and
// string 1 (bottom) E4. String indices remain zero-based internally.
export const BASE_FREQUENCIES: Record<StringIndex, number> = {
  0: getPinFrequency(0, 0), 1: getPinFrequency(1, 0), 2: getPinFrequency(2, 0),
};

// The fallback WAV is synthesized at D4, independently of the open-string
// tuning, so its playback rate must always be calculated from this pitch.
const FALLBACK_SAMPLE_FREQUENCY = 293.66;

export { getPinFrequency } from "@/lib/audio/pinTuning";

type AudioStatus = "locked" | "ready" | "error";
type SafariAudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
type MediaPlayers = {
  pin: HTMLAudioElement[];
  click: HTMLAudioElement[];
  urls: [string, string];
};
type SafariPitchAudio = HTMLAudioElement & { webkitPreservesPitch?: boolean };

const PIN_VOICE_COUNT = 8;
const CLICK_VOICE_COUNT = 2;

function shouldUseHtmlAudio() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Lightweight physical-style synthesis keeps latency low and requires no audio downloads. */
export function usePinAudio(volume = 0.8) {
  const contextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const primedRef = useRef(false);
  const mediaRef = useRef<MediaPlayers | null>(null);
  const mediaUnlockedRef = useRef(false);
  const nextPinVoiceRef = useRef(0);
  const nextClickVoiceRef = useRef(0);
  const [status, setStatus] = useState<AudioStatus>("locked");
  const [error, setError] = useState<string | null>(null);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext ?? (window as SafariAudioWindow).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is not supported");
      const context = new AudioContextClass({ latencyHint: "interactive" });
      const master = context.createGain();
      master.gain.value = 0.78;
      master.connect(context.destination);
      contextRef.current = context;
      masterRef.current = master;
    }
    return contextRef.current;
  }, []);

  const getMediaPlayers = useCallback(() => {
    if (!mediaRef.current) {
      const urls: [string, string] = [createSynthWavUrl("pin"), createSynthWavUrl("click")];
      const pin = Array.from({ length: PIN_VOICE_COUNT }, () => new Audio(urls[0]));
      const click = Array.from({ length: CLICK_VOICE_COUNT }, () => new Audio(urls[1]));
      for (const player of [...pin, ...click]) {
        player.preload = "auto";
        player.setAttribute("playsinline", "");
        player.style.display = "none";
        document.body.appendChild(player);
      }
      mediaRef.current = { pin, click, urls };
    }
    return mediaRef.current;
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (shouldUseHtmlAudio()) {
        const media = getMediaPlayers();
        if (!mediaUnlockedRef.current) {
          // Every pooled element must start in this direct tap call stack on
          // iOS. Once authorized, separate voices can overlap for tremolo.
          const players = [...media.pin, ...media.click];
          const starts = players.map((player) => {
            player.volume = 0.01 * volume;
            player.currentTime = 0;
            return player.play();
          });
          await Promise.all(starts);
          players.forEach((player) => {
            player.pause();
            player.currentTime = 0;
          });
          mediaUnlockedRef.current = true;
        }
        setStatus("ready");
        setError(null);
        return true;
      }

      const context = getContext();

      // iOS Safari needs an audio source to start inside a direct user gesture.
      // Prime a silent one-frame buffer before awaiting resume(), so later camera
      // callbacks are allowed to play without another tap.
      if (!primedRef.current) {
        const source = context.createBufferSource();
        source.buffer = context.createBuffer(1, 1, context.sampleRate);
        source.connect(context.destination);
        source.start(0);
        primedRef.current = true;
      }

      if (context.state !== "running") await context.resume();
      const ready = context.state === "running";
      setStatus(ready ? "ready" : "locked");
      setError(ready ? null : "แตะปุ่มเปิดเสียงอีกครั้ง");
      return ready;
    } catch (reason) {
      console.error("Unable to unlock Web Audio", reason);
      setStatus("error");
      setError("เปิดระบบเสียงไม่สำเร็จ กรุณาตรวจสอบว่า iPad ไม่ได้อยู่ในโหมดปิดเสียง");
      return false;
    }
  }, [getContext, getMediaPlayers, volume]);

  const pluck = useCallback(async (string: StringIndex, fret: number) => {
    if (!(await unlock())) return false;

    if (shouldUseHtmlAudio()) {
      try {
        const voices = getMediaPlayers().pin;
        const voiceIndex = nextPinVoiceRef.current;
        const player = voices[voiceIndex];
        nextPinVoiceRef.current = (voiceIndex + 1) % voices.length;
        player.pause();
        player.currentTime = 0;
        player.volume = volume;
        const playbackRate = getPinFrequency(string, fret) / FALLBACK_SAMPLE_FREQUENCY;
        // Safari preserves pitch when playbackRate changes unless explicitly
        // disabled, which made every fret sound like the base D note.
        player.preservesPitch = false;
        (player as SafariPitchAudio).webkitPreservesPitch = false;
        player.defaultPlaybackRate = playbackRate;
        player.playbackRate = playbackRate;
        await player.play();
        setStatus("ready");
        setError(null);
        return true;
      } catch (reason) {
        console.error("HTML audio pluck failed", reason);
        setStatus("error");
        setError("Safari ยังบล็อกเสียงอยู่ กรุณาแตะปุ่มทดสอบเสียงอีกครั้ง");
        return false;
      }
    }

    // Never schedule oscillators while Safari's AudioContext is suspended.
    const context = getContext();
    const master = masterRef.current;
    if (!master) return false;
    master.gain.value = 0.78 * volume;

    const now = context.currentTime + 0.004;
    const frequency = getPinFrequency(string, fret);
    const voiceGain = context.createGain();
    const highpass = context.createBiquadFilter();
    const presence = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const partials = [
      { multiple: 1, level: 0.48, decay: 1.05 },
      { multiple: 2.004, level: 0.3, decay: 0.68 },
      { multiple: 3.01, level: 0.16, decay: 0.42 },
      { multiple: 4.02, level: 0.09, decay: 0.28 },
      { multiple: 5.03, level: 0.05, decay: 0.2 },
    ];

    highpass.type = "highpass";
    highpass.frequency.setValueAtTime(110, now);
    highpass.Q.value = 0.7;
    presence.type = "peaking";
    presence.frequency.setValueAtTime(2400, now);
    presence.Q.value = 0.85;
    presence.gain.value = 4.5;
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(7600, now);
    lowpass.Q.value = 0.55;
    voiceGain.gain.value = 0.78;
    voiceGain.connect(highpass).connect(presence).connect(lowpass).connect(master);

    // Uneven, quickly fading upper partials give the note a taut plucked-string
    // character instead of the soft triangle-wave tone used previously.
    for (const partial of partials) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency * partial.multiple, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(partial.level, now + 0.0035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
      oscillator.connect(gain).connect(voiceGain);
      oscillator.start(now);
      oscillator.stop(now + partial.decay + 0.02);
    }

    // A short bright noise burst models the plectrum striking the metal string.
    const pickBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.028), context.sampleRate);
    const pickData = pickBuffer.getChannelData(0);
    for (let index = 0; index < pickData.length; index += 1) {
      pickData[index] = (Math.random() * 2 - 1) * (1 - index / pickData.length);
    }
    const pick = context.createBufferSource();
    const pickGain = context.createGain();
    const pickFilter = context.createBiquadFilter();
    pick.buffer = pickBuffer;
    pickFilter.type = "highpass";
    pickFilter.frequency.value = 1800;
    pickGain.gain.setValueAtTime(0.16, now);
    pickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
    pick.connect(pickFilter).connect(pickGain).connect(master);
    pick.start(now);
    pick.stop(now + 0.03);
    return true;
  }, [getContext, getMediaPlayers, unlock, volume]);

  const click = useCallback(async () => {
    if (!(await unlock())) return false;

    if (shouldUseHtmlAudio()) {
      try {
        const voices = getMediaPlayers().click;
        const voiceIndex = nextClickVoiceRef.current;
        const player = voices[voiceIndex];
        nextClickVoiceRef.current = (voiceIndex + 1) % voices.length;
        player.pause();
        player.currentTime = 0;
        player.volume = 0.9 * volume;
        player.playbackRate = 1;
        await player.play();
        return true;
      } catch (reason) {
        console.error("HTML audio metronome failed", reason);
        setStatus("error");
        setError("Safari ยังบล็อกเสียงเมโทรนอม กรุณาแตะปุ่มทดสอบเสียงอีกครั้ง");
        return false;
      }
    }

    const context = getContext();
    const master = masterRef.current;
    if (!master) return false;
    master.gain.value = 0.78 * volume;
    const now = context.currentTime + 0.004;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
    return true;
  }, [getContext, getMediaPlayers, unlock, volume]);

  useEffect(() => () => {
    void contextRef.current?.close();
    if (mediaRef.current) {
      [...mediaRef.current.pin, ...mediaRef.current.click].forEach((player) => {
        player.pause();
        player.remove();
      });
      mediaRef.current.urls.forEach((url) => URL.revokeObjectURL(url));
    }
  }, []);

  return { unlock, pluck, click, status, error };
}
