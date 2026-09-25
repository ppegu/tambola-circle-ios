# Android release 1.5.1 / build 11

Release source: `91ba4dc` on `main`. The package is `com.ppegu.tambola` and uses the existing production signing certificate.

## Changes since 1.5.0

- Native screens prepare their initial content before the horizontal transition, avoiding the empty-screen-then-content effect.
- Shared screen context and cached ticket data reduce repeated work when opening ticket screens. Read-only ticket cells avoid interactive animation overhead.
- Production API, website, release downloads and voice packs use the new Tambola Circle Cloudflare services.
- Native Android voice download validation recognizes the migrated voice host.
- Existing installations retain access through the old service URLs. Signed update downloads use the appropriate origin for old and new clients.

This release also includes all 1.5.0 features: the latest v4 visuals, table avatars, native Numbers/Players panels, wallet and coin history, English/Assamese/Hindi interface, offline caller and app update workflow.

Payments, ads and voice chat remain deferred. Coin top-ups remain free test purchases. No iOS release is included.

## Verification

TypeScript checks, 142 unit tests, two native configuration tests and nine SQLite coin-ledger tests passed. The signed local build completed on D: in 7m 33s. APK verification passed for the existing certificate, three ABIs, standalone production bundle, 90 offline calls, four voice previews, 20 table avatars, 34 current game-art images and the migrated API/voice origins in both JavaScript and native code.


The release installed over 1.5.0/build 10 on the connected OPPO CPH1945 without uninstalling or clearing app data. The online version/access check, Home, offline number calling, Play/Pause, native pause menu and Home reset behavior passed. The first launch briefly displayed the connection fallback before its automatic access refresh completed. These checks are not a frame-rate benchmark or a listening assessment of voice pronunciation.

- APK: `tambola-circle-1.5.1.apk`, 73,967,404 bytes.
- SHA-256: `e4f9a339b2fb58258115e37ca171a67a9974598028edc599a067946d9f952dbe`.
- Signing certificate: `2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071`.
- Local artifact and verification reports: `artifacts/release-1.5.1/`.
- The APK's application/build inputs match source commit `91ba4dc`. The additional uncommitted work at verification time was release documentation and a stricter artifact-verification script, not application code.

Cloudflare publication completed with a full public-download SHA-256 check. Both the original and new API addresses offer correctly signed optional build 11 updates to a build 10 client, with matching-origin resumable APK downloads. The minimum build remains 1, the app lock remains off, and metadata enforcement remains disabled.

## Downloads

- [Android download page](https://tambola-circle.ffegu0617.workers.dev/download/android).
- [Version 1.5.1 release page](https://tambola-circle.ffegu0617.workers.dev/releases/android/1.5.1).
- [GitHub release](https://github.com/ppegu/trust-tambola/releases/tag/v1.5.1).
