import { refreshInvitations } from './invitationStore';
import { createStore } from 'zustand/vanilla';
import { Alert, AppState, Platform } from 'react-native';
import * as Crypto from '../native/crypto';
import { API_URL, ApiError, request } from '../api';
import { cellKey, type CoinCatalog, type CoinWallet, type PastGame, type RoomCommand, type RoomSnapshot, type TableConfig, type TableCreationOptions, type TableSummary } from '../../shared/online';
import { ensureDeviceIdentity, saveOnlineIdentity, savedTable, type OnlineIdentity } from './storage';
import { recordDeviceOpen } from './deviceRegistration';
import { dispatchAccess } from '../updates/events';
import { PendingMarks } from './pendingMarks';
import { createRemoteResource } from '../state/remoteResource';
import { t, localizeKnownCopy } from '../i18n';

type List<T> = { items: T[]; loaded: boolean; loading: boolean; refreshing: boolean; error: string; refresh(): Promise<void> };
type OnlineData = {
  identity: OnlineIdentity | null; loaded: boolean; error: string; snapshot: RoomSnapshot | null;
  tableList: List<TableSummary>; historyList: List<PastGame>; tables: TableSummary[]; tablesLoading: boolean; tablesError: string;
  wallet: CoinWallet | null; walletLoading: boolean; walletError: string;
  catalog: CoinCatalog | null; catalogLoading: boolean; catalogError: string;
  pendingMarks: PendingMarks; connected: boolean; busy: boolean; pending: Readonly<Record<string, boolean>>;
};

const tables = createRemoteResource<TableSummary[]>([]), history = createRemoteResource<PastGame[]>([]);
const wallet = createRemoteResource<CoinWallet | null>(null), catalog = createRemoteResource<CoinCatalog | null>(null);
let initialized = false, markQueue = Promise.resolve(), disconnectSocket = () => {}, connectionKey = '';
let leavingTable: string | null = null;
const get = () => onlineStore.getState();
const set = (patch: Partial<OnlineData>) => onlineStore.setState(patch);
const messageFor = (error: unknown) => error instanceof ApiError && error.status >= 500 ? t('Please try again in a moment.')
  : error instanceof ApiError && error.status === 0 ? t('Check your connection and try again.') : error instanceof Error ? localizeKnownCopy(error.message) : t('Please try again.');

