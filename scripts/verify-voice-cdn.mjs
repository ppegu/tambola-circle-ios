import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// A release may only reference complete, immutable packs already available online.
const base =
  process.env.VOICE_CDN ||
  "https://tambola-circle-voices.ffegu0617.workers.dev";
const catalog = JSON.parse(await readFile("shared/voicePacks.json", "utf8"));
async function get(path) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(base + path, {
        signal: AbortSignal.timeout(30000),
      });
      assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
      return { response, bytes: Buffer.from(await response.arrayBuffer()) };
    } catch (failure) {
      error = failure;
      if (attempt < 2) await delay((attempt + 1) * 1500);
    }
  }
  throw error;
}
const published = await get("/catalog.json");
assert.deepEqual(
  JSON.parse(published.bytes.toString("utf8")),
  catalog,
  "Published catalog differs from the app catalog",
);
const pending = catalog.packs
  .filter((pack) => !pack.bundled)
  .flatMap((pack) => pack.files.map((file) => ({ pack, file })));
let verifiedFiles = 0,
  verifiedBytes = 0;
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (pending.length) {
      const { pack, file } = pending.shift();
      const path = `/packs/${pack.id}/${pack.revision}/${file.number}.wav`;
      const { response, bytes } = await get(path);
      assert.equal(bytes.length, file.bytes, `${path}: size mismatch`);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        file.sha256,
        `${path}: hash mismatch`,
      );
      assert.equal(
        response.headers.get("access-control-allow-origin"),
        "*",
        `${path}: CORS missing`,
      );
      assert.match(
        response.headers.get("cache-control") ?? "",
        /immutable/,
        `${path}: immutable caching missing`,
      );
      verifiedFiles++;
      verifiedBytes += bytes.length;
    }
  }),
);
const report = {
  url: base,
  verifiedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA ?? null,
  verifiedFiles,
  verifiedBytes,
  packs: catalog.packs.map(({ id, revision, bundled, totalBytes }) => ({
    id,
    revision,
    bundled,
    totalBytes,
  })),
};
const output = process.argv[2] ?? "artifacts/voice-cdn-verification.json";
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  `Verified ${verifiedFiles} production voice files (${verifiedBytes} bytes) and the app catalog at ${base}`,
);
