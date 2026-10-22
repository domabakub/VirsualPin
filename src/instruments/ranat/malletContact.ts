import { HAND_TIMEOUT_MS, type MalletCommand, type MalletHand } from "@/instruments/ranat/handMallets";
import type { Articulation } from "@/instruments/ranat/model";

export type ContactBar = { bar: number; left: number; right: number; front: number; back: number; top: number };
export type ContactHead = { hand: MalletHand; x: number; z: number; bottom: number };
type State = { head: ContactHead; time: number; armed: boolean; held: boolean; bar: number | null };

/** Swept head contact against the measured tops of the 3D bars. */
export class MalletContactController {
  private states = new Map<MalletHand, State>();
  reset(): MalletCommand[] {
    const commands: MalletCommand[] = [];
    for (const [hand, state] of this.states) if (state.held) commands.push({ kind: "release", owner: `contact-${hand}` });
    this.states.clear();
    return commands;
  }
  update(heads: ContactHead[], bars: ContactBar[], now: number, mode: Articulation): MalletCommand[] {
    const commands: MalletCommand[] = [];
    const seen = new Set<MalletHand>();
    for (const head of heads) {
      if (![head.x, head.z, head.bottom, now].every(Number.isFinite)) continue;
      seen.add(head.hand);
      let prev = this.states.get(head.hand);
      if (prev && (now <= prev.time || now - prev.time > HAND_TIMEOUT_MS)) {
        if (prev.held) commands.push({ kind: "release", owner: `contact-${head.hand}` });
        prev = undefined;
      }
      const below = bars.find(b => head.x >= b.left && head.x <= b.right && head.z >= b.front && head.z <= b.back);
      const lifted = below ? head.bottom - below.top > .015 : false;
      const state: State = { head, time: now, armed: lifted || (prev?.armed ?? false), held: prev?.held ?? false, bar: prev?.bar ?? null };
      if (state.held && (!below || lifted || below.bar !== state.bar)) {
        commands.push({ kind: "release", owner: `contact-${head.hand}` }); state.held = false;
      }
      if (prev && state.armed && head.bottom < prev.head.bottom) {
        const crossed = bars.map(b => {
          const top = b.top + .001;
          const t = (prev.head.bottom - top) / (prev.head.bottom - head.bottom);
          const x = prev.head.x + (head.x - prev.head.x) * t, z = prev.head.z + (head.z - prev.head.z) * t;
          return { b, t, inside: t >= 0 && t <= 1 && x >= b.left && x <= b.right && z >= b.front && z <= b.back };
        }).filter(c => c.inside).sort((a, b) => a.t - b.t)[0];
        if (crossed) {
          const bar = crossed.b.bar, owner = `contact-${head.hand}`;
          const velocity = Math.min(1, Math.max(.45, (prev.head.bottom - head.bottom) / ((now - prev.time) / 1000)));
          const hold = mode === "kro" || mode === "roll";
          commands.push(hold ? { kind: "hold", bar, hand: head.hand, owner } : { kind: "strike", bar, hand: head.hand, owner, velocity });
          state.armed = false; state.held = hold; state.bar = bar;
        }
      }
      this.states.set(head.hand, state);
    }
    for (const [hand, state] of this.states) if (!seen.has(hand)) {
      if (state.held) commands.push({ kind: "release", owner: `contact-${hand}` });
      this.states.delete(hand);
    }
    return commands;
  }
}
