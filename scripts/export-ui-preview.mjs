import { build } from "esbuild";
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = process.cwd(),
  output = path.join(root, "artifacts/ui-v3");
mkdirSync(path.join(output, "assets"), { recursive: true });
await build({
  entryPoints: ["scripts/ui-preview.tsx"],
  outfile: path.join(output, "app.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  define: { __DEV__: "false", "process.env.NODE_ENV": '"production"' },
  resolveExtensions: [
    ".web.tsx",
    ".web.ts",
    ".web.js",
    ".tsx",
    ".ts",
    ".js",
    ".json",
  ],
  alias: {
    "react-native": path.join(
      root,
      "node_modules/react-native-web/dist/index.js",
    ),
    "react-native-svg": path.join(
      root,
      "node_modules/react-native-svg/src/ReactNativeSVG.web.ts",
    ),
  },
  plugins: [
    {
      name: "native-preview-adapters",
      setup(b) {
        b.onResolve(
          { filter: /modules\/circle-device$|^circle-device$/ },
          () => ({ path: "device", namespace: "preview" }),
        );
        b.onResolve(
          { filter: /^@react-native-async-storage\/async-storage$/ },
          () => ({ path: "storage", namespace: "preview" }),
        );
        b.onLoad({ filter: /.*/, namespace: "preview" }, (args) => ({
          contents:
            args.path === "device"
              ? `export default { haptic(){}, randomUUID:()=>crypto.randomUUID(), randomHex:n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join(''),setClipboard:async s=>navigator.clipboard.writeText(s),setGameUi:async()=>{},selectPhoneNumber:async()=>'+919876543210',setAudioActive:async()=>{},playClip:async()=>{},stopClip(){} };`
              : `export default {getItem:async k=>localStorage.getItem(k),setItem:async(k,v)=>localStorage.setItem(k,v),removeItem:async k=>localStorage.removeItem(k)};`,
          loader: "js",
        }));
      },
    },
    {
      name: "native-images",
      setup(b) {
        b.onLoad({ filter: /\.(png|jpg)$/ }, (args) => {
          const data = readFileSync(args.path),
            name = path.basename(args.path);
          copyFileSync(args.path, path.join(output, "assets", name));
          const png = args.path.endsWith(".png");
          return {
            contents: `module.exports=${JSON.stringify({ uri: "assets/" + name, ...(png ? { width: data.readUInt32BE(16), height: data.readUInt32BE(20) } : { width: 576, height: 1280 }) })}`,
            loader: "js",
          };
        });
      },
    },
  ],
});
writeFileSync(
  path.join(output, "index.html"),
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tambola Circle — implemented UI preview</title><style>html,body,#root{height:100%;margin:0;background:#1f082b}*{box-sizing:border-box}#root{display:flex;flex-direction:column}input{position:relative}#phone{position:relative;width:100%;max-width:576px;height:100%;margin:auto;overflow:hidden;background:#31065b}</style></head><body><div id="phone"><div id="root"></div></div><script src="app.js"></script></body></html>`,
);
console.log("Rendered-component preview: artifacts/ui-v3/index.html");
