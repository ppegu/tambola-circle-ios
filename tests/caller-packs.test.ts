import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import catalog from '../shared/voicePacks.json';
import { numberCallDelayMs } from '../shared/voiceTiming';

describe('complete caller pack release inputs', () => {
  it('includes ninety verified offline files per voice and only bundles Aria', () => {
    expect(catalog.packs.map(p => p.id)).toEqual(['aria', 'neerja', 'ava', 'emma', 'sonia']);
    for (const pack of catalog.packs) {
      expect(pack.bundled).toBe(pack.id === 'aria');
      expect(pack.files.map(f => f.number)).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
      let total = 0;
      for (const file of pack.files) {
        const path = pack.bundled ? `../assets/voice/aria/${file.number}.wav` : `../voice-packs/public/packs/${pack.id}/${pack.revision}/${file.number}.wav`;
        const bytes = readFileSync(new URL(path, import.meta.url)); total += bytes.length;
        expect(bytes.length).toBe(file.bytes); expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
        expect(bytes.length).toBeLessThan(1024 * 1024);
        expect(numberCallDelayMs(file.number, 3)).toBeGreaterThanOrEqual(file.durationMs + 250);
      }
      expect(total).toBe(pack.totalBytes);
    }
    const bank = readFileSync(new URL('../src/voiceBank.ts', import.meta.url), 'utf8');
    expect((bank.match(/require\(/g) ?? []).length).toBe(90);
    expect(bank).not.toContain('en-female'); expect(bank).not.toContain('voice-packs/public');
  }, 30_000);
});
