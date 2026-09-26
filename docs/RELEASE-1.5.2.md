# Android 1.5.2 / build 12

Published on 2026-09-24 as a **required update**. Build source and tag `v1.5.2`: `c43e6735ee711bc71b1a2cb41bed7664d0984d9d`, with a clean worktree at build time. Subsequent documentation commits do not change the APK.

## Changes

- Captain terminology, pause/resume on the current number, live caller speed changes and a synchronized five-second opening countdown.
- Captains can start after confirming tickets; compact lobby and speed controls provide more ticket space.
- Winner-aware results show the winning ticket and called-number board immediately, followed by personal ticket options.
- Rejected full-house claims become watch-only with missing-number feedback. Every player can return to the lobby after a round.
- Tambola Circle sharing links, first-launch connection handling, and English, Assamese and Hindi copy updates.

Payments, ads and voice chat remain deferred. Coin top-ups are still free test purchases. This release publishes Android only.

## Build and validation

- Built locally on D: in 6m 26s using the existing production signing key and unchanged package ID to preserve upgrade compatibility and saved data.
- TypeScript checks, 160 tests across 25 files, and three native configuration checks passed.
- Verified all 360 production downloadable voice files (37,672,794 bytes), production health, 90 bundled Aria calls and four offline voice previews.
- APK inspection verified standalone JavaScript, non-debuggable release manifest, native CircleDevice bridge, 20 table avatars, current game artwork and production API.
- Includes ARM64, ARMv7 and x86_64; minimum Android API 24.
- APK size: **73,981,028 bytes**.
- SHA-256: `fad7007a3cf8abaab766a083d25126bf6d4bb7c6868cf874c9bad5d664608e05`.
- Signing certificate SHA-256: `2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071`.
- R2 publication streamed the entire public APK back and verified its size and SHA-256. GitHub reports the same APK digest and size.
- An in-place Android test upgrade from 1.5.1 / build 11 to 1.5.2 / build 12 succeeded without uninstalling or clearing app data. The updated app process launched. Visual acceptance of this release binary was not completed because the test screen was unavailable. Device-specific evidence remains local and is not attached to the public release.

## Mandatory policy

The APK was published and verified before setting **latestBuild = minimumBuild = 12** at production policy revision **6**. The app remains unlocked; the existing 24-hour offline allowance and `requireMetadata: false` were preserved. No existing binary was replaced or signing key changed.

Production smoke checks using a synthetic device identity (no player account, phone number, wallet or table) verified RSA signatures against the bundled public key. Build 11 receives `required_update` with the exact build-12 URL, hash and byte count; build 12 receives `allow`. Download, versioned release and installation-help pages return HTTP 200. A device with an existing offline lease learns the new policy on its next successful check; pre-guard legacy apps cannot be forced to close while disconnected.

## Distribution

- [GitHub release](https://github.com/ppegu/trust-tambola/releases/tag/v1.5.2)
- [Versioned APK download](https://github.com/ppegu/trust-tambola/releases/download/v1.5.2/tambola-circle-1.5.2.apk)
- [In-app update download page](https://tambola-circle.ffegu0617.workers.dev/download/android)
- Local artifact: `artifacts/release-1.5.2/tambola-circle-1.5.2.apk`.

The GitHub release retains the Android test-release prerelease convention; the in-app policy independently makes this build mandatory. Its `<!-- native-build:local -->` marker skipped both native workflows before allocating build runners: Android run `36017993307`, iOS run `36017993340`. Main pushes do not trigger native builds.

Verification assets include `SHA256SUMS.txt`, `signature.txt`, `apk-info.txt`, `permissions.txt`, `build-info.json`, `release.json` and `policy-verification.json`.
