import { Resvg } from "@resvg/resvg-js";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const artwork =
  "data:image/png;base64," +
  (await readFile(path.join(root, "assets/game-v3/game-hero.png"))).toString(
    "base64",
  );
const source = (
  await readFile(path.join(root, "assets/icon.svg"), "utf8")
).replace("game-v3/game-hero.png", artwork);
const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
const full = render(source, 1024);
await writeFile(path.join(root, "assets/icon.png"), full);
await writeFile(path.join(root, "assets/adaptive-icon.png"), full);
await writeFile(
  path.join(
    root,
    "ios/TambolaCircle/Images.xcassets/AppIcon.appiconset/icon.png",
  ),
  full,
);
await writeFile(
  path.join(
    root,
    "ios/TambolaCircle/Images.xcassets/LaunchIcon.imageset/icon.png",
  ),
  full,
);
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><image href="${artwork}" x="190" y="190" width="644" height="644"/></svg>`;
for (const [density, size] of [
  ["mdpi", 48],
  ["hdpi", 72],
  ["xhdpi", 96],
  ["xxhdpi", 144],
  ["xxxhdpi", 192],
]) {
  const dir = path.join(root, "android/app/src/main/res/mipmap-" + density);
  await mkdir(dir, { recursive: true });
  const splash = path.join(
    root,
    "android/app/src/main/res/drawable-" + density,
    "splashscreen_logo.png",
  );
  const splashSize = (await readFile(splash)).readUInt32BE(16);
  await writeFile(splash, render(foreground, splashSize));
  for (const name of [
    "ic_launcher",
    "ic_launcher_round",
    "ic_launcher_foreground",
  ]) {
    // Replace only obsolete source artwork; saved app data is never touched.
    await unlink(path.join(dir, name + ".webp")).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    await writeFile(
      path.join(dir, name + ".png"),
      render(
        name.endsWith("foreground") ? foreground : source,
        name.endsWith("foreground") ? size * 2.25 : size,
      ),
    );
  }
}
console.log("Generated crowned game artwork icons for Android and iOS.");
