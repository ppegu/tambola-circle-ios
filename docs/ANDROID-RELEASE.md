# Android APK release

The **Build Android APK** GitHub Actions workflow runs when a `v*` GitHub release is published, or when manually dispatched from an existing `v*` tag. Main/branch pushes, pull requests and bare tag pushes do not allocate build runners. Using one automatic release event avoids duplicate builds for a tag and its release. For a verified local release, include `<!-- native-build:local -->` in its GitHub release notes: both native build jobs skip before allocating runners. Manual version-tag builds remain available. The workflow installs pinned dependencies, runs checks, builds the checked-in Android project with the React Native Gradle plugin, verifies the signed standalone APK and all 90 female offline voice clips, and uploads an APK artifact.

Required repository secrets:

- `ANDROID_KEYSTORE_BASE64`: Base64-encoded app release keystore.
- `ANDROID_KEYSTORE_PASSWORD`: Password for that keystore and its `trust-tambola` alias.

The initial signing material is stored locally in ignored `.credentials/`. Keep a secure backup of both files there; future app updates must use the same key. Never commit these files or attach them to a GitHub release.

The build targets Android 7.0+ (API 24) and includes ARM64, ARMv7, and x86_64 native libraries. It contains the JavaScript bundle and the female offline voice pack, so Metro and an internet connection are not needed for calling. Accounts and preference sync use the existing HTTPS Cloudflare API.

The release displays **Tambola Circle** across the launcher, app and icon artwork. The Android package ID is `com.ppegu.tambola`; the existing signing key and local storage keys are retained to preserve saved data and sign-ins. Current source: **1.5.2 / Android build 12**. Returning Home from the offline caller intentionally resets that round.

Publish the versioned GitHub release to start its build, or run `gh workflow run android-apk.yml --ref <version-tag>` for a deliberate tag build. Manual dispatches on `main` are skipped before allocating a runner. The tag must contain this workflow policy. Download `tambola-circle-apk`; its APK filename uses the version in `app.json`. Attach the APK, SHA256SUMS.txt, and verification reports to that versioned GitHub release. The workflow has read-only repository permissions and does not publish a release by itself. For a local APK release, upload the verified assets to a draft first and include the local-build marker before publishing.

The active API and D1 now use the Tambola Circle resources. Compatibility forwarding, the copied database, the original authentication secret and unchanged local storage keys preserve existing accounts and APKs; see [the Cloudflare migration](CLOUDFLARE-MIGRATION.md). Before testing online tables against production, apply the new D1 migration and deploy the Worker as described in [the implementation record](TAMBOLA-CIRCLE-IMPLEMENTATION.md). The device number picker is included in the native CircleDevice module.

For local Windows commands, first run `. .\scripts\use-d-drive.ps1` from the workspace. The development cache and temporary paths then live under `D:\BuildCache`; the script sets process-scoped defaults without relocating credentials. Existing running applications need restarting to inherit those defaults. SDK files are downloaded only when a local native build is needed; GitHub builds use the runner's SDK. Release downloads stay in `D:\OnlineTam\artifacts`.

The checked-in Gradle file reads version metadata from `app.json`. It requires the existing signing environment variables for release tasks and never falls back to debug signing. `npm run android` builds a debug app; it cannot replace a release-signed installation. Use a separately provisioned test device or a properly signed release update when checking data retention; do not uninstall the existing app.

For the configured Windows workstation, `scripts/build-local-apk.ps1` builds on D: and `scripts/verify-local-apk.ps1` checks the signature, voice hashes, current native artwork and production API before collecting `artifacts/release-1.5.2`. [Current release validation](RELEASE-1.5.2.md). Android 1.5.2 / build 12 is mandatory: production policy revision 6 sets minimum build 12. Publish through the [signed direct-update workflow](ANDROID-UPDATES.md) so test users can update in the app as well as download the APK.
