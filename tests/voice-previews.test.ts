import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import catalog from "../shared/voicePacks.json";

describe("offline caller previews", () => {
  it("ships a verified number 47 sample for every caller voice", () => {
    for (const pack of catalog.packs) {
      const expected = pack.files.find((file) => file.number === 47);
      expect(
        expected,
        `${pack.name} has a preview in the catalog`,
      ).toBeDefined();
      const path = resolve(
        "assets/voice",
        pack.bundled ? "aria/47.wav" : `previews/${pack.id}-47.wav`,
      );
      const bytes = readFileSync(path);
      expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        expected!.sha256,
      );
    }
  });
});
