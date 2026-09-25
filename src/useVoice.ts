import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { tableVoiceState } from './voiceChat/state';
import CircleDevice from '../modules/circle-device';
import { useGamePreferences } from './gamePreferences';
import { setGameAudioActive } from './gameAudioSession';
import { VOICE_BANK } from './voiceBank';
import { createClipPlayer, voiceAssetUri } from './playClip';
import { createVoicePreparation } from './voicePreparation';
import { createAnnouncementPlayer } from './announcementPlayer';
import { CALLER_VOICES, VOICE_PREVIEW_ASSETS, useCallerVoices, voiceDownloadUrl, voiceFileUri, voicePack, voicePacks } from './voicePacks';
import { registerVoicePreview } from './voicePreview';
import type { CallPause, Voice } from '../shared/preferences';
import type { VoiceClipSource } from '../modules/circle-device';

function bankFor(id: string, preview = false) {
  const pack = voicePack(id);
  if (preview) {
    const sources = CALLER_VOICES.map(voice => {
      const sample = voice.files.find(file => file.number === 47)!;
      return { uri: voiceAssetUri(VOICE_PREVIEW_ASSETS[voice.id]!, sample.sha256), durationMs: sample.durationMs };
    });
    const index = CALLER_VOICES.findIndex(voice => voice.id === pack.id);
    return { key: 'bundled-previews', sources, calls: { 47: { full: sources[index]!.uri } } };
  }
  const files = pack.files;
  const sources = files.map(file => ({
    uri: pack.bundled ? voiceAssetUri(VOICE_BANK.female[file.number]!.full, file.sha256)
      : voiceFileUri(pack.id, file.number) ?? voiceDownloadUrl(pack.id, file.number),
    durationMs: file.durationMs,
  }));
  return { key: `${pack.id}:${pack.revision}:${files.length}`, sources,
    calls: Object.fromEntries(files.map((file, index) => [file.number, { full: sources[index]!.uri }])) };
}

