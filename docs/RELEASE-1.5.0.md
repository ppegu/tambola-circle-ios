# Android test release 1.5.0 / build 10

Published: 24 September 2026. Package is now `com.ppegu.tambola`, signed with the existing production certificate. App changes are at `a342fff`; the release tag includes gallery and verification improvements through `3c071785bc63a559f2b6edc51e2c8a99a9901475` on main.

## Included changes

- Native horizontal screen stacks and shared Zustand state, optimistic ticket marks, native sliders and scoped API loading states.
- Approved caller/lobby and compact ticket selection; caller pause menu and direct 4/5/7 speed controls.
- Wallet, filtered transaction history, backend coin plans and free test purchases.
- Bundled English, Assamese and Hindi UI, first-choice modal and saved language setting. Female spoken number packs remain English.
- Direct Android update workflow and bundled offline voice previews.
- Twenty bundled table avatars, large creation/picker previews, a clearer lobby gear and stable seat/schedule switches.
- Native Numbers and Players modal stacks, a single live volume control, previous call inside Numbers and compact called/left progress.
- [Consolidated v4 design gallery](../design-v4/index.html) and [current guide](../design-v4/DESIGN_GUIDE.md), preserving 35 reference PNGs with source hashes, including voice and update workflows.

## Validation

App/server TypeScript passed. All 138 Vitest tests, two native configuration tests and nine SQLite coin-ledger tests passed. The copied design images retain source checksums and the local gallery resources return successfully. The latest physical Android checks are recorded in [v4 refinement QA](V4-REFINEMENT-QA.md).

All 360 downloadable voice files and the production voice catalog were verified. Production has no pending D1 migrations. Worker `3e6c419a-7983-493d-aa15-1c37541c747d` includes the table-avatar commands/listings, wallet history and live play/watch behavior, preserving the existing database, storage and secrets.

The signed Windows build completed locally on D: in 10m 21s. Verification passed for the existing signing certificate, standalone production bundle, three native ABIs, 90 offline calls, four voice previews, all 20 table avatars and 34 current game-art images. The release contains no local QA API URL.

The APK installed over production 1.3.0/build 8 on the OPPO CPH1945 without uninstalling or clearing data. Version 1.5.0/build 10, first-choice language modal, Home, offline calling, native pause menu, Home return and App Updates were checked in the signed build. The phone was returned to the Metro development app afterward. These checks are not a frame-rate benchmark.

Cloudflare publication completed with a verified full public-download checksum. The release is optional: minimum build stays 1, app lock stays off and legacy metadata enforcement stays disabled.

- APK size: 73,964,528 bytes.
- SHA-256: `cbfb5818f53961b976c62ef17669d8e70ca5908476e1e522150d49365e63b032`.
- Signing certificate SHA-256: `2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071`.
- [Download and installation page](https://tambola-circle.ffegu0617.workers.dev/download/android).
- [Direct APK](https://tambola-circle.ffegu0617.workers.dev/download/android/latest.apk).
- [GitHub Android test release](https://github.com/ppegu/trust-tambola/releases/tag/v1.5.0).
- Local APK and verification reports: `artifacts/release-1.5.0/`.

Payments, advertisement SDKs and voice chat remain TODO. No iOS archive or physical iOS validation is included in this Android release.
