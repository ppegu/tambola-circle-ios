# React Native migration

The app now uses React Native 0.86.3 and the Community CLI directly. Supported targets are Android and iOS. The server and game protocol are unchanged.

## Native replacements

| Previous service                             | Current implementation                                                           |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Expo root registration, Metro, prebuild, EAS | AppRegistry, React Native Metro/Babel, checked-in Gradle and Xcode projects      |
| Expo audio and asset playback                | Android MediaPlayer / iOS AVAudioPlayer; Metro bundles the existing 342 WAVs     |
| Expo SecureStore                             | OS Keystore AES-GCM / iOS Keychain, retaining the installed app's storage format |
| Expo crypto                                  | SecureRandom / SecRandomCopyBytes and platform UUID generators                   |
| Expo device/application                      | Android Build, Settings.Secure and package metadata / UIDevice and Bundle        |
| Expo clipboard                               | Native clipboard / UIPasteboard                                                  |
| Expo linear gradients                        | The existing react-native-svg renderer                                           |
| Expo CircleDevice module                     | Autolinked React Native native module                                            |

The existing Android phone-number picker, media-volume routing and immersive game UI are retained. iOS continues to use its explicitly unverified manual-number flow. Audio playback stays foreground-only, works in silent mode on iOS, and mixes with other audio. No microphone capability is added.

## Updates and saved data

Use the package/bundle ID `com.ppegu.tambola` and the existing Android signing key or iOS signing team. AsyncStorage and its keys are unchanged. Protected identities retain Android's `SecureStore` preferences, `key_v1` namespace, AES-GCM ciphertext format and Keystore aliases; iOS retains the `app:no-auth` and legacy `app` Keychain service/account encoding. New iOS writes remain `WhenUnlockedThisDeviceOnly`. Decryption errors are surfaced rather than clearing or replacing an identity. Android backup rules exclude encrypted credentials because their Keystore keys cannot migrate between devices.

Do not uninstall an existing app to test an update. A debug-signed Android app cannot update a release-signed installation. Use the original release signing key for upgrade testing; use another device/emulator for debug builds.

## Commands

On Windows, first run `. .\scripts\use-d-drive.ps1` in each terminal. All caches and downloads stay on D:. If using the SDK already configured in `android/local.properties`, retain its D: location; local.properties is not committed.

- `npm ci`
- `npm start`
- `npm run android`
- On macOS: `bundle install`, `bundle exec pod install --project-directory=ios`, then `npm run ios`.
- `npm run check` for app/server types and regression tests.
- `npm run bundle:native` for release JavaScript bundles/assets under `artifacts/bundles`.
- `python -m unittest discover -s scripts/tests -p 'test_*.py'` for the IPA verifier.

Public bundle configuration now uses `APP_PUBLIC_API_URL` and `APP_PUBLIC_SHARE_URL`. See `.env.example`. Restart Metro after changing those values. Signing and server secrets are never embedded in the bundle.

The existing Android and iOS release workflows build the checked-in native projects. EAS and prebuild are no longer involved. macOS/Xcode is still required to compile iOS, locally or on the GitHub macOS runner.

## Earlier migration validation on 22 September 2026

This section records the migration baseline before the v3 feature implementation. The current release supersedes its voice counts, preview dependencies and build status; see [1.2.0 release validation](RELEASE-1.2.0.md).

- App and server TypeScript checks passed.
- All 59 app/regression tests, 2 public-configuration tests and 7 IPA-verifier tests passed.
- Android and iOS production JavaScript bundles were generated. Each contains all 342 original voice clips with matching SHA-256 hashes.
- Community CLI autolinking finds CircleDevice on both platforms; the dependency lockfile contains no Expo, React DOM or React Native Web packages.
- Android app and CircleDevice Kotlin/Java compilation passed against React Native 0.86.3, including manifest/resource processing and native dependency compilation.
- iOS plist, launch-screen and URL-scheme checks passed. An Xcode archive and physical-device upgrade/audio checks have not been run for this migration.

No new APK or IPA has been published. D: has less than 2 GiB free after dependency compilation, so a full Android package build is deferred. GitHub's latest iOS build was rejected before starting because of account billing/spending limits ([run 35681787793](https://github.com/ppegu/trust-tambola/actions/runs/35681787793)); this Windows host cannot compile iOS. The updated native workflows are ready for a build once those environment limits are resolved.

## Device acceptance checks

Before distributing a migrated binary, install an update using the original signing identity and confirm:

1. Existing offline history/preferences, account credentials, device UUID and saved table survive a cold restart.
2. Female calls repeat whole numbers, including replay, cancel and background/foreground; no late audio callback advances a cancelled call.
3. iPhone silent-mode playback and hardware volume between calls work; Android music-volume routing and immersive UI restore on leaving the game.
4. Android phone-number selection handles selection, dismissal and unavailable services; iPhone manual entry still works.
5. Both custom invite schemes open the existing app or cold-launch it; clipboard copy and sharing work.
6. Native branding, safe areas, rotation lock, full house review and reconnect behave as before.

JavaScript checks and successful bundle generation cannot substitute for these physical-device checks or an Xcode archive.