export function useVoice(enabled: boolean, voice: Voice, callPause: CallPause, gameActive = false) {
  const [error, setError] = useState('');
  const [preparing, setPreparing] = useState(enabled && !!CircleDevice.prepareClips);
  const { selected, loading: restoringVoice } = useCallerVoices();
  const bank = useRef<{ key: string; sources: VoiceClipSource[] }>({ key: '', sources: [] });
  const [preparation] = useState(() => createVoicePreparation(CircleDevice, () => bank.current.sources));
  const warmGeneration = useRef(0), generation = useRef(0);
  const voiceVolume = useGamePreferences(state => state.voiceVolume);
  const tableMuted = useStore(tableVoiceState, s => !!s.tableId && s.speakerMuted);
  const inGame = useRef(gameActive); inGame.current = gameActive;
  const previewMounted = useRef(false), previewGeneration = useRef(0);
  const previewCleanup = useRef(Promise.resolve());
  const warm = useRef<() => void>(() => {});
  const preview = useRef<{ resolve(): void; reject(error: Error): void } | undefined>(undefined);
  const [player] = useState(() => createAnnouncementPlayer(createClipPlayer(preparation), () => {
    setError('Could not play voice. Tap the speaker to retry.');
    const pending = preview.current; preview.current = undefined;
    pending?.reject(new Error('Preview unavailable. Check your connection and try again.'));
    if (!inGame.current) void setGameAudioActive(false).catch(() => {});
  }, () => {
    const pending = preview.current; preview.current = undefined; pending?.resolve();
    if (!inGame.current) void setGameAudioActive(false).catch(() => {});
    warm.current();
  }));
  const chooseBank = useCallback((next: ReturnType<typeof bankFor>) => {
    if (bank.current.key !== next.key) { bank.current = next; preparation.invalidate(); }
  }, [preparation]);
  warm.current = () => {
    // A changed preference must not interrupt the number currently being spoken.
    if (previewMounted.current || player.isSpeaking() || AppState.currentState !== 'active' || !enabled || !CircleDevice.prepareClips) return;
    const ticket = ++warmGeneration.current;
    chooseBank(bankFor(voicePacks.getSnapshot().selected)); setPreparing(true);
    void preparation.prepare().then(() => {
      if (ticket === warmGeneration.current) { setPreparing(false); setError(''); }
    }, () => {
      if (ticket === warmGeneration.current) { setPreparing(false); setError('Could not prepare voice. Tap the speaker to retry.'); }
    });
  };
  useEffect(() => { void CircleDevice.setVoiceVolume?.(tableMuted ? 0 : voiceVolume).catch(() => {}); }, [voiceVolume, tableMuted]);
  const stop = useCallback(() => {
    generation.current++; player.stop(); setError('');
    const pending = preview.current; preview.current = undefined; pending?.resolve();
    if (!inGame.current) void setGameAudioActive(false).catch(() => {});
  }, [player]);
  useEffect(() => { if (tableMuted) stop(); }, [tableMuted, stop]);
  useEffect(() => {
    const update = () => {
      const active = AppState.currentState === 'active';
      void setGameAudioActive(gameActive && active).catch(() => setError('Audio unavailable. Visual calling still works.'));
      if (!active) { warmGeneration.current++; setPreparing(false); void preparation.release().catch(() => {}); }
      else warm.current();
    };
    update();
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') stop(); update(); });
    return () => { listener.remove(); warmGeneration.current++; stop(); void setGameAudioActive(false).catch(() => {}); };
  }, [gameActive, enabled, preparation, stop]);
  useEffect(() => { warm.current(); }, [selected]);
  useEffect(() => () => { void preparation.release().catch(() => {}); }, [preparation]);
  useEffect(() => { stop(); }, [enabled, voice, callPause, stop]);
  const call = useCallback((n: number, force = false, id = voicePacks.getSnapshot().selected, audition = false) => {
    const tableAudio = tableVoiceState.getState();
    if (tableAudio.tableId && tableAudio.speakerMuted) return false;
    if ((!enabled && !force) || !Number.isInteger(n) || n < 1 || n > 90 || AppState.currentState !== 'active') return false;
    if (!audition && !voicePacks.ready(id)) id = 'aria';
    const next = bankFor(id, audition), clip = next.calls[n]; if (!clip) return false;
    warmGeneration.current++; setPreparing(false); setError(''); player.stop(); chooseBank(next);
    const current = ++generation.current;
    void setGameAudioActive(true).catch(() => { if (current === generation.current) setError('Audio unavailable. Tap the speaker to retry.'); });
    player.speak(clip, 0);
    return true;
  }, [chooseBank, enabled, player]);
  const speak = useCallback((n: number, force = false) => {
    const pending = preview.current; preview.current = undefined; pending?.resolve(); call(n, force);
  }, [call]);
  useEffect(() => registerVoicePreview({
    play: id => new Promise<void>((resolve, reject) => {
      stop(); preview.current = { resolve, reject };
      if (!call(47, true, id, true)) { preview.current = undefined; reject(new Error('Preview is unavailable while the app is in the background.')); }
    }),
    stop: () => { if (preview.current) { stop(); warm.current(); } },
    prepare: async () => {
      const ticket = ++previewGeneration.current;
      previewMounted.current = true;
      await previewCleanup.current;
      if (ticket !== previewGeneration.current || AppState.currentState !== 'active') return;
      stop(); chooseBank(bankFor('aria', true));
      await preparation.prepare();
    },
    release: () => {
      ++previewGeneration.current;
      previewMounted.current = false;
      stop();
      previewCleanup.current = preparation.release().catch(() => {});
      void previewCleanup.current.then(() => { if (!previewMounted.current) warm.current(); });
    },
  }), [call, stop]);
  return { speak, stop, isSpeaking: player.isSpeaking, preparing: preparing || (enabled && restoringVoice), error };
}
