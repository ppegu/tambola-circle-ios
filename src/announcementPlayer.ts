/** Starts a clip asynchronously and returns a synchronous cancellation function. */
export type VoiceClip = number | string;
export type StartClip = (clip: VoiceClip, ended: () => void, failed: () => void) => () => void;
export type Announcement = { digits?: VoiceClip; full: VoiceClip };

/** Busy includes loading and the silent gap, so automatic calling cannot cut in. */
export function createAnnouncementPlayer(startClip: StartClip, onError: () => void, onIdle: () => void = () => {}) {
  let generation = 0;
  let busy = false;
  let cancelClip: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    generation++;
    busy = false;
    clearTimeout(timer);
    timer = undefined;
    const cancel = cancelClip;
    cancelClip = undefined;
    cancel?.();
  };
  const speak = (call: Announcement, pauseSeconds: number) => {
    stop();
    const ticket = generation;
    busy = true;
    const play = (clip: VoiceClip, after: () => void) => {
      if (ticket !== generation) return;
      let settled = false;
      const finish = (failed: boolean) => {
        if (ticket !== generation || settled) return;
        settled = true;
        clearTimeout(timer);
        const cancel = cancelClip;
        cancelClip = undefined;
        cancel?.();
        if (failed) { stop(); onError(); }
        else after();
      };
      // A missing clip must not leave automatic calling permanently busy.
      timer = setTimeout(() => finish(true), 15000);
      try {
        const cancel = startClip(clip, () => finish(false), () => finish(true));
        if (settled || ticket !== generation) cancel(); else cancelClip = cancel;
      }
      catch { finish(true); }
    };
    const full = () => play(call.full, () => { busy = false; onIdle(); });
    if (call.digits === undefined) full();
    else play(call.digits, () => { timer = setTimeout(full, pauseSeconds * 1000); });
  };
  return { speak, stop, isSpeaking: () => busy };
}
