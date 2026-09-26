# Tambola Circle

Tambola for friends and family, with a fixed-screen offline caller and private online tables. Version 1.5.0 includes native screen stacks, the revised caller/lobby, wallet history and English, Assamese and Hindi UI. Browse the [v4 design gallery](design-v4/index.html), [current design guide](design-v4/DESIGN_GUIDE.md), and [release validation](docs/RELEASE-1.5.0.md).

[Download the latest Android release](https://tambola-circle.ffegu0617.workers.dev/download/android) · Signed with the original key so existing users can update in place.

## Play modes

- **Offline caller:** approved purple/gold caller, light 90-number board without page scrolling, direct 4/5/7-second speeds, volume slider and native pause menu. Home/restart resets the round.
- **Private tables:** invite by six-digit code or link, choose Half (3 panels) or Full (6 panels), confirm and get ready. No selection timeout. The host starts manually unless an optional countdown is set.
- **Live play:** tap numbers to mark colored circles with optional stars and haptics. No auto-mark. Expand the number board/history or ranked players; tickets and marks sync through the server.
- **Full house:** calls pause for a bounded three-second server check against the frozen call history. Invalid claims show missing values and resume the game. No manual voting or dispute pipeline.
- **Coins:** Half/Full entry fees set by the host. Ready reserves funds, start consumes them, unready releases them, host cancellation refunds them. Wallet balances, transactions and free test packs come from the backend. No real payments or cash-out.
- **Continuity:** saved table/round/event history, reconnect, host transfer, temporary co-host takeover and owner reclaim.

Voice chat, real purchases and advertisements remain TODO. Coming-later visuals are retained; no microphone or ad SDK is enabled.

## Device sign-in

Android uses Google's native Phone Number Hint picker through the local `CircleDevice` module. The selected number has a Change action. Registration collects a name and avatar and links to Terms and Privacy Policy beside the continue action.

This selects an available device number; it does **not** verify ownership. The server authenticates a random device credential stored in native Keychain/Keystore storage, never the phone number itself. There is no SMS OTP or recovery-code flow in the new interface. A table code is an invitation code, not a login OTP.

iOS uses a manually entered international mobile number for now, labelled unverified. Android keeps its native number picker; unavailable Android selection retains the unsupported state. On native app launch/foreground, the app saves a protected app UUID and records basic device metadata locally and in D1. Registration later links that device row to the player account. A UUID or matching phone number alone cannot access an account. Read [device feasibility](docs/tambola-circle-design-v2/PHONE_FEASIBILITY.md) and [data handling](docs/DATA-HANDLING.md).

## Run locally

This is a **React Native 0.86 app for iOS and Android only**, using the Community CLI, Hermes and the New Architecture. Android and iOS projects are checked in. Expo, EAS and Expo Go are removed. A development-only React Native Web rendering harness previews the actual screen components; it is not a playable web release.

Requires Node.js 22.13+ and npm. Android uses Java 21, Android SDK 36 and NDK 27.1.12297006. iOS requires macOS, Xcode and CocoaPods.

On Windows, run this before every development/build command:

```powershell
. .\scripts\use-d-drive.ps1
npm ci
npm start
# In another terminal, source the same script first:
npm run android
```

On macOS:

```sh
npm ci
bundle install
bundle exec pod install --project-directory=ios
npm start
# In another terminal:
npm run ios
```

Copy `.env.example` to `.env`; set `APP_PUBLIC_API_URL` to your HTTPS API, or leave it empty for offline-only operation. Use `http://10.0.2.2:8787` for a local API on an Android emulator; a physical phone needs the computer's reachable LAN address. Release API calls require HTTPS. Restart Metro after changing environment files. Only `APP_PUBLIC_API_URL` and `APP_PUBLIC_SHARE_URL` are embedded by Babel; Worker secrets must stay in the server environment.

For a local backend, copy `server/.dev.vars.example` to `server/.dev.vars`, then run `npm run api:migrate` and `npm run api:dev`. The v1 preference/account service still requires `AUTH_SECRET`. Apply migrations through `0011_release_identity.sql`. Set `TEST_COIN_PURCHASES=true` only while free test purchases are intended. [Dynamic coin catalog and payment TODOs](docs/COIN-CATALOG.md).

The SIM picker and other native capabilities require rebuilding after native code changes. The release package/bundle ID stays `com.ppegu.tambola`; install updates with the original signing key/team to retain saved app data. Android debug builds use `com.ppegu.tambola.dev` and the label “Tambola Circle Dev” so Metro tests do not replace the installed release. `scripts/build-debug-apk.ps1` builds that app on D:. Use `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:8791 tcp:8791` for Metro and an isolated local backend. See [migration details and device checks](docs/REACT-NATIVE-MIGRATION.md).

## Voice and volume

Both modes use female caller packs, with all 90 Aria calls and four other preview clips bundled for offline playback. Two-digit calls use digits, a half-second gap and then the full number. Additional packs download through verified voice storage. UI language selection does not change the spoken language. [Voice provenance and regeneration](docs/VOICES.md).

A failed native player is recreated once. The foreground iOS audio session keeps a silent media buffer between calls so hardware volume can continue controlling media; Android routes volume to music during gameplay. Backgrounding/leaving releases playback. Physical-device volume and long-session testing remain required.

Online calls support 3–10 seconds (default 5). Offline automatic calling waits for completion. The approved offline speed controls remain unchanged.

## Tests

```sh
npm run check
npm run test:api                       # Local API on port 8787
npm run build --workspace server       # Worker dry run, no deployment
npm run bundle:native                 # Android + iOS bundles and voice hashes
```

For isolated multiplayer integration testing:

```sh
cd server
npx wrangler d1 migrations apply DB --local --persist-to .wrangler/circle-integration
npx wrangler dev --ip 127.0.0.1 --port 8791 --persist-to .wrangler/circle-integration
# In another terminal at the repository root:
npm run test:online
node scripts/test-api.mjs --port=8791
```

The scripts use localhost and synthetic players only. The online suite exercises real WebSockets, D1, Durable Objects, deadlines, frozen claims/proof, roles, reconnects, and history.

## Deployment and builds

Apply migrations through `0005_device_records.sql` before deploying the new Worker. The checked-in Wrangler configuration adds the `TABLES` binding and its SQLite Durable Object migration. Then rebuild native apps with the HTTPS Worker URL. See [implementation notes](docs/TAMBOLA-CIRCLE-IMPLEMENTATION.md).

The existing [Android release guide](docs/ANDROID-RELEASE.md) and [iOS/Sideloadly guide](docs/IOS-SIDELOAD.md) still apply to signing/build distribution. Existing [GitHub releases](https://github.com/ppegu/trust-tambola/releases) are earlier versions until a new release is published.

## Code map

| Location                                     | Purpose                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `App.tsx`, `src/components/`                 | Home, fixed offline caller, settings                                                                      |
| `src/online/`                                | Device registration, lobby, live tickets, reviews, host controls, history                                 |
| `shared/tickets.ts`, `shared/online.ts`      | Ticket generator and shared protocol/types                                                                |
| `server/src/room-engine.ts`                  | Tested round state machine and deadlines                                                                  |
| `server/src/table-room.ts`                   | Durable SQLite transactions, WebSockets, alarms, D1 archive                                               |
| `server/src/online-api.ts`                   | Device auth, table APIs, invites, one-use socket tickets                                                  |
| `modules/circle-device/`                     | Native audio, secure storage, crypto, clipboard, device details, Android number picker and immersive mode |
| `src/gameAudioSession.ts`, `src/useVoice.ts` | Foreground audio ownership and number announcements                                                       |
| `scripts/voice-models.json`                  | Pinned voice model sources and checksums                                                                  |

Cloudflare service names, compatibility URLs and deployment instructions: [Cloudflare migration](docs/CLOUDFLARE-MIGRATION.md).
