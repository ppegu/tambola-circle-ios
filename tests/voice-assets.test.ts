import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { numberCallDelayMs } from "../shared/voiceTiming";
import { callParts } from "../shared/callPhrase";
describe("female offline number calls", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../assets/voice/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  it("ships all ninety digit/full phrases with verified hashes and one shared speaking speed", () => {
    expect(
      readdirSync(new URL("../assets/voice/en-female/", import.meta.url))
        .filter((file) => file.endsWith(".wav"))
        .sort(),
    ).toEqual(Array.from({ length: 90 }, (_, i) => `${i + 1}.wav`).sort());
    expect(manifest.map((c: { number: number }) => c.number)).toEqual(
      Array.from({ length: 90 }, (_, i) => i + 1),
    );
    expect(
      new Set(manifest.map((c: { lengthScale: number }) => c.lengthScale)).size,
    ).toBe(1);
    for (const c of manifest) {
      expect(c.voice).toBe("female");
      expect(c.part).toBe("full");
      expect(c.cadenceVersion).toBe(8);
      expect({ digits: c.digits, full: c.full }).toEqual(callParts(c.number));
      expect(c.text).toBe((c.digits ? c.digits + ". " : "") + c.full + ".");
      const bytes = readFileSync(
        new URL("../assets/voice/" + c.file, import.meta.url),
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(c.sha256);
    }
  });
  it("contains only intentional gaps and allows each announcement to finish", () => {
    for (const c of manifest) {
      const bytes = readFileSync(
          new URL("../assets/voice/" + c.file, import.meta.url),
        ),
        pcm = bytes.subarray(44);
      expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
      expect(bytes.readUInt32LE(4)).toBe(bytes.length - 8);
      expect(bytes.readUInt16LE(22)).toBe(1);
      expect(bytes.readUInt16LE(34)).toBe(16);
      expect(bytes.readUInt32LE(40)).toBe(pcm.length);
      const digits = c.digitSamples * 2,
        gap = Math.round((c.sampleRate * c.gapMs) / 1000) * 2,
        full = c.fullSamples * 2;
      expect(c.gapMs).toBe(c.number >= 10 ? 500 : 0);
      if (c.number >= 10)
        expect(pcm.subarray(0, digits).some((v) => v !== 0)).toBe(true);
      expect(pcm.subarray(digits, digits + gap).every((v) => v === 0)).toBe(
        true,
      );
      expect(
        pcm.subarray(digits + gap, digits + gap + full).some((v) => v !== 0),
      ).toBe(true);
      expect(pcm.length).toBe(digits + gap + full); // No artificial trailing silence.
      expect((pcm.length / bytes.readUInt32LE(28)) * 1000).toBeCloseTo(
        c.durationMs,
        6,
      );
      expect(pcm.length).toBeLessThan(1024 * 1024); // SoundPool's decoded per-sample limit.
      expect(numberCallDelayMs(c.number, 3)).toBeGreaterThanOrEqual(
        c.durationMs + 250,
      );
      expect(numberCallDelayMs(c.number, 10)).toBe(10000);
    }
  });
  it("uses identical, audible words throughout the bank with clear gaps and no padded edges", () => {
    const words = new Map<string, Buffer>();
    for (const c of manifest) {
      const pcm = readFileSync(
        new URL("../assets/voice/" + c.file, import.meta.url),
      ).subarray(44);
      expect(c.wordGapMs).toBe(180);
      expect(c.segments.map((s: { word: string }) => s.word).join(" ")).toBe(
        (c.digits ? c.digits + " " : "") + c.full,
      );
      expect(c.segments[0].startSample).toBe(0);
      let end = 0;
      for (const s of c.segments) {
        const word = pcm.subarray(
          s.startSample * 2,
          (s.startSample + s.samples) * 2,
        );
        if (end > 0)
          expect(s.startSample - end).toBe(
            Math.round(
              (c.sampleRate * (end === c.digitSamples ? 500 : 180)) / 1000,
            ),
          );
        expect(
          pcm.subarray(end * 2, s.startSample * 2).every((v) => v === 0),
        ).toBe(true);
        if (words.has(s.word))
          expect(word.equals(words.get(s.word)!)).toBe(true);
        else words.set(s.word, word);
        end = s.startSample + s.samples;
      }
      expect(end * 2).toBe(pcm.length);
    }
    for (const [text, word] of words) {
      const samples = Array.from({ length: word.length / 2 }, (_, i) =>
        word.readInt16LE(i * 2),
      );
      const peak = Math.max(...samples.map(Math.abs)),
        rms = Math.sqrt(
          samples.reduce((sum, s) => sum + s * s, 0) / samples.length,
        );
      expect(peak).toBeLessThan(32767);
      expect(rms / 32767).toBeGreaterThan(0.18);
      if (text === "one") {
        expect(rms / 32767).toBeGreaterThan(0.21);
        expect(rms / 32767).toBeLessThan(0.22);
      }
      expect(
        (samples.findIndex((s) => Math.abs(s) >= 32) / 22050) * 1000,
      ).toBeLessThan(10);
      expect(
        ([...samples].reverse().findIndex((s) => Math.abs(s) >= 32) / 22050) *
          1000,
      ).toBeLessThan(10);
    }
  });
});
