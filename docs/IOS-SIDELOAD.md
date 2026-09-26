# Tambola Circle — unsigned iOS IPA

GitHub Actions builds an **arm64 iPhone/iPad Release IPA** when a `v*` GitHub release is published. Main/branch pushes, pull requests and bare tag pushes do not start builds. A manual build can run from an existing version tag using `gh workflow run ios-ipa.yml --ref <version-tag>`; dispatches on branches are skipped before allocating a runner. The tag must contain this workflow policy. Release-triggered builds attach the IPA to that same release; manual builds produce an artifact without publishing. The app includes its JavaScript and all 90 Aria calls, so a development server is not needed. Neerja, Ava, Emma and Sonia can be downloaded in Caller voices and retained for offline use.

## Download

A release with `<!-- native-build:local -->` in its notes skips automatic native builds. This is used when publishing an already verified local Android APK without requesting an iOS build. A deliberate manual version-tag build remains available.

1. Sign in to GitHub with access to [ppegu/trust-tambola](https://github.com/ppegu/trust-tambola).
2. Open [Releases](https://github.com/ppegu/trust-tambola/releases) and select the desired version. Download the `.ipa` asset after its build completes. Earlier iOS previews/main builds retain their original names.
3. Alternatively, open the successful [Build unsigned iOS IPA workflow](https://github.com/ppegu/trust-tambola/actions/workflows/ios-ipa.yml) run and download `tambola-circle-ios-unsigned` under **Artifacts**. Extract the ZIP to get the IPA. Actions artifacts last 30 days; release assets remain until removed.

`ios-SHA256SUMS.txt` in the release (or `SHA256SUMS.txt` in the workflow artifact) contains the IPA checksum. `ipa-info.json` records the version, minimum iOS version, source commit, platform, and verified bundled voice files. The IPA itself is unsigned and cannot be installed directly by tapping it on an iPhone.

## Install with Sideloadly

1. Download [Sideloadly for Windows or macOS](https://sideloadly.io/) from its official site and follow its platform prerequisites. On Windows, Sideloadly currently specifies Apple's web versions of iTunes and iCloud.
2. Connect your iPhone or iPad using USB, unlock it, and trust the computer when prompted.
3. Open Sideloadly, select the device, drag in the extracted `.ipa`, and enter your Apple ID in Sideloadly. Click **Start** and complete Apple's authentication prompts there. GitHub Actions never receives these credentials.
4. Follow iOS prompts to trust the developer under **Settings → General → VPN & Device Management**. Enable **Developer Mode** under **Settings → Privacy & Security** when required, then restart/confirm as directed by iOS.
5. Open **Tambola Circle**. For an update, use the same Apple ID and bundle-ID settings and install over the existing app to preserve local data.

According to the [Sideloadly FAQ](https://sideloadly.io/faq), free Apple-account signing normally lasts seven days and needs refreshing. Sideloadly supports automatic refresh. Device installation and physical-device audio testing require your phone and are not performed by CI.

## CI and verification

The workflow is `.github/workflows/ios-ipa.yml`. It uses `macos-26`, Xcode 26.6, Node 22.22.2, the checked-in React Native Xcode project, CocoaPods, and `xcodebuild archive` with signing disabled. It uses the existing public HTTPS API URL for optional preference sync. Certificates, provisioning profiles, Apple passwords, and EAS credentials are not required.

CI runs app/server type checks, app tests, IPA-verifier tests and hash checks of all 360 downloadable production calls. The final package is checked for the display name in `app.json`, expected bundle ID/version, arm64 **device** executable, preserved executable permission, bundled JavaScript, and the exact hashes of all 90 Aria calls. Permission-prompt descriptions, background capabilities, a provisioning profile, or a signed main app cause verification to fail. SHA-256 is checked again before attaching the IPA to the requested versioned release. CI no longer creates automatic `ios-main-*` prereleases. Existing assets are not overwritten on a rerun.

To reproduce on a Mac with Xcode 26.6 and CocoaPods:

```sh
npm ci --include=dev
export APP_PUBLIC_API_URL=https://tambola-circle.ffegu0617.workers.dev
export DEVELOPER_DIR=/Applications/Xcode_26.6.app/Contents/Developer
export NODE_ENV=production
bundle install
bundle exec pod install --project-directory=ios
bash scripts/build-ios-unsigned.sh
```

Outputs are in `artifacts/ios/`; diagnostic logs are in `artifacts/ios-logs/`. Native projects are checked in; Pods and binary outputs are ignored by Git. The existing `com.ppegu.tambola` identifier is retained for compatibility; the displayed app name is Tambola Circle. The IPA filename uses the version in `app.json`.

From version 1.1.2, iPhone registration accepts a manually entered international mobile number. It is labelled unverified and requires no SMS OTP. A device record is created on app launch and linked to the account at registration; the saved device credential remains the login key. No recovery-code flow is added. See [the implementation record](TAMBOLA-CIRCLE-IMPLEMENTATION.md) for verification status and deployment steps.

References: [React Native native builds](https://reactnative.dev/docs/0.86/getting-started-without-a-framework), [Apple xcodebuild](https://developer.apple.com/library/archive/technotes/tn2339/_index.html), [GitHub macOS runner tools](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md).
