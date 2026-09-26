# Voice implementation verification — 25 September 2026

Passed locally on Windows:

- App and Worker TypeScript checks.
- All176 unit tests in28 files (`npm test -- --maxWorkers=1`), including11 table voice tests. Parallel runs hit the existing5-second avatar base64 test timeout; the unchanged test passes alone and in the serial suite.
- Three native configuration checks.
- Android and iOS JavaScript bundles and existing asset verification. WebRTC124's `event-target-shim/index` export produces a Metro fallback warning; bundling succeeds.
- Android arm64 debug APK compilation, including WebRTC and native audio changes. APK: `artifacts/voice-qa/tambola-circle-voice-dev.apk`; SHA-256 `87c7563ce7f2bd231d1ed847a0e31963639944ead677052041a689e11f7d73c0`. This is a development build requiring Metro and the local API, not a signed production release.
- Worker deployment dry run with both TableRoom and VoiceRoom bindings.
  -13 local API checks against a new isolated database: auth, table membership, kicked member denial, operation/client validation, oversized request denial and disabled/missing-configuration behavior. Run `node scripts/test-table-voice.mjs` against Wrangler on port8791 with `VOICE_ENABLED=false`; test identities are synthetic.

Not yet verified: a live Cloudflare SFU/TURN media exchange, multi-phone playback/capture, Bluetooth/interruption behavior, physical iPhone behavior or native Xcode compilation. Live SFU app/TURN credentials still need provisioning and Worker configuration. No production voice activation or production app release is claimed by these checks.
