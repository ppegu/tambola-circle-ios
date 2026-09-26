# Tambola Circle 1.3.0

The approved Aria caller is included in Android and iOS. Settings now offers Neerja, Ava, Emma and Sonia with previews, verified downloads, progress/cancellation, explicit selection and offline retention. All voices share the existing caller playback controller. Automatic-call timing accommodates the longest approved clip for each number.

This release also includes the coordinated online-screen checkpoint: registration/avatar improvements, table previews, atomic host-seat/scheduled creation, lobbies, ticket selection, live-call controls and the numbers drawer. Screens 11–20 remain under the other development task; this release does not claim their visual review is complete.

## Source and delivery

- App version 1.3.0, native build 8 on both platforms; same application identifiers and Android signing certificate as existing installs.
- Voice service: https://tambola-circle-voices.ffegu0617.workers.dev
- Game API: https://tambola-circle.ffegu0617.workers.dev
- Avatar migration `0009_player_avatar.sql` applied to production; `0008` was already applied.
- Both CI workflows verify all 360 optional production calls and the exact 90 bundled Aria hashes. Catalog, CDN verification and package checksums accompany the artifacts.
- Android remains a signed standalone APK. iOS remains an unsigned arm64 device IPA for signing with Sideloadly; no Apple signing credentials are stored in CI.

## Validation

App/server type checks, 88 unit tests, two native configuration tests and 16 Python packaging/ledger tests passed before the release checkpoint. All 450 local WAVs passed size/hash and audio-format checks in the listening handoff. All 360 optional production WAVs (37,672,794 bytes) and the published catalog passed the pinned hash checks. Voice deployment: `81bf12fa-d4a4-43c6-a272-cc426090dde8`; game deployment: `4cea4491-ff02-40d6-9a09-af7f1b21c240`, with `/health` returning 200. Native compilation, artifact checks and device results are recorded after those steps complete.

The local full-number listener remains available at http://127.0.0.1:8795/female-voice-samples/review.html. Audio source files and immutable optional packs are included in Git; binary builds and logs stay under `artifacts/` on D: and in GitHub artifacts/releases.

## Hosted build availability

GitHub rejected Android run `35822939007` and iOS run `35822942319` before any build steps because recent account payments failed or the Actions spending limit needs increasing. Both used source `baf5cc51e33fb420611236ce57c12533aa443c90`. The user chose to finish Android and leave the IPA pending. The IPA still needs a macOS build after GitHub billing is restored; the new Objective-C voice-storage bridge has not yet been compiled on Apple tooling. Clean Android and iOS JavaScript bundles both passed exact checks of the 90 Aria files.

## Verified Android artifact

The signed local APK was built from `a56de55ec3f7a9ae9c50ae4b0814d5876590a3fe`, including the coordinated Android 11 modal safe-area fix. Package verification passed for version 1.3.0/build 8, the existing signing certificate, all three native architectures, the voice-storage/prepared-player bridge, the production API, artwork, and the exact 90 approved Aria hashes. A stale Metro asset issue was caught during verification; the release script now clears only validated generated asset outputs before rebuilding.

- Path: `artifacts/release-1.3.0/tambola-circle-1.3.0.apk`
- Size: 74,693,238 bytes
- SHA-256: `06295e9fbdf19ae93c66938e0a19c0621f8c2eeace07cae89f28ac2be6d33c11`
- Signing certificate SHA-256: `2d07b75319bacbafaa3750671d7b07e4beee8e4421952921fd79ec20c6bd0071`
- Installed successfully with `adb -r` on CPH1945 (Android 11), preserving app data. Device checks passed: included/default Aria, preview, Emma download with progress without auto-selection, explicit Emma selection/preview, saved download and selection after force-stop/relaunch, Neerja cancellation and completed retry. Aria was restored as active; Emma and Neerja remain downloaded.
- Wi-Fi stayed enabled for wireless ADB. Network-disabled playback and acoustic judgment were not tested. The separate local-development ticket-tap investigation remains with the other task and is not a confirmed release regression.
- GitHub release: https://github.com/ppegu/trust-tambola/releases/tag/v1.3.0. GitHub's APK SHA-256 matches the verified local file. The release includes the signed APK, checksum and verification archive with device QA details.
