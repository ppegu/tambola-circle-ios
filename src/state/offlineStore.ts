import { createStore } from 'zustand/vanilla';
import { AppState } from 'react-native';
import * as Crypto from '../native/crypto';
import { type AuthResult, type CloudState, type Preferences } from '../../shared/preferences';
import { API_URL, ApiError, isCloudState, request } from '../api';
import { EMPTY_STATE, readIdentity, readLocal, saveIdentity, saveLocal, type Identity, type LocalState } from '../storage';

type Data = { local: LocalState; identity: Identity | null; ready: boolean; syncStatus: string; saveError: string };
let initialized = false, epoch = 0, syncing = false, authenticating = false;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
const get = () => offlineStore.getState();
const set = (patch: Partial<Data>) => offlineStore.setState(patch);
function scheduleSync() { clearTimeout(syncTimer); syncTimer = setTimeout(() => { void sync(); }, 700); }
function commit(local: LocalState) {
  const changed = get().local.preferences !== local.preferences;
  set({ local });
  void saveLocal(local).then(() => set({ saveError: '' })).catch(() => set({ saveError: 'Device storage is unavailable. Changes may not survive closing the app.' }));
  if (changed) scheduleSync();
}
async function identify(identity: Identity | null) { await saveIdentity(identity); set({ identity }); }
async function sync() {
  if (!get().ready || !API_URL || syncing || authenticating) return;
  syncing = true; const ticket = epoch, active = () => ticket === epoch;
  try {
    set({ syncStatus: 'Syncing…' }); let person = get().identity;
    if (!person) { person = { token: 'g_' + Array.from(Crypto.getRandomBytes(32), n => n.toString(16).padStart(2, '0')).join(''), profile: null }; await identify(person); if (!active()) return; }
    let cloud = person.token.startsWith('g_')
      ? await request<CloudState>('/v1/guest', { method: 'POST', body: { guestKey: person.token, preferences: get().local.preferences } })
      : await request<CloudState>('/v1/me', { token: person.token });
    if (!active()) return; if (!isCloudState(cloud)) throw new Error('Invalid server response.');
    if (!person.profile || person.profile.id !== cloud.profile.id) { person = { token: person.token, profile: cloud.profile }; await identify(person); }
    if (!active()) return;
    const captured = get().local;
    if (captured.dirty) {
      try { cloud = await request<CloudState>('/v1/preferences', { method: 'PUT', token: person.token, body: { preferences: captured.preferences, version: cloud.version } }); }
      catch (error) { if (!(error instanceof ApiError) || error.status !== 409 || !isCloudState(error.data)) throw error;
        cloud = await request<CloudState>('/v1/preferences', { method: 'PUT', token: person.token, body: { preferences: captured.preferences, version: error.data.version } }); }
      if (!active()) return; if (!isCloudState(cloud)) throw new Error('Invalid server response.');
      if (get().local.preferences === captured.preferences) commit({ ...get().local, dirty: false, cloudVersion: cloud.version });
    } else if (!get().local.dirty && (JSON.stringify(captured.preferences) !== JSON.stringify(cloud.preferences) || captured.cloudVersion !== cloud.version)) {
      commit({ ...get().local, preferences: cloud.preferences, cloudVersion: cloud.version });
    }
    if (active()) set({ syncStatus: get().local.dirty ? 'Changes waiting to sync' : 'Preferences synced' });
  } catch (error) { if (active()) set({ syncStatus: error instanceof ApiError && error.status === 401 ? 'Sign in again to sync' : 'Offline · saved on this device' }); }
  finally { syncing = false; }
}
const actions = {
  sync, cloudAvailable: !!API_URL,
  updatePreferences(patch: Partial<Preferences>) { commit({ ...get().local, preferences: { ...get().local.preferences, ...patch }, dirty: true }); },
  updateHistory(history: number[]) { commit({ ...get().local, history }); },
  async authenticate(mode: 'register' | 'login' | 'recover', username: string, password: string, recoveryCode?: string) {
    if (authenticating) throw new Error('Please wait for the current request.'); authenticating = true; epoch++;
    try {
      const result = await request<AuthResult>('/v1/auth/' + mode, { method: 'POST', token: mode === 'register' ? get().identity?.token : undefined, body: { username, password, recoveryCode, preferences: get().local.preferences } });
      if (!isCloudState(result) || !/^s_[a-f0-9]{64}$/.test(result.token)) throw new Error('Invalid server response.');
      await identify({ token: result.token, profile: result.profile }); commit({ ...get().local, preferences: result.preferences, dirty: false, cloudVersion: result.version });
      set({ syncStatus: 'Preferences synced' }); return result.recoveryCode;
    } finally { authenticating = false; }
  },
  async signOut() {
    authenticating = true; epoch++;
    try { const person = get().identity; if (person?.token.startsWith('s_')) await request('/v1/logout', { method: 'POST', token: person.token });
      await identify(null); commit({ ...get().local, dirty: true, cloudVersion: 0 }); set({ syncStatus: 'Saved on this device' }); scheduleSync();
    } finally { authenticating = false; }
  },
  async deleteProfile(password: string) {
    authenticating = true; epoch++;
    try { const person = get().identity; if (person) await request('/v1/me', { method: 'DELETE', token: person.token, body: { password } });
      await identify(null); commit({ ...EMPTY_STATE }); set({ syncStatus: 'Profile deleted · saved on this device' });
    } finally { authenticating = false; }
  },
};
export type AppModel = Data & typeof actions;
export const offlineStore = createStore<AppModel>(() => ({ ...actions, local: EMPTY_STATE, identity: null, ready: false, syncStatus: API_URL ? 'Connecting…' : 'Saved on this device', saveError: '' }));
export function initializeOffline() {
  if (initialized) return; initialized = true;
  void Promise.all([readLocal(), readIdentity()]).then(([local, identity]) => set({ local, identity }))
    .catch(() => set({ saveError: 'Could not restore device storage.' })).finally(() => { set({ ready: true }); scheduleSync(); });
  AppState.addEventListener('change', state => { if (state === 'active') scheduleSync(); });
  setInterval(() => { if (AppState.currentState === 'active' && get().local.dirty) scheduleSync(); }, 30_000);
}
