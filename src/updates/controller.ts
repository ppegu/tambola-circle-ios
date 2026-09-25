import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { denied, isSignedAccess, parseAccess, usableLease, type AccessDecision, type CachedAccess, type ReleaseDescriptor } from '../../shared/appAccess';
import keys from '../../shared/update-keys.json';
import type { DeviceInfo } from '../../shared/device';
import { API_URL } from '../api';
import { collectDeviceInfo, recordDeviceAccess } from '../online/deviceRegistration';
import { ensureDeviceIdentity, type OnlineIdentity } from '../online/storage';
import * as storage from '../native/secureStore';
import { configureAccess } from './events';
import { updater, type UpdateTransfer } from './native';

const CACHE = 'tambola.circle.access.v1', DISMISSED = 'tambola.circle.update.dismissed', PENDING = 'tambola.circle.update.install';
export type UpdateState = { ready: boolean; checking: boolean; permitted: boolean; access: AccessDecision | null; info: DeviceInfo | null; transfer: UpdateTransfer | null; details: boolean; success: boolean; dismissed: string | null; error: string; installAttempted: boolean; busy: boolean };
/** Loading is not a connection failure. Verified restrictions stay visible during retries. */
export function isAccessCheckPending(state: UpdateState, hasRelease: boolean) {
  if (state.access && denied(state.access.decision)) return false;
  return !state.ready || (state.checking && !state.success && (!state.permitted || (state.details && !hasRelease)));
}
export class UpdateController {
  state: UpdateState = { ready: false, checking: false, permitted: false, access: null, info: null, transfer: null, details: false, success: false, dismissed: null, error: '', installAttempted: false, busy: false };
  private listeners = new Set<() => void>();
  private identity?: OnlineIdentity;
  private cache?: CachedAccess;
  private pending?: Promise<void>;
  private serial: Promise<void> = Promise.resolve();
  private stopped = false;
  private lastCheck = 0;
  private lastAttempt = 0;
  private lastOnlineElapsed = -Infinity;
  private targetInstalled = 0;
  private dispose?: () => void;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.state;
  private change(patch: Partial<UpdateState>) { this.state = { ...this.state, ...patch }; for (const fn of this.listeners) fn(); }
  async start() {
    this.stopped = false;
    try {
      this.identity = await ensureDeviceIdentity();
      this.change({ info: await collectDeviceInfo(), dismissed: await AsyncStorage.getItem(DISMISSED) });
      this.targetInstalled = Number(await storage.getItem(PENDING)) || 0;
      const raw = await storage.getItem(CACHE);
      if (raw) {
        try {
          const cache = JSON.parse(raw) as CachedAccess;
          const access = await this.verify(cache.signed, false);
          if (access && Number.isFinite(cache.receivedWall) && Number.isFinite(cache.receivedElapsed) && Number.isFinite(cache.lastWall) && typeof cache.bootId === 'string') {
            this.cache = cache; this.change({ access }); await this.checkLease();
          }
        } catch { /* A corrupt cache cannot authorize access. */ }
      }
      this.dispose = configureAccess(this.identity.key, this.accept);
      // Access checks must not wait for the native download state to hydrate.
      await Promise.all([this.pollTransfer(), this.refresh()]);
    } catch { this.change({ ready: true, error: 'We couldn’t check app access. Please try again.' }); }
  }
  stop() { this.stopped = true; this.dispose?.(); }
  private async verify(value: unknown, fresh: boolean): Promise<AccessDecision> {
    if (!isSignedAccess(value)) throw new Error('Missing signed access decision');
    const publicKey = (keys as Record<string, string>)[value.keyId];
    if (!publicKey || !(await updater().verifyAccess(value.payload, value.signature, publicKey))) throw new Error('Invalid policy signature');
    const access = parseAccess(JSON.parse(value.payload));
    if (!access || access.deviceUuid !== this.identity?.deviceUuid || access.packageId !== this.state.info?.appId ||
      (fresh && access.installedBuild !== Number(this.state.info?.appBuild))) throw new Error('Access decision does not match this installation');
    return access;
  }
  accept = (value: unknown): Promise<void> => {
    const next = this.serial.then(async () => {
      const access = await this.verify(value, true), previous = this.state.access;
      if (previous && (access.revision < previous.revision || (access.revision === previous.revision && access.issuedAt <= previous.issuedAt))) throw new Error('Stale policy response');
      const now = await updater().clock();
      this.cache = { signed: value as CachedAccess['signed'], receivedWall: now.wall, receivedElapsed: now.elapsed, bootId: now.bootId, lastWall: now.wall };
      this.lastOnlineElapsed = now.elapsed;
      const upgraded = !!previous && access.installedBuild > previous.installedBuild;
      const success = !denied(access.decision) && (upgraded || (this.targetInstalled > 0 && Number(this.state.info?.appBuild) >= this.targetInstalled));
      // Apply denials before storage I/O; only a verified newer server decision can remove one.
      // Keep the success screen above gameplay throughout upgrade cleanup.
      this.change({ access, permitted: !denied(access.decision), ready: true, error: '', ...(success ? { success: true, details: false, installAttempted: false } : {}) });
      if (['device_blocked', 'app_locked'].includes(access.decision) || previous?.release?.id !== access.release?.id) await updater().pause();
      await storage.setItem(CACHE, JSON.stringify(this.cache));
      if (success) {
        await updater().clearCompleted(); await storage.deleteItem(PENDING); this.targetInstalled = 0;
      }
    });
    this.serial = next.catch(() => undefined); return next;
  };
  async checkLease() {
    const access = this.state.access, cache = this.cache;
    if (!access || !cache || denied(access.decision)) { this.change({ permitted: false }); return; }
    const now = await updater().clock();
    // An async clock read must not re-authorize a newer restriction received meanwhile.
    if (this.state.access !== access || this.cache !== cache) return;
    // A zero-hour policy permits only a just-verified foreground session, checked every 30s.
    const onlineOnly = access.expiresAt === access.issuedAt && now.elapsed - this.lastOnlineElapsed < 30_000;
    const permitted = access.installedBuild === Number(this.state.info?.appBuild) && (onlineOnly || usableLease(access, cache, now));
    this.change({ permitted });
    if (now.wall > cache.lastWall) {
      cache.lastWall = now.wall;
      const save = this.serial.then(async () => { if (this.cache === cache) await storage.setItem(CACHE, JSON.stringify(cache)); });
      this.serial = save.catch(() => undefined); await save;
    }
  }
  refresh = (): Promise<void> => {
    if (this.pending) return this.pending;
    this.pending = (async () => {
      this.lastAttempt = Date.now();
      this.change({ checking: true });
      try {
        if (!this.identity || !this.state.info) {
          this.identity = await ensureDeviceIdentity();
          this.dispose?.(); this.dispose = configureAccess(this.identity.key, this.accept);
        }
        this.change({ info: await collectDeviceInfo() });
        await this.checkLease();
        const response = await recordDeviceAccess();
        await this.accept(response.access);
        this.lastCheck = Date.now();
      } catch { await this.checkLease().catch(() => this.change({ permitted: false })); this.change({ error: 'Could not connect. Check your connection and try again.' }); }
      finally { this.change({ checking: false, ready: true }); this.pending = undefined; }
    })(); return this.pending;
  };
  async tick(resumed = false) {
    if (this.stopped || AppState.currentState !== 'active') return;
    await this.checkLease().catch(() => this.change({ permitted: false }));
    const interval = this.state.access?.expiresAt === this.state.access?.issuedAt ? 25_000 : 300_000;
    if (resumed || (Date.now() - this.lastCheck >= interval && Date.now() - this.lastAttempt >= 30_000)) await this.refresh();
  }
  pollTransfer = async () => { try { const transfer = await updater().getState(); if (!this.stopped) this.change({ transfer }); } catch { /* Retryable through the screen. */ } };
  show = () => { this.change({ details: true, success: false, error: '' }); void this.refresh(); };
  close = () => { if (this.state.permitted) this.change({ details: false, success: false }); };
  dismiss = async () => { const id = this.state.access?.release?.id; if (id && this.state.permitted) { await AsyncStorage.setItem(DISMISSED, id); this.change({ dismissed: id }); } };
  private async action(fn: () => Promise<void>) {
    if (this.state.busy) return;
    this.change({ busy: true, error: '' });
    try { await fn(); } catch (error) { this.change({ error: error instanceof Error ? error.message.replace(/^.*Exception:\s*/, '') : 'Please try again.' }); }
    finally { await this.pollTransfer(); this.change({ busy: false }); }
  }
  get release(): ReleaseDescriptor | undefined {
    const release = this.state.access?.release;
    return release && release.versionCode > Number(this.state.info?.appBuild) && !['device_blocked', 'app_locked'].includes(this.state.access!.decision) ? release : undefined;
  }
  download = () => this.action(async () => { if (!this.release) return; await updater().download(JSON.stringify(this.release), API_URL); this.change({ details: true, installAttempted: false }); });
  pause = () => this.action(() => updater().pause());
  permission = () => this.action(() => updater().openInstallSettings());
  install = () => this.action(async () => {
    if (!this.release) return;
    this.targetInstalled = this.release.versionCode;
    await storage.setItem(PENDING, String(this.targetInstalled));
    await updater().install(); this.change({ installAttempted: true });
  });
}
