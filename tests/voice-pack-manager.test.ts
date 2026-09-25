import { describe, expect, it, vi } from 'vitest';
import { createVoicePackManager, type CallerVoicePack, type PackStorage } from '../src/voicePackManager';

const files = [1, 2].map(number => ({ number, bytes: 100, durationMs: 1000, sha256: 'a'.repeat(64) }));
const packs: CallerVoicePack[] = ['aria', 'emma', 'ava'].map(id => ({ id, name: id, accent: 'English', revision: 'a'.repeat(16), bundled: id === 'aria', totalBytes: 200, files }));
const uris = ['file:///voices/1.wav', 'file:///voices/2.wav'];
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function setup(saved = 'aria', native: PackStorage = {}) {
  const storage = { load: vi.fn(async () => saved), save: vi.fn(async () => {}) };
  const api = { getVoicePackFiles: vi.fn(async () => null as string[] | null), downloadVoiceFile: vi.fn(async () => uris[0]!),
    cancelVoiceDownload: vi.fn(async () => {}), finishVoiceDownload: vi.fn(async () => {}), removeVoicePack: vi.fn(async () => {}),
    getVoiceStorageFreeBytes: vi.fn(async () => 10_000_000), ...native };
  const manager = createVoicePackManager(packs, api, storage, 'https://voices.example');
  return { manager, api, storage };
}
describe('persistent optional caller packs', () => {
  it('defaults to bundled Aria without any network or download', async () => {
    const { manager, api } = setup(); await manager.initialize();
    expect(manager.getSnapshot().selected).toBe('aria'); expect(manager.ready('aria')).toBe(true);
    expect(api.downloadVoiceFile).not.toHaveBeenCalled();
  });
  it('restores an installed choice offline, but falls back if the saved files fail verification', async () => {
    const { manager } = setup('emma', { getVoicePackFiles: async id => id === 'emma' ? uris : null });
    await manager.initialize(); expect(manager.getSnapshot().selected).toBe('emma');
    const missing = setup('emma').manager; await missing.initialize();
    expect(missing.getSnapshot().selected).toBe('aria'); expect(missing.getSnapshot().notice).toContain('unavailable');
  });
  it('only makes a complete verified download available and requires explicit selection', async () => {
    const { manager, api, storage } = setup(); await manager.initialize();
    let finish!: (uri: string) => void;
    api.downloadVoiceFile = vi.fn(async () => uris[0]!); // Manager keeps the same API object.
    vi.mocked(api.downloadVoiceFile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    vi.mocked(api.getVoicePackFiles).mockResolvedValue(uris);
    const job = manager.download('emma'); await tick();
    expect(manager.ready('emma')).toBe(false); expect(manager.getSnapshot().selected).toBe('aria');
    await expect(manager.select('emma')).rejects.toThrow('Download');
    finish(uris[0]!); await job;
    expect(manager.ready('emma')).toBe(true); expect(manager.getSnapshot().selected).toBe('aria');
    expect(api.downloadVoiceFile).toHaveBeenCalledTimes(2);
    await manager.select('emma'); expect(storage.save).toHaveBeenCalledWith('emma'); expect(manager.getSnapshot().selected).toBe('emma');
  });
  it('cancels a pending download without installing it and permits retry', async () => {
    const { manager, api } = setup(); await manager.initialize();
    let finish!: (uri: string) => void;
    vi.mocked(api.downloadVoiceFile).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const job = manager.download('emma'); await tick(); await manager.cancel();
    finish(uris[0]!); await job;
    expect(manager.ready('emma')).toBe(false); expect(manager.getSnapshot().downloading).toBeNull();
    expect(api.cancelVoiceDownload).toHaveBeenCalledOnce(); expect(api.finishVoiceDownload).toHaveBeenCalledOnce();
    vi.mocked(api.getVoicePackFiles).mockResolvedValue(uris); await manager.download('emma'); expect(manager.ready('emma')).toBe(true);
  });
  it('reports low storage and failed downloads without changing the active pack', async () => {
    const { manager, api } = setup(); await manager.initialize();
    vi.mocked(api.getVoiceStorageFreeBytes).mockResolvedValue(1); await manager.download('emma');
    expect(manager.getSnapshot().error).toContain('storage'); expect(api.downloadVoiceFile).not.toHaveBeenCalled();
    vi.mocked(api.getVoiceStorageFreeBytes).mockResolvedValue(10_000_000);
    vi.mocked(api.downloadVoiceFile).mockRejectedValue(new Error('Offline')); await manager.download('emma');
    expect(manager.getSnapshot().error).toBe('Offline'); expect(manager.getSnapshot().selected).toBe('aria');
  });
  it('cannot remove the bundled or active voice and does not hide failed removals', async () => {
    const { manager, api } = setup('emma', { getVoicePackFiles: async () => uris }); await manager.initialize();
    await expect(manager.remove('aria')).rejects.toThrow('included');
    await expect(manager.remove('emma')).rejects.toThrow('Select another');
    vi.mocked(api.removeVoicePack).mockRejectedValueOnce(new Error('Storage busy'));
    await expect(manager.remove('ava')).rejects.toThrow('Storage busy'); expect(manager.ready('ava')).toBe(true);
    await manager.select('aria'); await manager.remove('emma'); expect(manager.ready('emma')).toBe(false);
  });
  it('keeps the active choice when saving a new selection fails', async () => {
    const { manager, storage } = setup('aria', { getVoicePackFiles: async () => uris }); await manager.initialize();
    storage.save.mockRejectedValue(new Error('Cannot save'));
    await expect(manager.select('emma')).rejects.toThrow('Cannot save'); expect(manager.getSnapshot().selected).toBe('aria');
  });
});
