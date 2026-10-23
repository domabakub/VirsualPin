import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePlaybackSession } from '../src/lib/audio/playbackSession.ts';

test('instrument audio requests playback routing and restores it after an interruption', () => {
  const target = { audioSession: { type: 'auto' } };
  preparePlaybackSession(target);
  assert.equal(target.audioSession.type, 'playback');
  target.audioSession.type = 'ambient';
  preparePlaybackSession(target);
  assert.equal(target.audioSession.type, 'playback');
});

test('unsupported session APIs never block instrument audio', () => {
  assert.doesNotThrow(() => preparePlaybackSession({}));
  assert.doesNotThrow(() => preparePlaybackSession({ audioSession: Object.freeze({ type: 'auto' }) }));
});

test('already selected playback routing is not reset on every note', () => {
  const session = { get type() { return 'playback'; }, set type(value) { assert.fail(`Unexpected session change: ${value}`); } };
  preparePlaybackSession({ audioSession: session });
});