async function guarded<T>(key: string, work: () => Promise<T>, exclusive = false): Promise<T | undefined> {
  if (get().pending[key] || (exclusive && Object.keys(get().pending).some(k => k.startsWith('table:')))) return;
  set({ pending: { ...get().pending, [key]: true }, busy: true, error: '' });
  try { return await work(); }
  catch (error) { const message = messageFor(error); set({ error: message }); Alert.alert(t('Unable to complete this action'), message); }
  finally { const pending = { ...get().pending }; delete pending[key]; set({ pending, busy: Object.keys(pending).length > 0 }); }
}
function accept(next: RoomSnapshot | null) {
  const old = get().snapshot;
  if (old && next && old.id === next.id && (next.seq < old.seq || (next.seq === old.seq && next.serverNow < old.serverNow))) return;
  if (old?.roundId !== next?.roundId || old?.id !== next?.id) get().pendingMarks.clear();
  // Preserve member references when only another player's marks/presence changed.
  if (old && next && old.roundId === next.roundId) {
    const members = { ...next.members };
    for (const id of Object.keys(members)) if (JSON.stringify(members[id]) === JSON.stringify(old.members[id])) members[id] = old.members[id]!;
    next = { ...next, members, calls: old.calls.length === next.calls.length && old.calls.every((n, i) => n === next!.calls[i]) ? old.calls : next.calls };
  }
  set({ snapshot: next }); syncConnection();
  if (old?.phase !== next?.phase || old?.roundId !== next?.roundId || old?.members[old.viewerId]?.coinHold !== next?.members[next.viewerId]?.coinHold) void refreshWallet();
}
function refreshTables() { const token = get().identity?.profile && get().identity?.key; return token ? tables.load(async () => (await request<{ tables: TableSummary[] }>('/v2/tables', { token })).tables) : Promise.resolve(); }
function refreshHistory() { const token = get().identity?.profile && get().identity?.key; return token ? history.load(async () => (await request<{ games: PastGame[] }>('/v2/table-history', { token })).games) : Promise.resolve(); }
function refreshWallet(fresh = false) { const token = get().identity?.profile && get().identity?.key; return token ? wallet.load(async () => (await request<{ wallet: CoinWallet }>('/v2/wallet', { token })).wallet, fresh) : Promise.resolve(); }
function refreshCatalog() { const token = get().identity?.profile && get().identity?.key; return token ? catalog.load(() => request<CoinCatalog>('/v2/coin-plans', { token })) : Promise.resolve(); }
async function identify(identity: OnlineIdentity) {
  await saveOnlineIdentity(identity);
  const changed = get().identity?.key !== identity.key;
  if (changed) { tables.reset(); history.reset(); wallet.reset(); catalog.reset(); accept(null); }
  set({ identity }); syncConnection(); void refreshTables(); void refreshWallet();
}
async function enter(key: string, path: string, body: unknown, statusKey?: string) {
  const identity = get().identity; if (!identity?.profile) return;
  return guarded(key, async () => {
    const data = await request<{ snapshot: RoomSnapshot }>(path, { method: 'POST', token: identity.key, body });
    leavingTable = null; accept(data.snapshot);
    void savedTable.set(statusKey ?? data.snapshot.id).catch(() => {}); void refreshTables(); return true;
  }, true);
}
async function refresh() {
  const { snapshot: s, identity } = get(); if (!s || !identity) return;
  const data = await request<{ snapshot: RoomSnapshot }>('/v2/tables/' + s.id, { token: identity.key });
  if (get().snapshot?.id === s.id) accept(data.snapshot);
}
async function command(type: RoomCommand['type'], payload: Record<string, unknown> = {}) {
  return guarded('table:' + type, async () => {
    if (type === 'CLAIM') await markQueue;
    const { snapshot: s, identity } = get(); if (!s || !identity) return;
    const value: RoomCommand = { id: Crypto.randomUUID(), type, payload, roundId: s.roundId, authorityEpoch: s.authorityEpoch };
    const send = () => request<{ snapshot: RoomSnapshot | null }>('/v2/tables/' + s.id + '/commands', { method: 'POST', token: identity.key, body: value });
    if (type === 'LEAVE') leavingTable = s.id;
    try {
      let data; try { data = await send(); } catch (e) { if (!(e instanceof ApiError) || e.status !== 0) throw e; data = await send(); }
      if (get().snapshot?.id === s.id) accept(data.snapshot);
      if (type === 'LEAVE') { void savedTable.set(null); void refreshTables(); }
      if (['READY', 'CONFIRM_STRIP', 'START', 'WATCH', 'END', 'SETTINGS', 'LEAVE'].includes(type)) void refreshWallet(true); return true;
    } catch (e) { if (type === 'LEAVE') leavingTable = null; await refresh().catch(() => {}); throw e; }
  }, true);
}
function mark(panel: number, cell: number, desired?: boolean) {
  const { snapshot: original, identity, pendingMarks } = get();
  if (!original || !identity || original.phase !== 'live') return;
  const member = original.members[original.viewerId];
  if (!member || member.spectator || member.disqualification || !original.roster.includes(member.id)) return;
  const key = cellKey(panel, cell), id = Crypto.randomUUID(), token = identity.key;
  const marked = desired ?? !(pendingMarks.get(panel)[cell]?.marked ?? original.members[original.viewerId]?.marks[key]);
  pendingMarks.set(panel, cell, { id, marked }); let confirmed = false;
  markQueue = markQueue.catch(() => {}).then(async () => {
    if (pendingMarks.get(panel)[cell]?.id !== id) return;
    const s = get().snapshot; if (!s || s.roundId !== original.roundId || s.phase !== 'live') return;
    if (s.members[s.viewerId]?.spectator || s.members[s.viewerId]?.disqualification) return;
    const value: RoomCommand = { id, type: 'MARK', roundId: s.roundId, payload: { panel, cell, marked, version: s.members[s.viewerId]?.markVersions[key] ?? 0 } };
    const send = () => request<{ snapshot: RoomSnapshot }>('/v2/tables/' + s.id + '/commands', { method: 'POST', token, body: value });
    let result; try { result = await send(); } catch (e) { if (!(e instanceof ApiError) || e.status !== 0) throw e; result = await send(); }
    if (get().snapshot?.roundId === s.roundId) { accept(result.snapshot); pendingMarks.confirm(panel, cell, id); confirmed = true; }
  }).catch(async () => { actions.setError('This mark could not be saved. Tap the number again to retry.'); await refresh().catch(() => {}); })
    .finally(() => { if (!confirmed) pendingMarks.settle(panel, cell, id); });
}
const actions = {
  setError(message: string) { const localized = localizeKnownCopy(message); set({ error: localized }); if (localized) Alert.alert(t('Please check'), localized); },
  refreshWallet, refreshCatalog, refreshTables, refresh, command, mark,
  reconnect() { connectionKey = ''; syncConnection(); },
  exitTableView() { accept(null); void refreshTables(); },
  register(name: string, mobile: string, avatarId = 0, avatarPhoto?: string) { return guarded('register', async () => {
    const device = await recordDeviceOpen();
    const data = await request<{ profile: NonNullable<OnlineIdentity['profile']> }>('/v2/device', { method: 'POST', body: { deviceKey: device.key, deviceUuid: device.deviceUuid, name, mobile, avatarId, avatarPhoto, source: Platform.OS === 'ios' ? 'manual_ios' : 'device_selected', consent: true } });
    await identify({ ...device, profile: data.profile }); return true;
  }); },
  setAvatar(avatarId: number, avatarPhoto?: string) { return guarded('avatar', async () => {
    const identity = get().identity; if (!identity?.profile) return;
    const data = await request<{ profile: NonNullable<OnlineIdentity['profile']> }>('/v2/me/avatar', { method: 'POST', token: identity.key, body: { avatarId, avatarPhoto: avatarPhoto ?? null } });
    await identify({ ...identity, profile: data.profile }); return true;
  }); },
  respondToInvite(id: string, response: 'accept' | 'decline') { return guarded('table:INVITE:' + id, async () => {
    const identity = get().identity; if (!identity?.profile) return;
    try {
      const result = await request<{ snapshot?: RoomSnapshot }>('/v2/invitations/' + id + '/respond', { method: 'POST', token: identity.key, body: { response } });
      if (result.snapshot) { leavingTable = null; accept(result.snapshot); void savedTable.set(result.snapshot.id).catch(() => {}); void refreshTables(); }
      return true;
    } finally { void refreshInvitations(true); }
  }, true); },
  create(name: string, config: TableConfig, createId: string, options: TableCreationOptions = {}) { return enter('table:CREATE', '/v2/tables', { name, config, visibility: 'private', createId, options }); },
  join(codeOrInvite: { code: string } | { tableId: string; invite: string }) { return enter('table:JOIN', '/v2/join', codeOrInvite); },
  rejoin(id: string) { return enter('table:ENTER:' + id, '/v2/tables/' + id + '/rejoin', {}, id); },
  buyCoins(planId: string, purchaseId: string) { return guarded('purchase', async () => {
    const identity = get().identity; if (!identity?.profile) return;
    const data = await request<{ wallet: CoinWallet; creditedCoins: number }>('/v2/wallet/test-purchase', { method: 'POST', token: identity.key, body: { id: purchaseId, planId } });
    wallet.put(data.wallet); void refreshCatalog(); return data.creditedCoins;
  }); },
};
const emptyList = <T>(refresh: () => Promise<void>): List<T> => ({ items: [], loaded: false, loading: false, refreshing: false, error: '', refresh });
export type OnlineModel = OnlineData & typeof actions;
export const onlineStore = createStore<OnlineModel>(() => ({ ...actions, identity: null, loaded: false, error: '', snapshot: null,
  tableList: emptyList(refreshTables), historyList: emptyList(refreshHistory), tables: [], tablesLoading: false, tablesError: '',
  wallet: null, walletLoading: false, walletError: '', catalog: null, catalogLoading: false, catalogError: '',
  pendingMarks: new PendingMarks(), connected: false, busy: false, pending: {} }));
