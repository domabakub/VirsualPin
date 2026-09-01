type WavKind = "pin" | "click";

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

/**
 * Builds a small PCM WAV in memory for Safari's HTMLAudioElement fallback.
 * No download or audio asset is required.
 */
export function createSynthWavUrl(kind: WavKind) {
  const sampleRate = 44_100;
  const duration = kind === "pin" ? 1.08 : 0.085;
  const frameCount = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + frameCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + frameCount * 2, true);
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
  view.setUint32(40, frameCount * 2, true);

  let noiseSeed = 0x51f15e;
  let previousNoise = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = frame / sampleRate;
    let sample: number;
    if (kind === "pin") {
      const frequency = 293.66;
      const attack = Math.min(1, time / 0.0035);
      const partials =
        Math.sin(2 * Math.PI * frequency * time) * 0.48 * Math.exp(-5.3 * time)
        + Math.sin(2 * Math.PI * frequency * 2.004 * time) * 0.3 * Math.exp(-8.1 * time)
        + Math.sin(2 * Math.PI * frequency * 3.01 * time) * 0.16 * Math.exp(-11.5 * time)
        + Math.sin(2 * Math.PI * frequency * 4.02 * time) * 0.09 * Math.exp(-15 * time)
        + Math.sin(2 * Math.PI * frequency * 5.03 * time) * 0.05 * Math.exp(-19 * time);

      // Deterministic high-passed noise creates the initial pick click without
      // adding low-frequency rumble to the Safari fallback sample.
      noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0;
      const noise = noiseSeed / 0xffffffff * 2 - 1;
      const pick = (noise - previousNoise) * Math.exp(-95 * time) * 0.13;
      previousNoise = noise;
      sample = partials * attack + pick;
    } else {
      const decay = Math.exp(-9 * time / duration);
      const high = Math.sin(2 * Math.PI * 880 * time);
      const transient = Math.sin(2 * Math.PI * 1760 * time) * 0.32;
      sample = (high + transient) * decay * 0.72;
    }
    view.setInt16(44 + frame * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}
