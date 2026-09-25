import { AppState, NativeEventEmitter } from 'react-native';
import CircleDevice from '../../modules/circle-device';
import { request } from '../api';
import { randomUUID } from '../native/crypto';
import { onlineStore } from '../online/onlineStore';
import { VoiceController } from './controller';
import { nativeVoicePeer } from './nativePeer';
import { tableVoiceState } from './state';
import type { VoiceReply } from '../../shared/tableVoice';

let current: VoiceController | undefined;
export function toggleTableMic() {
  if (current) current.toggleMic();
  else tableVoiceState.setState({ error: 'Voice unavailable. Tap the mic to retry.', micMuted: true, busy: false });
}
export function toggleTableSpeaker() {
  if (current) current.toggleSpeaker();
  else tableVoiceState.setState(s => ({ speakerMuted: !s.speakerMuted }));
}

/** Mounted once by the retained native root, not by individual pushed screens. */
export function startTableVoice() {
  let tableId: string | null = null, sessionKey = '', speakerMuted = false;
  function sync() {
    const s = onlineStore.getState(), snapshot = s.snapshot;
    const member = snapshot?.members[snapshot.viewerId];
    const nextTable = snapshot && member && !member.left && !member.removed ? snapshot.id : null;
    const changedTable = nextTable !== tableId;
    speakerMuted = changedTable ? false : tableVoiceState.getState().speakerMuted;
    tableId = nextTable;
    const key = tableId && s.identity?.key && s.connected && AppState.currentState === 'active' ? `${tableId}:${s.identity.key}` : '';
    if (key === sessionKey && !changedTable) return;
    const previous = current; current = undefined; previous?.stop(); sessionKey = key;
    tableVoiceState.setState({ tableId, micMuted: true, speakerMuted, busy: false, available: false, error: '' });
    if (!key || !tableId || !s.identity?.key) return;
    const token = s.identity.key, id = tableId, clientId = randomUUID();
    const controller = new VoiceController({
      api: body => request<VoiceReply>(`/v2/tables/${id}/voice`, { token, method: 'POST', body: { ...body, clientId }, timeoutMs: 25_000 }),
      peer: nativeVoicePeer,
      changed: state => { if (current === controller) { speakerMuted = state.speakerMuted; tableVoiceState.setState({ ...state, tableId: id }); } },
    }, speakerMuted);
    current = controller; controller.start();
  }
  const unsubscribe = onlineStore.subscribe(sync);
  const appState = AppState.addEventListener('change', sync);
  const interrupt = new NativeEventEmitter(CircleDevice).addListener('CircleAudioInterrupted', () => {
    current?.stop(); current = undefined; sessionKey = '';
    tableVoiceState.setState({ micMuted: true, busy: false, available: false });
    // Recovery occurs on next table heartbeat; capture remains off.
  });
  sync();
  return () => { unsubscribe(); appState.remove(); interrupt.remove(); current?.stop(); current = undefined;
    tableVoiceState.setState({ tableId: null, micMuted: true, speakerMuted: false, busy: false, available: false, error: '' }); };
}
