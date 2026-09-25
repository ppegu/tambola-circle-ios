import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CircleDevice from '../modules/circle-device';
import catalog from '../shared/voicePacks.json';
import { createVoicePackManager, type CallerVoicePack } from './voicePackManager';

export const VOICE_CDN = 'https://tambola-circle-voices.ffegu0617.workers.dev';
export const CALLER_VOICES: CallerVoicePack[] = catalog.packs;
export const voicePack = (id: string) => CALLER_VOICES.find(pack => pack.id === id) ?? CALLER_VOICES[0]!;
// One complete number call per voice is packaged with the app so the picker can
// audition every voice immediately, even before its full bank is downloaded.
export const VOICE_PREVIEW_ASSETS: Record<string, number> = {
  aria: require('../assets/voice/aria/47.wav'),
  neerja: require('../assets/voice/previews/neerja-47.wav'),
  ava: require('../assets/voice/previews/ava-47.wav'),
  emma: require('../assets/voice/previews/emma-47.wav'),
  sonia: require('../assets/voice/previews/sonia-47.wav'),
};
const key = 'tambola.circle.caller-voice.v1';
export const voicePacks = createVoicePackManager(CALLER_VOICES, CircleDevice, {
  load: () => AsyncStorage.getItem(key), save: id => AsyncStorage.setItem(key, id),
}, VOICE_CDN);
void voicePacks.initialize();
export function useCallerVoices() { return useSyncExternalStore(voicePacks.subscribe, voicePacks.getSnapshot); }
export function voiceFileUri(id: string, number: number): string | undefined {
  const pack = voicePack(id), index = pack.files.findIndex(file => file.number === number);
  return voicePacks.getSnapshot().installed[id]?.[index];
}
export function voiceDownloadUrl(id: string, number: number) { const pack = voicePack(id); return `${VOICE_CDN}/packs/${id}/${pack.revision}/${number}.wav`; }
