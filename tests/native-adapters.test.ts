import { beforeEach, describe, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ randomHex: vi.fn(), randomUUID: vi.fn(), playClip: vi.fn(), stopClip: vi.fn(), setAudioActive: vi.fn(), resolveAssetSource: vi.fn() }));
vi.mock('../modules/circle-device', () => ({ default: native }));
vi.mock('react-native', () => ({ Image: { resolveAssetSource: native.resolveAssetSource } }));
import { getRandomBytes, randomUUID } from '../src/native/crypto';
import { createClipPlayer, voiceAssetUri } from '../src/playClip';
beforeEach(() => { vi.resetAllMocks(); native.resolveAssetSource.mockReturnValue({ uri: 'assets_voice_en_female_1' }); native.setAudioActive.mockResolvedValue(undefined); });
describe('native cryptographic adapter', () => {
  it('uses OS randomness and decodes unsigned bytes', () => {
    native.randomHex.mockReturnValue('00ff80');
    expect([...getRandomBytes(3)]).toEqual([0, 255, 128]);
    expect(native.randomHex).toHaveBeenCalledWith(3);
    native.randomUUID.mockReturnValue('f48dd928-a3eb-44d9-8fd3-c790b831f0ce');
    expect(randomUUID()).toBe('f48dd928-a3eb-44d9-8fd3-c790b831f0ce');
  });
  it('fails closed when the native random source is malformed', () => {
    for (const value of ['', 'zz', 'fff']) { native.randomHex.mockReturnValue(value); expect(() => getRandomBytes(1)).toThrow(); }
    expect(() => getRandomBytes(-1)).toThrow();
    expect(() => getRandomBytes(1025)).toThrow();
  });
});
describe('native clip lifetime', () => {
  it('waits for all voices to be prepared before playing a random clip', async () => {
    let finish!: () => void;
    const preparation = { prepare: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), invalidate: vi.fn(), release: vi.fn() };
    native.playClip.mockResolvedValue(undefined);
    const ended = vi.fn(), failed = vi.fn();
    createClipPlayer(preparation)(47, ended, failed);
    expect(native.playClip).not.toHaveBeenCalled();
    finish(); for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(native.playClip).toHaveBeenCalledOnce();
    expect(ended).toHaveBeenCalledOnce(); expect(failed).not.toHaveBeenCalled();
  });
  it('does not start or retry a call cancelled while preparation was pending', async () => {
    let finish!: () => void;
    const preparation = { prepare: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })), invalidate: vi.fn(), release: vi.fn() };
    const ended = vi.fn(), failed = vi.fn();
    const cancel = createClipPlayer(preparation)(47, ended, failed);
    cancel(); finish(); for (let i = 0; i < 4; i++) await Promise.resolve();
    expect(native.playClip).not.toHaveBeenCalled();
    expect(ended).not.toHaveBeenCalled(); expect(failed).not.toHaveBeenCalled();
  });
  it('uses the same revisioned Metro URI for preparation and playback', async () => {
    native.resolveAssetSource.mockReturnValue({ uri: 'http://localhost:8081/23.wav?platform=android' });
    native.playClip.mockResolvedValue(undefined);
    createClipPlayer(undefined, { 23: 'abc123' })(23, vi.fn(), vi.fn());
    expect(native.playClip.mock.calls[0]![1]).toBe(voiceAssetUri(23, 'abc123'));
    expect(native.playClip.mock.calls[0]![1]).toContain('&voiceRevision=abc123');
  });
  it('ignores late completion after cancellation while a newer clip finishes', async () => {
    let first!: () => void, second!: () => void;
    native.playClip.mockImplementationOnce(() => new Promise<void>(r => { first = r; }))
      .mockImplementationOnce(() => new Promise<void>(r => { second = r; }));
    const player = createClipPlayer(), ended = vi.fn(), failed = vi.fn();
    const cancel = player(1, ended, failed);
    cancel();
    player(2, ended, failed);
    first(); await Promise.resolve(); expect(ended).not.toHaveBeenCalled();
    second(); await Promise.resolve(); expect(ended).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
    expect(native.playClip.mock.calls[0]![0]).not.toBe(native.playClip.mock.calls[1]![0]);
    expect(native.stopClip).toHaveBeenCalledWith(native.playClip.mock.calls[0]![0]);
  });
  it('reports playback failure, but suppresses a cancellation rejection', async () => {
    native.playClip.mockRejectedValue(new Error('interrupted'));
    const ended = vi.fn(), failed = vi.fn();
    createClipPlayer()(1, ended, failed); for (let i=0;i<8;i++) await Promise.resolve();
    expect(failed).toHaveBeenCalledTimes(1);
    expect(native.playClip).toHaveBeenCalledTimes(2);
    const cancel = createClipPlayer()(1, ended, failed); cancel(); await Promise.resolve();
    expect(failed).toHaveBeenCalledTimes(1);
    expect(ended).not.toHaveBeenCalled();
  });
  it('recreates a failed player once and does not report a recovered call as failed', async () => {
    native.playClip.mockRejectedValueOnce(new Error('player expired')).mockResolvedValueOnce(undefined);
    const ended=vi.fn(),failed=vi.fn();createClipPlayer()(1,ended,failed);
    for(let i=0;i<8;i++)await Promise.resolve();
    expect(native.playClip).toHaveBeenCalledTimes(2);expect(native.setAudioActive).toHaveBeenCalledWith(true);expect(ended).toHaveBeenCalledOnce();expect(failed).not.toHaveBeenCalled();
  });
  it('rejects missing bundled assets before playback', () => {
    native.resolveAssetSource.mockReturnValue(null);
    expect(() => createClipPlayer()(1, vi.fn(), vi.fn())).toThrow('Voice asset is missing');
    expect(native.playClip).not.toHaveBeenCalled();
  });
});
