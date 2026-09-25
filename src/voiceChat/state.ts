import { createStore } from 'zustand/vanilla';
import type { VoiceState } from './controller';
export const tableVoiceState = createStore<VoiceState & { tableId: string | null }>(() => ({
  tableId: null, micMuted: true, speakerMuted: false, busy: false, available: false, error: '',
}));