tables.store.subscribe(s => set({ tables: s.data, tablesLoading: s.loading, tablesError: s.error, tableList: { ...s, items: s.data, refreshing: s.loaded && s.loading, refresh: refreshTables } }));
history.store.subscribe(s => set({ historyList: { ...s, items: s.data, refreshing: s.loaded && s.loading, refresh: refreshHistory } }));
wallet.store.subscribe(s => set({ wallet: s.data, walletLoading: s.loading, walletError: s.error }));
catalog.store.subscribe(s => set({ catalog: s.data, catalogLoading: s.loading, catalogError: s.error }));

/** One authenticated socket for the application, independent of native screen mounts. */
function syncConnection() {
  const { snapshot, identity } = get(), tableId = snapshot?.id, token = identity?.key;
  const key = `${tableId ?? ''}:${token ?? ''}`;
  if (key === connectionKey) return; connectionKey = key; disconnectSocket();
  if (!tableId || !token) { set({ connected: false }); return; }
  let disposed = false, ws: WebSocket | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined, attempt = 0, connecting = false;
  const foreground = () => !['background', 'inactive'].includes(AppState.currentState);
  const disconnect = () => { clearInterval(heartbeat); const socket = ws; ws = undefined; socket?.close(); set({ connected: false }); };
  const connect = async () => {
    if (disposed || connecting || !foreground()) return; connecting = true;
    try {
      const { ticket } = await request<{ ticket: string }>('/v2/tables/' + tableId + '/socket', { method: 'POST', token, body: {} });
      if (disposed || !foreground()) return;
      const socket = new WebSocket(API_URL.replace(/^http/, 'ws') + '/v2/tables/' + tableId + '/ws?ticket=' + encodeURIComponent(ticket)); ws = socket;
      const current = () => !disposed && socket === ws;
      socket.onopen = () => { if (!current()) { socket.close(); return; } set({ connected: true, error: '' }); attempt = 0;
        heartbeat = setInterval(() => { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 10_000); };
      socket.onmessage = event => { if (!current()) return;
        try { const data = JSON.parse(String(event.data));
          if (data.type === 'access') { void dispatchAccess(data.access).catch(() => socket.close()); return; }
          if (data.type === 'snapshot') accept(data.snapshot); else if (data.type === 'error') set({ error: localizeKnownCopy(data.message) });
        } catch { set({ error: t('Could not read a table update. Reconnecting…') }); socket.close(); } };
      socket.onerror = () => { if (current()) set({ connected: false }); };
      socket.onclose = event => { if (!current()) return; clearInterval(heartbeat); set({ connected: false });
        if (event.code === 1008 && event.reason === 'Membership ended') { if (leavingTable !== tableId) set({ error: t('Your table access has ended.') }); accept(null); return; }
        timer = setTimeout(() => { void connect(); }, Math.min(15_000, 1000 * 2 ** attempt++)); };
    } catch (e) { if (!disposed) { set({ connected: false, error: messageFor(e) });
      if (e instanceof ApiError && [401, 403, 404].includes(e.status)) { accept(null); return; }
      timer = setTimeout(() => { void connect(); }, Math.min(15_000, 1000 * 2 ** attempt++)); } }
    finally { connecting = false; }
  };
  void connect();
  const sub = AppState.addEventListener('change', state => { clearTimeout(timer); if (state === 'active') { if (!ws || ws.readyState !== WebSocket.OPEN) void connect(); else void refresh().catch(() => {}); } else disconnect(); });
  disconnectSocket = () => { disposed = true; sub.remove(); clearTimeout(timer); disconnect(); };
}
export function initializeOnline() {
  if (initialized) return; initialized = true;
  void ensureDeviceIdentity().then(identity => { set({ identity }); void refreshWallet(); void refreshTables(); })
    .catch(() => set({ error: t('Could not read device sign-in.') })).finally(() => set({ loaded: true }));
  AppState.addEventListener('change', state => { if (state === 'active') { void refreshWallet(); void refreshTables(); } });
}
