import { getPhinFrequency, getPhinMidi } from "@/lib/audio/phinTuning";
import { BEATS_PER_BAR, STUDIO_BEATS, type StudioBendPoint, type StudioProject } from "@/lib/studio/types";

const MIDI_TICKS_PER_BEAT = 480;

function ascii(value: string) {
  return Array.from(value, character => character.charCodeAt(0));
}

function uint32(value: number) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function uint16(value: number) {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function variableLength(value: number) {
  let buffer = value & 0x7f;
  const result: number[] = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    result.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return result;
}

function midiTrack(events: number[]) {
  return [...ascii("MTrk"), ...uint32(events.length), ...events];
}

function metaText(type: number, value: string) {
  const encoded = new TextEncoder().encode(value);
  return [0, 0xff, type, ...variableLength(encoded.length), ...encoded];
}

type MidiEvent = { tick: number; priority: number; bytes: number[] };

function encodeTimedEvents(events: MidiEvent[]) {
  const bytes: number[] = [];
  let previousTick = 0;
  events.sort((a, b) => a.tick - b.tick || a.priority - b.priority);
  for (const event of events) {
    bytes.push(...variableLength(Math.max(0, event.tick - previousTick)), ...event.bytes);
    previousTick = event.tick;
  }
  bytes.push(0, 0xff, 0x2f, 0);
  return bytes;
}

export function createStudioMidi(project: StudioProject) {
  const microsecondsPerBeat = Math.round(60_000_000 / project.bpm);
  const tempoTrack = [
    ...metaText(0x03, project.name),
    0, 0xff, 0x51, 3,
    (microsecondsPerBeat >>> 16) & 0xff,
    (microsecondsPerBeat >>> 8) & 0xff,
    microsecondsPerBeat & 0xff,
    0, 0xff, 0x58, 4, BEATS_PER_BAR, 2, 24, 8,
    0, 0xff, 0x2f, 0,
  ];

  const phinEvents: MidiEvent[] = [];
  for (let channel = 0; channel < 3; channel += 1) {
    phinEvents.push({ tick: 0, priority: -10, bytes: [0xb0 | channel, 101, 0] });
    phinEvents.push({ tick: 0, priority: -9, bytes: [0xb0 | channel, 100, 0] });
    phinEvents.push({ tick: 0, priority: -8, bytes: [0xb0 | channel, 6, 12] });
    phinEvents.push({ tick: 0, priority: -7, bytes: [0xb0 | channel, 38, 0] });
  }
  project.notes.forEach(note => {
    const start = Math.max(0, Math.round(note.beat * MIDI_TICKS_PER_BEAT));
    const end = Math.max(start + 30, Math.round((note.beat + note.durationBeats) * MIDI_TICKS_PER_BEAT));
    const midi = getPhinMidi(note.string, note.fret);
    const channel = note.string;
    phinEvents.push({ tick: start, priority: 0, bytes: [0xe0 | channel, 0, 64] });
    phinEvents.push({ tick: start, priority: 1, bytes: [0x90 | channel, midi, note.velocity] });
    note.bendPoints?.forEach(point => {
      const tick = Math.max(start, Math.min(end - 1, Math.round((note.beat + point.offsetBeats) * MIDI_TICKS_PER_BEAT)));
      const value = Math.max(0, Math.min(16_383, Math.round(8_192 + point.cents / 1_200 * 8_192)));
      phinEvents.push({ tick, priority: 2, bytes: [0xe0 | channel, value & 0x7f, (value >> 7) & 0x7f] });
    });
    phinEvents.push({ tick: end, priority: 0, bytes: [0x80 | channel, midi, 0] });
    phinEvents.push({ tick: end, priority: 1, bytes: [0xe0 | channel, 0, 64] });
  });
  const phinTrack = [...metaText(0x03, "Virtual Phin"), ...encodeTimedEvents(phinEvents)];

  const drumEvents: MidiEvent[] = [];
  if (project.drumEnabled) {
    for (let step = 0; step < STUDIO_BEATS * 2; step += 1) {
      const beat = step / 2;
      const withinBar = step % 8;
      const note = withinBar === 0 || withinBar === 4 ? 36 : withinBar === 2 || withinBar === 6 ? 38 : 42;
      const velocity = note === 42 ? 66 : 94;
      const start = Math.round(beat * MIDI_TICKS_PER_BEAT);
      drumEvents.push({ tick: start, priority: 1, bytes: [0x99, note, velocity] });
      drumEvents.push({ tick: start + 45, priority: 0, bytes: [0x89, note, 0] });
    }
  }
  const drumTrack = [...metaText(0x03, "Isan Demo Beat"), ...encodeTimedEvents(drumEvents)];

  const tracks = project.drumEnabled ? [tempoTrack, phinTrack, drumTrack] : [tempoTrack, phinTrack];
  const header = [...ascii("MThd"), ...uint32(6), ...uint16(1), ...uint16(tracks.length), ...uint16(MIDI_TICKS_PER_BEAT)];
  return new Blob([Uint8Array.from([...header, ...tracks.flatMap(midiTrack)]).buffer], { type: "audio/midi" });
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
}

function bendAt(points: StudioBendPoint[] | undefined, beat: number) {
  if (!points?.length) return 0;
  let previous = points[0];
  for (let index = 1; index < points.length; index += 1) {
    const next = points[index];
    if (beat <= next.offsetBeats) {
      const span = Math.max(0.0001, next.offsetBeats - previous.offsetBeats);
      const mix = Math.max(0, Math.min(1, (beat - previous.offsetBeats) / span));
      return previous.cents + (next.cents - previous.cents) * mix;
    }
    previous = next;
  }
  return previous.cents;
}

function addPhinNote(samples: Float32Array, sampleRate: number, start: number, frequency: number, level: number, noteBeats: number, secondsPerBeat: number, bendPoints?: StudioBendPoint[]) {
  const heldDuration = Math.max(0.08, noteBeats * secondsPerBeat);
  const duration = Math.min(8, heldDuration + 0.16);
  const startFrame = Math.max(0, Math.floor(start * sampleRate));
  const frames = Math.min(Math.floor(duration * sampleRate), samples.length - startFrame);
  const partials = [
    [1, 0.48, 5.3], [2.004, 0.3, 8.1], [3.01, 0.16, 11.5], [4.02, 0.09, 15], [5.03, 0.05, 19],
  ] as const;
  let phase = 0;
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / sampleRate;
    const attack = Math.min(1, time / 0.0035);
    const release = time <= heldDuration ? 1 : Math.max(0, 1 - (time - heldDuration) / 0.16);
    const cents = bendAt(bendPoints, time / secondsPerBeat);
    const bentFrequency = frequency * 2 ** (cents / 1_200);
    phase += 2 * Math.PI * bentFrequency / sampleRate;
    let sample = 0;
    for (const [multiple, partialLevel, decay] of partials) {
      sample += Math.sin(phase * multiple) * partialLevel * Math.exp(-decay * time * 0.45);
    }
    samples[startFrame + frame] += sample * attack * release * level;
  }
}

