# Validation record — 21 September 2026

This is a historical record for the original Expo release. See [the React Native migration](REACT-NATIVE-MIGRATION.md) for the migration baseline and [release 1.2.0](RELEASE-1.2.0.md) for current validation.

The app’s home screen reads **Trust**. Both bundled English voices say “two three”, wait the configured pause (default 1 second), then say “twenty three”. Pause choices are 0.5, 1, 1.5, and 2 seconds.

Completed checks:

- TypeScript validation of the Expo app and Cloudflare Worker.
- 21 automated tests: all 90 draws without repeats; invalid history/preferences; digit/full-number phrases, including zero digits; 342 valid, trimmed PCM clips; exact timer delays after digit completion; cancellation during the gap; stale/duplicate events; single digits; playback failure recovery.
- 30 local API checks (including call-pause persistence and invalid-value rejection): guest isolation, body/schema validation, preference conflicts, CORS, registration, login, logout, recovery, session invalidation, and deletion.
- Live Cloudflare smoke test: health, D1 guest persistence, account registration/login, female voice and call-pause preference sync, and cleanup of the disposable test profile.
- Android and iOS Metro/Hermes production exports with both voice packs embedded; web production export.
- Signed standalone Android release APK built successfully in GitHub Actions. The final APK passed signature verification, a strict permission allowlist, and checks for the bundled JavaScript and all 342 offline audio clips. The dependency-added WAKE_LOCK permission was explicitly removed before the successful build.
- Android native project generation. The generated manifest removes microphone, camera, location, media-library, notification, advertising ID, overlay, and biometric permissions. Normal network/audio settings declarations remain; they do not require runtime permission prompts.
- Browser UI checks at a 390 × 844 phone viewport: screenshot-inspired home/caller layout, manual draw, automatic draw, number highlighting, previous number, history, settings, and voice selection/preview. The new pause controls were checked on a 390 × 844 viewport, including a two-second setting surviving reload and cloud sync; the final selection is one second.

Environment limits:

- Expo Doctor dependency checks passed after installing the matching SDK 57 packages. Its remaining remote app-config schema check could not complete because the Expo API TLS connection failed. Native prebuild and exports succeeded.
- The signed APK has not been installed or exercised on physical hardware. AAB and IPA builds have not been produced. The Android SDK is absent on this Windows host, so the APK was compiled with GitHub Actions; iOS native builds require macOS/Xcode or EAS. See docs/ANDROID-RELEASE.md for the repeatable APK build.
- The browser preview uses browser media playback. Native apps use Expo Audio with the same bundled WAVs. Real-device airplane-mode and audio-interruption checks remain part of release testing.

Deployed API: https://tambola-circle.ffegu0617.workers.dev

Worker version: `295f6815-f7e1-438f-9f62-289935297ee6`.

Migration 0003 was applied locally and remotely, and the shared five-field preference schema was deployed to the existing Worker. Both offline voice packs now contain separate digit/full-number clips (11.84 MiB total). Physical-device audio timing still needs release testing; timer tests verify the configured delay before starting the full-number clip, with normal platform scheduling/loading latency.

Successful APK build: https://github.com/ppegu/trust-tambola/actions/runs/35590563117

APK source commit: eb8f0db75e353f3b18eda028f6b7f31a467f7e0e.

APK SHA-256: 9165801ca730c19e916337a4e8ac559864bda40d6bdc10563d831ca990b12056.

Published release: https://github.com/ppegu/trust-tambola/releases/tag/v1.0.0. GitHub's uploaded asset SHA-256 matches the locally verified APK.
