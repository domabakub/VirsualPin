import type { QuickTake } from "@/lib/takes/types";
import { getPhinNoteName } from "@/lib/audio/phinTuning";

export function TakeTimeline({ take, playheadMs = 0 }: { take: QuickTake; playheadMs?: number }) {
  const duration = Math.max(1, take.durationMs);
  return <div className="take-timeline" aria-label={`ไทม์ไลน์ ${take.notes.length} โน้ต`}>
    <div className="take-string-labels" aria-hidden="true"><span>สาย 1</span><span>สาย 2</span><span>สาย 3</span></div>
    <div className="take-lanes">
      {[0, 1, 2].map(string => <div key={string} className="take-lane" />)}
      {take.notes.map(note => <span
        key={note.id}
        className={`take-note string-${note.string}`}
        aria-label={`${getPhinNoteName(note.string, note.fret, true)} สาย ${note.string + 1} เฟรต ${note.fret}`}
        style={{ left: `${note.onsetMs / duration * 100}%`, width: `${Math.max(2.5, note.durationMs / duration * 100)}%`, top: `${8 + note.string * 44}px` }}
      >{note.fret}</span>)}
      <span className="take-playhead" aria-hidden="true" style={{ left: `${Math.min(100, playheadMs / duration * 100)}%` }} />
    </div>
  </div>;
}