function addDrumHit(samples: Float32Array, sampleRate: number, start: number, kind: "kick" | "snare" | "hat", level: number) {
  const duration = kind === "kick" ? 0.28 : kind === "snare" ? 0.2 : 0.07;
  const startFrame = Math.max(0, Math.floor(start * sampleRate));
  const frames = Math.min(Math.floor(duration * sampleRate), samples.length - startFrame);
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / sampleRate;
    let sample: number;
    if (kind === "kick") {
      const frequency = 52 + 70 * Math.exp(-28 * time);
      sample = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-15 * time);
    } else if (kind === "snare") {
      const noise = Math.sin(frame * 12.9898) * Math.sin(frame * 78.233);
      sample = (noise * 0.7 + Math.sin(2 * Math.PI * 185 * time) * 0.3) * Math.exp(-22 * time);
    } else {
      sample = Math.sin(frame * 46.17) * Math.sin(frame * 7.31) * Math.exp(-58 * time);
    }
    samples[startFrame + frame] += sample * level;
  }
}

export function createStudioWav(project: StudioProject) {
  const sampleRate = 44_100;
  const secondsPerBeat = 60 / project.bpm;
  const duration = STUDIO_BEATS * secondsPerBeat + 1.1;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));

  if (!project.phinMuted) {
    project.notes.forEach(note => {
      addPhinNote(samples, sampleRate, note.beat * secondsPerBeat, getPhinFrequency(note.string, note.fret), project.phinVolume * note.velocity / 127 * 0.72, note.durationBeats, secondsPerBeat, note.bendPoints);
    });
  }

  if (project.drumEnabled && !project.drumMuted) {
    for (let step = 0; step < STUDIO_BEATS * 2; step += 1) {
      const withinBar = step % 8;
      const kind = withinBar === 0 || withinBar === 4 ? "kick" : withinBar === 2 || withinBar === 6 ? "snare" : "hat";
      addDrumHit(samples, sampleRate, step * 0.5 * secondsPerBeat, kind, project.drumVolume * (kind === "hat" ? 0.28 : 0.62));
    }
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  const normalization = peak > 0.96 ? 0.96 / peak : 1;
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] * normalization));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
