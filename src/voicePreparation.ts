import type { VoiceClipSource } from "../modules/circle-device";

type NativeVoice = {
  prepareClips?(sources: VoiceClipSource[]): Promise<void>;
  releaseClips?(): Promise<void>;
};

/** Share an in-flight preload, retain successful preparation, and allow retries. */
export function createVoicePreparation(
  native: NativeVoice,
  sources: () => VoiceClipSource[],
) {
  let pending: Promise<void> | undefined;
  const invalidate = () => {
    pending = undefined;
  };
  const prepare = (): Promise<void> => {
    if (!native.prepareClips) return Promise.resolve(); // Existing iOS playback.
    if (!pending) {
      try {
        const request = native.prepareClips(sources()).catch((error) => {
          if (pending === request) invalidate();
          throw error;
        });
        pending = request;
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return pending;
  };
  const release = () => {
    invalidate();
    return native.releaseClips?.() ?? Promise.resolve();
  };
  return { prepare, invalidate, release };
}
