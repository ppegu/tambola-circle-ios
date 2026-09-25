import { Image } from 'react-native';
import CircleDevice from '../modules/circle-device';
import type { StartClip } from './announcementPlayer';
import type { createVoicePreparation } from './voicePreparation';

export function voiceAssetUri(clip: number | string, revision?: string): string {
  if (typeof clip === 'string') return clip;
  const source = Image.resolveAssetSource(clip);
  if (!source?.uri) throw new Error('Voice asset is missing');
  // Metro URLs can otherwise reuse cached audio from an older generated bank.
  return revision && /^https?:/.test(source.uri)
    ? `${source.uri}${source.uri.includes('?') ? '&' : '?'}voiceRevision=${revision}`
    : source.uri;
}

let nextClip = 0;
export function createClipPlayer(preparation?: ReturnType<typeof createVoicePreparation>, revisions: Record<number, string> = {}): StartClip {
  return (clip, ended, failed) => {
    let id = String(++nextClip);
    const uri = voiceAssetUri(clip, typeof clip === 'number' ? revisions[clip] : undefined);
    let active = true;
    const play = async () => {
      try {
        if (preparation) await preparation.prepare();
        if (!active) return;
        await CircleDevice.playClip(id, uri);
      }
      catch {
        if (!active) return;
        // Re-prepare a released/failed pool once; cancelled calls never retry.
        preparation?.invalidate();
        await CircleDevice.setAudioActive(true);
        if (preparation && active) await preparation.prepare();
        if (!active) return;
        id = String(++nextClip);
        await CircleDevice.playClip(id, uri);
      }
      if (active) ended();
    };
    void play().catch(() => { if (active) failed(); });
    return () => { active = false; CircleDevice.stopClip(id); };
  };
}
