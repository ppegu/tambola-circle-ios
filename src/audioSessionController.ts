type NativeAudio = { setAudioActive: (active: boolean) => Promise<void> };
export function createAudioSessionController(native: NativeAudio) {
  let changes = Promise.resolve();
  return (active: boolean): Promise<void> => {
    changes = changes.catch(() => {}).then(async () => {
      await native.setAudioActive(active);
    });
    return changes;
  };
}
