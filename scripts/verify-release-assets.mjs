import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { Resvg } from "@resvg/resvg-js";
const version = JSON.parse(readFileSync("app.json", "utf8")).version;
const apk = `artifacts/tambola-circle-${version}.apk`;
const unzip = (args) =>
  execFileSync("unzip", args, { maxBuffer: 128 * 1024 * 1024 });
const entries = unzip(["-Z1", apk]).toString().trim().split(/\r?\n/);
for (const abi of ["arm64-v8a", "armeabi-v7a", "x86_64"]) {
  assert(
    entries.includes(`lib/${abi}/libreactnative.so`),
    `Missing native architecture ${abi}`,
  );
}
const dex = entries
  .filter((p) => /^classes\d*\.dex$/.test(p))
  .map((p) => unzip(["-p", apk, p]));
for (const module of [
  "Lcom/ppegu/circledevice/CircleDeviceModule;",
  "Lcom/ppegu/circledevice/PreparedVoicePlayer;",
  "Lcom/ppegu/circledevice/AndroidVoicePool;",
]) {
  assert(
    dex.some((b) => b.includes(Buffer.from(module))),
    `Missing native module ${module}`,
  );
}
const bundle = unzip(["-p", apk, "assets/index.android.bundle"]);
for (const value of [
  "https://tambola-circle.ffegu0617.workers.dev",
  "https://tambola-circle-voices.ffegu0617.workers.dev",
  "/v2/devices/open",
]) {
  assert(
    bundle.includes(Buffer.from(value)),
    `Missing current release configuration ${value}`,
  );
}
assert(
  dex.some((b) =>
    b.includes(Buffer.from("tambola-circle-voices.ffegu0617.workers.dev")),
  ),
  "Native voice downloader must allow the migrated host",
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
// AAPT losslessly recompresses PNGs and shortens resource paths. Compare decoded
// rendered pixels, rather than container bytes or source filenames.
const pngs = entries
  .filter((p) => p.endsWith(".png"))
  .map((p) => unzip(["-p", apk, p]));
const dimensions = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const pixelCache = new WeakMap();
const pixels = (b) => {
  if (pixelCache.has(b)) return pixelCache.get(b);
  const [w, h] = dimensions(b);
  // These SVG wrappers contain bitmap images only. Avoid scanning system fonts
  // and decoding each APK candidate again for every same-sized source image.
  const value = hash(
    new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="data:image/png;base64,${b.toString("base64")}" width="${w}" height="${h}"/></svg>`,
      { font: { loadSystemFonts: false } },
    )
      .render()
      .asPng(),
  );
  pixelCache.set(b, value);
  return value;
};
// Current screens use the small, pre-cropped native artwork. The legacy offline
// photograph is no longer a runtime dependency and must not be required here.
const artwork = [
  "game-background.png",
  ...readdirSync("assets/game-v3/native")
    .filter((file) => file.endsWith(".png"))
    .map((file) => "native/" + file),
];
for (const file of artwork) {
  const source = readFileSync("assets/game-v3/" + file),
    size = dimensions(source).join("x"),
    expected = pixels(source);
  assert(
    pngs
      .filter((b) => dimensions(b).join("x") === size)
      .some((b) => pixels(b) === expected),
    "Missing approved game artwork pixels: " + file,
  );
}

for (const file of readdirSync("assets/table-avatars").filter((file) =>
  file.endsWith(".png"),
)) {
  const source = readFileSync("assets/table-avatars/" + file),
    size = dimensions(source).join("x"),
    expected = pixels(source);
  assert(
    pngs
      .filter((b) => dimensions(b).join("x") === size)
      .some((b) => pixels(b) === expected),
    "Missing table avatar " + file,
  );
}
for (const feature of [
  "/v2/coin-plans",
  "/v2/wallet/transactions",
  "Registration",
  "tambola.circle.language.v1",
  "TABLE_AVATAR",
])
  assert(
    bundle.includes(Buffer.from(feature)),
    "Missing release feature " + feature,
  );
assert(
  !bundle.includes(Buffer.from("http://127.0.0.1:8791")),
  "Release must not use the local QA API",
);
console.log(
  `Verified three native architectures, production API, registration, prepared audio, localization, 20 table avatars and ${artwork.length} current game-art assets.`,
);
