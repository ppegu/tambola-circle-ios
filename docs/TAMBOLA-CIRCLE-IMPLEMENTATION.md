# Tambola Circle implementation

Implemented on 21 September 2026. The [Android 1.1.0 preview](https://github.com/ppegu/trust-tambola/releases/tag/v1.1.0) and [unsigned iOS 1.1.0 preview](https://github.com/ppegu/trust-tambola/releases/tag/ios-v1.1.0) are built, verified and published. The production Worker, D1 migration and SQLite Durable Object infrastructure were deployed and checked on 22 September 2026.

## Feature map

| Approved behavior                         | Implementation                                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Home online entry, private/public choice  | New home and online entry screens; public is disabled                                                           |
| Table code and share link                 | Unique six-digit code, revocable link, deep-link landing page and native Share                                  |
| Device-selected registration              | Android Phone Number Hint native module; name/phone stored in D1; device credential in SecureStore              |
| No typed number, SMS OTP or recovery code | New UI has none; unsupported platforms retain offline mode                                                      |
| Half / Full                               | Server-generated 3 / 6 panels; full strip contains 1–90 once; each panel is 3×9 with 15 numbers                 |
| Two-minute ready timer                    | Configurable 30–600 seconds, personal immutable deadline, expired players watch                                 |
| All-ready start                           | At least two eligible players; all explicitly select and click Ready                                            |
| Lobby ticket privacy                      | Own tickets behind My tickets; others visible when ready; history also hides other draft strips                 |
| Immersive live screen                     | Android system bars hidden; central current call, left calls, right players, tall scrolling tickets             |
| Marking and winner claim                  | Tap circles only, versioned marks, per-panel Win; no drawing toolbar                                            |
| Claim and challenge reviews               | Frozen evidence, paused calls, explicit/timeout votes, selected proof cells visible to everyone                 |
| Final dispute decision                    | Effective host decides; same bounded timer; no response ends without a winner                                   |
| False declaration                         | Claimant becomes spectator for this round; next round restores eligibility                                      |
| Hosting                                   | Permanent transfer, co-host takeover after presence expiry, explicit owner reclaim, stale-authority rejection   |
| Rejoin/history                            | Durable state/event log, ongoing table directory, archived attempts/rounds, tickets and frozen proof inspection |
| Real-time peers                           | Server-mediated WebSocket fan-out; no direct peer mesh or client-owned caller                                   |

## Server contract

One SQLite Durable Object owns each table. Commands are checked against the current round and roles, then state, accepted events and command IDs commit together before acknowledgment. Retried mark commands reuse their ID and cannot toggle twice. Cell versions reject stale writes. The server alone generates ticket strips and calls.

Every operation resolves due deadlines first. Alarms schedule the next call, ready expiry, claim/proof/host deadline, host takeover and archive retry. Calls never catch up in a rapid burst after downtime. Claim and proof reviews default to 120 seconds; unanswered reviews approve. Host-decision expiry ends the round without a winner. Settings apply to the next round rather than changing a running clock.

The table supports 12 playing seats and up to 24 non-removed members. A late join watches the current round. Current host/owner cannot be kicked; kicks wait until the current review is resolved. An involved host may still make the final decision under the friend-table trust model; an independent appointed co-host may also decide if the host is involved. All outcomes identify the decision actor.

D1 holds device profiles, table/membership indexes, single-use socket tickets and the history projection. A failed archive write leaves its durable SQLite outbox pending for retry. Event sequence keys and snapshot sequence checks prevent duplicate/archive regression. Abandoned ready windows are saved as attempts as well as completed rounds. No short game-history expiry is configured.

Android WebSockets send the server's origin by default. The Worker accepts that origin for authenticated upgrades, while rejecting unrelated browser origins. One-use 60-second socket tickets avoid placing the long-lived device secret in socket URLs. Both membership and role checks remain server-side.

## Calling, layout and hardware volume

Male audio changes from John to pinned Piper Joe. Both packs use 30 reusable word recordings with exact digit/full-phrase gaps, fixed synthesis settings, normalized level and fades. All 342 clips carry checksums and word boundaries. The regression suite compares repeated words byte-for-byte and checks actual silent PCM between them. A local speech-recognition audit covers the complete vocabulary and the reported 6/86 transitions without recognizing the former male filler.

Offline calling uses a fixed-height layout, with only the explicitly opened history overlay scrollable. It was visually checked at 320×480 and 320×568. Online strips, peer tickets and claim/proof tickets retain their vertical scroll space. Online call intervals are 6–30 seconds (default 8): six seconds allows the longest bundled announcement with a two-second personal pause plus 500 ms headroom.

Expo audio players keep the audio session active when a clip ends. A serialized foreground game-session controller activates iOS playback/silent-switch support and releases it when leaving/backgrounding. Android's native bridge sets the music volume stream while playing. Settings previews release the audio session after finishing. Physical volume-button behavior still requires validation on actual iPhone/Android hardware.

## Build and validation record

The final command results are recorded below after verification. The local database is isolated under `server/.wrangler/circle-integration`; all integration players are synthetic.

- App/server TypeScript and unit/regression suite: passed, 48 tests across seven files.
- Real local multiplayer integration: passed, 131 API checks plus WebSocket state/mark assertions, including abandoned ready-window history and native-Origin upgrades.
- Read-only inspection of the integration D1 database confirmed all 53 sequential events and three archived attempts/rounds for the final test table, matching its final sequence and state.
- Preserved v1 API regression: 30 checks passed.
- Worker deployment dry run: passed; no upload/deployment performed.
- Web production bundle: passed. Browser checks confirmed fixed offline layout, Play/Pause/navigation, and the unsupported SIM fallback without a phone text field.
- Native Android/iOS JavaScript/Hermes exports: both passed using one worker and one platform per run. These exports do not compile the native bridge.
- IPA package-verifier fixture suite: seven tests passed. This checks the verifier, not a newly built IPA.
- Native Android compilation: passed in [GitHub Actions run 35624496020](https://github.com/ppegu/trust-tambola/actions/runs/35624496020), from source commit `8db180443a89d1f09a9513cb9e5ce2bc495f5cb3`. APK 1.1.0 / version code 3 uses the same signing certificate as 1.0.1. The native bridge, standalone JavaScript, permissions and all 342 voice hashes were verified in CI and the downloaded package was rechecked locally.
- Native iOS compilation: passed in [GitHub Actions run 35675053472](https://github.com/ppegu/trust-tambola/actions/runs/35675053472), from source commit `f5d81fcb05f37f607c0be225a3386da3ea67dfe8`. Xcode compiled CircleDevice and archived an arm64 Release app for iOS 16.4+. The downloaded unsigned IPA independently passed the package verifier, including all 342 voice hashes. Its SHA-256 is `d7c1b7fd774344a450441e83450ce035b49002907cdadb821e79708f24e815a2`.
- Production backend: deployed Worker version `d0a7ae49-7108-4cf8-828b-2cfcc0138091` with `TABLES` / `TableRoom` and migration `0004_online_tables.sql`; no migrations remain pending. Existing authentication secret and API address were preserved. A D1 recovery bookmark and the previous Worker version were recorded before deployment.
- Live HTTPS/WebSocket checks passed for authentication, code/invite joining, tickets, ready start, server calls, marks, duplicate-command handling, review pause/approval, history privacy and rejoin. D1 inspection confirmed all 18 sequential events and the final round snapshot. Both synthetic players left afterward. The smoke harness's assumption that LEAVE returned a snapshot was corrected during cleanup; no application change was required.
- Physical-device SIM availability and hardware-volume-button behavior still require testing. iOS SIM-only registration remains unsupported as designed.

Disk exhaustion interrupted two local integration reruns and local SDK setup; memory/resource pressure also interrupted combined native exports. Sequential exports and successful GitHub Android/iOS builds supersede those interrupted attempts. Physical-device validation remains outstanding.

The follow-up cleared about 1.26 GiB of npm, pip and Gradle caches from C:. Windows user cache/temporary settings now point to `D:\BuildCache`; `scripts/use-d-drive.ps1` applies the same settings to current shells. Signing keys and unrelated app data were preserved. The APK and its reports are saved under `D:\OnlineTam\artifacts\release-1.1.0`. Its SHA-256 is `2bacba10e9bd945e48593f7c1cc9211dff5c85db897654e8870f29e515a7a2fe`, matching the published GitHub asset.

## Release steps

1. Verify the existing production D1 identifier in `server/wrangler.jsonc`, then apply the new migration using `npm run db:remote --workspace server`.
2. Deploy the Worker using `npm run api:deploy`. The `v1-tables` migration provisions SQLite `TableRoom` objects through the `TABLES` binding. Existing v1 accounts/preferences remain compatible.
3. Build new Android/iOS binaries with `EXPO_PUBLIC_API_URL` set to the HTTPS Worker URL. Native module autolinking uses `modules/circle-device`; Expo Go cannot load it. Existing package/bundle identifiers and saved offline keys remain unchanged.
4. On devices, exercise Android single/dual-SIM availability and cancellation, iOS unsupported sign-in, invite resume, physical volume between calls, background/foreground recovery, immersive navigation, and a three-player claim/proof/co-host round.

Both mobile previews are available from the private GitHub repository; sign-in is required. The backend is live at the existing API address, so the published Android APK needs no replacement for online service access. The iOS IPA is unsigned and needs Sideloadly signing; iOS online registration remains unavailable under the SIM-only design. The design documents are the approved baseline; this record describes what was implemented and what was actually verified.
