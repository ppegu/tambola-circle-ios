# Downloadable caller voices

This separate Cloudflare static asset project hosts Neerja, Ava, Emma and Sonia. It does not deploy or modify the multiplayer game API. Aria is embedded by static Metro requires in `src/voiceBank.ts`, shared by Android and iOS.

The user approved the complete listening review on 2026-09-23 and authorized upload and native builds for version 1.3.0.

Generated immutable files live at `/packs/<voice>/<revision>/<number>.wav`. The bundled catalog in `shared/voicePacks.json` pins each file's exact size and SHA-256. The native clients check every downloaded file before allowing offline selection. Interrupted downloads retain verified files for retry; selecting a voice is an explicit action after download. Downloaded files are app-private persistent data, separate from playback caches.

The production endpoint is `https://tambola-circle-voices.ffegu0617.workers.dev`. Deploy from the repository root with `npx wrangler deploy --config voice-packs/wrangler.jsonc`, then run `node scripts/verify-voice-cdn.mjs` to verify every published file against the app's pinned hashes. Both native build workflows run this check and retain its report alongside the app artifact. Preserve existing revision directories when adding revised packs so previously installed app versions can still download their pinned files.

Audio provenance: Microsoft Edge online speech service, via edge-tts 7.2.8, using the same five service voice IDs as the approved auditions. Rate -8%; pitch +0Hz; no pitch/formant conversion. The generated manifests identify each source voice and phrase. Generation script: `scripts/generate-caller-packs.py`. Preserve this provenance; it is not an audio redistribution license.
