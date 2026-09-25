import { describe, expect, it, vi } from 'vitest';
import { createVoicePreparation } from '../src/voicePreparation';

const bank = Array.from({ length: 90 }, (_, i) => ({ uri: `voice_${i + 1}`, durationMs: 1000 }));

describe('voice bank preparation', () => {
  it('shares an in-flight preload and retains it for random calls and replays', async () => {
    let finish!: () => void;
    const native = { prepareClips: vi.fn(() => new Promise<void>(resolve => { finish = resolve; })) };
    const sources = vi.fn(() => bank), preparation = createVoicePreparation(native, sources);
    const first = preparation.prepare();
    expect(preparation.prepare()).toBe(first);
    expect(native.prepareClips).toHaveBeenCalledWith(bank);
    finish(); await first;
    await preparation.prepare(); await preparation.prepare();
    expect(native.prepareClips).toHaveBeenCalledOnce();
    expect(sources).toHaveBeenCalledOnce();
  });

  it('retries a failed preload without poisoning future calls', async () => {
    const native = { prepareClips: vi.fn().mockRejectedValueOnce(new Error('decode failed')).mockResolvedValue(undefined) };
    const preparation = createVoicePreparation(native, () => bank);
    await expect(preparation.prepare()).rejects.toThrow('decode failed');
    await preparation.prepare();
    expect(native.prepareClips).toHaveBeenCalledTimes(2);
  });

  it('releases in the background and ignores failure of an older preparation', async () => {
    let fail!: (error: Error) => void;
    const native = {
      prepareClips: vi.fn().mockImplementationOnce(() => new Promise<void>((_, reject) => { fail = reject; })).mockResolvedValue(undefined),
      releaseClips: vi.fn().mockResolvedValue(undefined),
    };
    const preparation = createVoicePreparation(native, () => bank);
    const old = preparation.prepare();
    await preparation.release();
    const resumed = preparation.prepare();
    fail(new Error('cancelled'));
    await expect(old).rejects.toThrow('cancelled');
    await resumed;
    expect(preparation.prepare()).toBe(resumed);
    expect(native.prepareClips).toHaveBeenCalledTimes(2);
    expect(native.releaseClips).toHaveBeenCalledOnce();
  });

  it('preserves the existing iOS path when no native preload API exists', async () => {
    const sources = vi.fn(() => bank), preparation = createVoicePreparation({}, sources);
    await preparation.prepare(); await preparation.release();
    expect(sources).not.toHaveBeenCalled();
  });
});
