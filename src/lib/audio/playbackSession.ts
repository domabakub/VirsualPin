type PlaybackNavigator = { audioSession?: { type: string } };

/** Safari can run Web Audio as ambient audio, which obeys the silent switch. */
export function preparePlaybackSession(target: PlaybackNavigator = navigator as PlaybackNavigator) {
  try {
    if (target.audioSession && target.audioSession.type !== "playback") {
      target.audioSession.type = "playback";
    }
  } catch {
    // Older browsers may expose a read-only or unsupported session API.
    // This must not prevent the normal Web Audio path from starting.
  }
}
