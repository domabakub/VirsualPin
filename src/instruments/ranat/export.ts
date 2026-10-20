import { createRanatBuffer } from "@/instruments/ranat/audio";
import type { RanatTake } from "@/instruments/ranat/model";
export function encodeWave(samples: Float32Array, rate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); };
  text(0,"RIFF"); view.setUint32(4, buffer.byteLength - 8, true); text(8,"WAVE"); text(12,"fmt "); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,rate,true); view.setUint32(28,rate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); text(36,"data"); view.setUint32(40,samples.length*2,true);
  for (let i = 0; i < samples.length; i++) { const value = Math.max(-1,Math.min(1,samples[i])); view.setInt16(44+i*2,Math.round(value*(value<0?32768:32767)),true); }
  return buffer;
}
export async function renderRanatWave(take: RanatTake) {
  const rate = 22050, context = new OfflineAudioContext(1, Math.ceil((take.durationMs/1000+1.8)*rate), rate);
  const cache = new Map<number, AudioBuffer>(), master = context.createGain(), limiter = context.createDynamicsCompressor();
  master.gain.value = .65; limiter.threshold.value = -8; limiter.ratio.value = 8; master.connect(limiter); limiter.connect(context.destination);
  for (const note of take.events) {
    let buffer = cache.get(note.bar); if (!buffer) { buffer = createRanatBuffer(context,note.bar); cache.set(note.bar,buffer); }
    const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer; gain.gain.value = note.velocity; source.connect(gain); gain.connect(master); source.start(note.onsetMs/1000);
  }
  const result = await context.startRendering(); return new Blob([encodeWave(result.getChannelData(0),rate)],{type:"audio/wav"});
}
