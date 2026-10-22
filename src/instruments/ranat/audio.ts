import { bars, validBar } from "@/instruments/ranat/model";

export function createRanatBuffer(context: BaseAudioContext, bar: number) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 1.8), context.sampleRate);
  const data = buffer.getChannelData(0), frequency = bars[bar].frequency;
  for (let n = 0; n < data.length; n++) {
    const t = n / context.sampleRate;
    data[n] = Math.min(1, t / .002) * (.5 * Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 4.2)
      + .23 * Math.sin(2 * Math.PI * frequency * 2.76 * t) * Math.exp(-t * 13)
      + .1 * Math.sin(2 * Math.PI * frequency * 5.4 * t) * Math.exp(-t * 25));
  }
  return buffer;
}

/** Modal wood-like synthesis. This is a named demonstration tuning, not a sampled ranat. */
export class RanatAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private starts = new Map<AudioBufferSourceNode, number>();
  private volume = 0.65;
  get time() { return this.context?.currentTime ?? 0; }
  get ready() { return this.context?.state === "running"; }
  async unlock() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -8; limiter.ratio.value = 8;
      this.master.connect(limiter); limiter.connect(this.context.destination);
    }
    await this.context.resume();
    if (!this.ready) throw new Error("Audio context did not start");
  }
  setVolume(volume: number) { this.volume = volume; if (this.master && this.context) this.master.gain.setTargetAtTime(volume, this.time, 0.02); }
  strike(bar: number, velocity = 0.75, at = this.time) {
    const context = this.context;
    if (!context || !this.master || !this.ready || !validBar(bar)) return;
    let buffer = this.buffers.get(bar);
    if (!buffer) {
      buffer = createRanatBuffer(context, bar);
      this.buffers.set(bar, buffer);
    }
    if (this.voices.size >= 40) this.voices.values().next().value?.stop();
    const node = context.createBufferSource(), gain = context.createGain();
    node.buffer = buffer; gain.gain.value = velocity;
    node.connect(gain); gain.connect(this.master); this.voices.add(node);
    const start = Math.max(this.time, at); this.starts.set(node, start);
    node.onended = () => { this.voices.delete(node); this.starts.delete(node); node.disconnect(); gain.disconnect(); };
    node.start(start);
  }
  click(accent: boolean) {
    if (!this.context || !this.master || !this.ready) return;
    const osc = this.context.createOscillator(), gain = this.context.createGain();
    osc.frequency.value = accent ? 1350 : 950; gain.gain.setValueAtTime(0.13, this.time);
    gain.gain.exponentialRampToValueAtTime(0.001, this.time + 0.035);
    osc.connect(gain); gain.connect(this.master); osc.start(); osc.stop(this.time + 0.04);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  cancelPending() { for (const [node, time] of this.starts) if (time > this.time) { try { node.stop(); } catch { /* Already stopped. */ } this.starts.delete(node); } }
  stop() { for (const node of this.voices) { try { node.stop(); } catch { /* Already ended. */ } } this.voices.clear(); this.starts.clear(); }
  dispose() { this.stop(); void this.context?.close(); this.context = null; this.master = null; this.buffers.clear(); }
}
