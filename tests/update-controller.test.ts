import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessDecision, SignedAccess } from '../shared/appAccess';
const mock = vi.hoisted(() => ({
  store: new Map<string, string>(), now: { wall: 100000, elapsed: 1000, bootId: '1' },
  identity: { key: 'd_' + 'a'.repeat(64), deviceUuid: '12345678-1234-4123-8123-123456789012', profile: null },
  info: { platform: 'android', appId: 'com.ppegu.tambola', appBuild: '9', appVersion: '1.4.0' },
  check: vi.fn(), verify: vi.fn(), clear: vi.fn(), pause: vi.fn(), install: vi.fn(),
}));
vi.mock('react-native', () => ({ AppState: { currentState: 'active' } }));
vi.mock('../src/api', () => ({ API_URL: 'https://updates.test' }));
vi.mock('../src/online/storage', () => ({ ensureDeviceIdentity: async () => mock.identity }));
vi.mock('../src/online/deviceRegistration', () => ({ collectDeviceInfo: async () => ({ ...mock.info }), recordDeviceAccess: mock.check }));
vi.mock('../src/native/secureStore', () => ({ getItem: async (key: string) => mock.store.get(key) ?? null, setItem: async (key: string, value: string) => { mock.store.set(key, value); }, deleteItem: async (key: string) => { mock.store.delete(key); } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem: async () => null, setItem: async () => {} } }));
vi.mock('../src/updates/native', () => ({ updater: () => ({ verifyAccess: mock.verify, clock: async () => ({ ...mock.now }), pause: mock.pause, clearCompleted: mock.clear, install: mock.install, getState: async () => ({ status: 'idle', releaseId: null, downloaded: 0, total: 0, canInstall: true }) }) }));
import { UpdateController, isAccessCheckPending } from '../src/updates/controller';
function signed(patch: Partial<AccessDecision> = {}): SignedAccess {
  return { keyId: 'updates-2026-01', signature: 'AAAA', payload: JSON.stringify({ schemaVersion: 1, revision: 1, issuedAt: 100000, expiresAt: 86500000, deviceUuid: mock.identity.deviceUuid, packageId: mock.info.appId, installedBuild: Number(mock.info.appBuild), decision: 'allow', message: '', ...patch }) };
}
beforeEach(() => {
  mock.store.clear(); mock.now = { wall: 100000, elapsed: 1000, bootId: '1' }; mock.info.appBuild = '9';
  mock.verify.mockReset().mockResolvedValue(true); mock.check.mockReset().mockResolvedValue({ identity: mock.identity, access: signed() }); mock.clear.mockReset().mockResolvedValue(undefined); mock.pause.mockReset().mockResolvedValue(undefined);
});
describe('app-wide access controller', () => {
  it('shows loading through the entire first request, never a premature connection error', async () => {
    let resolve!: (value: { access: SignedAccess }) => void;
    mock.check.mockImplementation(() => new Promise(done => { resolve = done; }));
    const model = new UpdateController();
    const prematureErrors: boolean[] = [];
    const unsubscribe = model.subscribe(() => {
      prematureErrors.push(!model.state.permitted && !isAccessCheckPending(model.state, false));
    });
    const starting = model.start();
    await vi.waitFor(() => expect(mock.check).toHaveBeenCalledOnce());
    expect(model.state.ready).toBe(false);
    expect(isAccessCheckPending(model.state, false)).toBe(true);
    expect(prematureErrors).not.toContain(true);
    resolve({ access: signed() }); await starting;
    expect(model.state.permitted).toBe(true);
    expect(prematureErrors).not.toContain(true);
    unsubscribe(); model.stop();
  });
  it('only shows the connection error after failure and restores loading during retry', async () => {
    mock.check.mockRejectedValueOnce(new Error('offline'));
    const model = new UpdateController(); await model.start();
    expect(model.state.error).not.toBe('');
    expect(isAccessCheckPending(model.state, false)).toBe(false);
    let resolve!: (value: { access: SignedAccess }) => void;
    mock.check.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const retry = model.refresh();
    await vi.waitFor(() => expect(mock.check).toHaveBeenCalledTimes(2));
    expect(isAccessCheckPending(model.state, false)).toBe(true);
    resolve({ access: signed() }); await retry;
    expect(model.state.error).toBe(''); expect(model.state.permitted).toBe(true);
    model.stop();
  });
  it('keeps verified restrictions visible during background retries', async () => {
    for (const decision of ['device_blocked', 'app_locked', 'required_update', 'release_blocked'] as const) {
      const model = new UpdateController();
      expect(isAccessCheckPending({ ...model.state, checking: true, access: JSON.parse(signed({ decision }).payload) }, false)).toBe(false);
    }
  });
  it('gates first launch until a signed decision arrives, then permits gameplay', async () => {
    const model = new UpdateController(); expect(model.state.permitted).toBe(false);
    await model.start(); expect(model.state.permitted).toBe(true);
    expect(mock.verify).toHaveBeenCalled(); model.stop();
  });
  it('coalesces overlapping foreground checks', async () => {
    const model = new UpdateController(); await model.start(); mock.check.mockClear();
    await Promise.all([model.refresh(), model.refresh(), model.refresh()]); expect(mock.check).toHaveBeenCalledTimes(1); model.stop();
  });
  it('preserves a verified block through retry, process restart, and offline expiry', async () => {
    mock.check.mockResolvedValue({ access: signed({ decision: 'device_blocked', supportReference: 'TC-TEST' }) });
    const model = new UpdateController(); await model.start(); expect(model.state.permitted).toBe(false); model.stop();
    mock.now.elapsed += 2 * 86400000; mock.check.mockRejectedValue(new Error('offline'));
    const restarted = new UpdateController(); await restarted.start(); await restarted.refresh();
    expect(restarted.state.access?.decision).toBe('device_blocked'); expect(restarted.state.permitted).toBe(false); restarted.close(); expect(restarted.state.permitted).toBe(false); restarted.stop();
  });
  it('allows cached play only inside the original lease; failed requests cannot renew it', async () => {
    const model = new UpdateController(); await model.start(); mock.check.mockRejectedValue(new Error('offline'));
    mock.now.elapsed += 3600000; await model.refresh(); expect(model.state.permitted).toBe(true);
    mock.now.elapsed += 86400000; await model.refresh(); expect(model.state.permitted).toBe(false); model.stop();
  });
  it('rejects tampered, cross-device, wrong-build and out-of-order decisions', async () => {
    const model = new UpdateController(); await model.start();
    await model.accept(signed({ decision: 'device_blocked', revision: 3, issuedAt: 100002 }));
    for (const patch of [{ revision: 2, issuedAt: 100005 }, { deviceUuid: '22345678-1234-4123-8123-123456789012', revision: 4 }, { installedBuild: 8, revision: 4 }]) await expect(model.accept(signed(patch))).rejects.toThrow();
    mock.verify.mockResolvedValue(false); await expect(model.accept(signed({ revision: 5 }))).rejects.toThrow();
    expect(model.state.permitted).toBe(false); expect(model.state.access?.decision).toBe('device_blocked'); model.stop();
  });
  it('requires server permission after installation and keeps a device block over a new build', async () => {
    mock.store.set('tambola.circle.update.install', '10'); mock.info.appBuild = '10';
    mock.check.mockResolvedValue({ access: signed({ decision: 'device_blocked', revision: 3 }) });
    const model = new UpdateController(); await model.start(); expect(model.state.success).toBe(false); expect(mock.clear).not.toHaveBeenCalled();
    await model.accept(signed({ revision: 4, issuedAt: 100003 })); expect(model.state.success).toBe(true); expect(model.state.permitted).toBe(true); expect(mock.clear).toHaveBeenCalledOnce(); model.stop();
  });
  it('does not mistake an invalid server reply for a ban on first launch', async () => {
    mock.check.mockResolvedValue({ access: { junk: true } }); const model = new UpdateController(); await model.start();
    expect(model.state.access).toBeNull(); expect(model.state.ready).toBe(true); expect(model.state.permitted).toBe(false); model.stop();
  });
  it('recognizes a browser-installed update only after a fresh signed allow', async () => {
    const old = new UpdateController(); await old.start(); old.stop();
    mock.info.appBuild = '10'; mock.check.mockRejectedValue(new Error('offline'));
    const updated = new UpdateController(); await updated.start();
    expect(updated.state.permitted).toBe(false); expect(updated.state.success).toBe(false);
    const frames: Array<{ permitted: boolean; success: boolean }> = [];
    const unsubscribe = updated.subscribe(() => frames.push(updated.state));
    await updated.accept(signed({ issuedAt: 100001 }));
    expect(updated.state.success).toBe(true);
    expect(frames.every(frame => !frame.permitted || frame.success)).toBe(true);
    expect(mock.clear).toHaveBeenCalledOnce(); unsubscribe(); updated.stop();
  });
});
