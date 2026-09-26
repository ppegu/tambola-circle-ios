# Tambola Circle 1.1.2

The offline caller follows the user-supplied Photo 2: white canvas, large black current number, previous coin on the left, repeat speaker below it, circular speed options, original purple call/menu artwork, original number-history sign, cyan number grid and red called cells. Its layout remains fixed and adapts to compact screens. The original control artwork is clipped at render time from the unchanged reference asset; all called numbers, settings and history remain interactive. Online screens retain their separate approved theme.

On iPhone, registration accepts a manually entered international phone number and labels it unverified. Android keeps its native number picker. No SMS verification or recovery code is added.

Both platforms generate/preserve an app UUID in SecureStore on startup. Device metadata is cached locally before networking and synchronized to a pre-registration D1 device record. Registration later links the device row to the player. An existing saved credential/profile survives the UUID upgrade. Duplicate phone numbers do not merge accounts, and UUID/platform identifiers are never authentication credentials. See [data handling](DATA-HANDLING.md) for fields, permissions and identifier limitations.

Database migration: `0005_device_records.sql`, applied before the matching Worker deployment. Existing Android registration requests remain compatible. The app uses package/bundle ID `com.ppegu.tambola`; Android version code is 5.

Validation completed before packaging: app/server TypeScript; 53 unit tests; 28 device-registration integration assertions; 128 multiplayer API checks plus WebSocket synchronization, durable history, deadlines and reconnect; Worker dry-run bundling. Browser captures use actual components and synthetic example data. Physical-device checks remain necessary for SIM-picker availability, iPhone keyboard/autofill, and platform identifier behavior.

## Deployment and package status

Implementation commit: `3a59efe0690813e16bb7ccfcabcef3ee541e1518`.

Migration 0005 is applied remotely. The Worker is deployed at https://tambola-circle.ffegu0617.workers.dev with version `8e76e9ce-2f7c-47ac-9e9c-85634fb71587`. Production health returned 200, and the new device endpoint returned 401 without a device credential. A local D1 query confirmed the synthetic iOS device's UUID, platform, model, OS and app version, plus its account linkage.

Both production JavaScript bundles exported successfully for Android and iOS, including 344 assets (342 voice clips and two UI reference-art assets). The actual-component comparison gallery is `artifacts/ui-review-1.1.2/index.html`, with a portable ZIP at `artifacts/tambola-circle-1.1.2-ui-preview.zip`. Browser checks covered the restored caller at 390×844 and 320×480, number history, iPhone input/consent validation, and account UUID display.

The [Android APK is published](https://github.com/ppegu/trust-tambola/releases/download/v1.1.2/tambola-circle-1.1.2.apk) in [release v1.1.2](https://github.com/ppegu/trust-tambola/releases/tag/v1.1.2). It was built locally on Windows from `108cabdc737941bc5fe8b61ac137affb724ee503`, using Java 21 and Gradle 9.3.1 with build files and caches on D:. It contains arm64-v8a, armeabi-v7a and x86_64 libraries and retains the existing release signing key. The repository is private; downloads require an authorized GitHub sign-in.

APK verification passed for release version/label, the strict permission allow-list, the existing signing certificate, standalone JavaScript and production API configuration, all three native architectures, the CircleDevice/Application/Device modules, the original caller artwork, and hashes of all 342 voice clips. The unused Google Play install-referrer permission introduced by expo-application is explicitly blocked; device registration does not use that API. No verification checks were relaxed.

The APK is 78,675,488 bytes. SHA-256: `8d24b9668119f8b50a8ee33a0295f6e97b3c0080917fa17a4b173f33e7e50fcf`. GitHub's uploaded asset size and digest match the verified local file. APK, checksum, certificate, manifest and build-provenance reports are saved in `artifacts/release-1.1.2/` and attached to the release.

The earlier [Android hosted run 35681785477](https://github.com/ppegu/trust-tambola/actions/runs/35681785477) and [iOS run 35681787793](https://github.com/ppegu/trust-tambola/actions/runs/35681787793) were denied before any runner step started because of GitHub account billing/spending limits. Android packaging is now complete through the local build. A new iOS 1.1.2 IPA has not been generated; that hosted build still requires the account owner to resolve billing. No billing settings were changed, and older 1.1.1 IPAs do not contain these changes.
