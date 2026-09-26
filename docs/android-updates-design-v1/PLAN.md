# Android updates and remote access controls

Design proposal, 23 September 2026. This pass contains research, implementation planning and workflow images. Application code, production policy, hosting subscriptions and deployments have not changed.

## Recommendation

Add an Android update/access controller above every app screen. Extend the existing open/resume device check to retrieve an authenticated remote decision. Offer optional updates through a dismissible banner; require mandatory updates through a full app gate with a permanent banner. Download only after the user taps, verify the APK, then hand installation to Android. Keep the gate until the installed version and current access decision allow entry.

Use the existing Cloudflare Worker and D1 for release policy and device restrictions, R2 Standard for signed APKs, and a small public web surface for download, release and installation-help pages. Ship the client capability first, backed by a versioned contract and fixtures; add the minimal remote policy service before activating controls. A graphical admin panel can follow later.

Treat “app lock” here as a remotely controlled access gate. A personal PIN or biometric lock is a separate feature.

## What exists today

| Evidence                                                                                                                       | Finding and consequence                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [package.json](../../package.json), [app.json](../../app.json)                                                                 | React Native 0.86.3 with a local Kotlin bridge; app 1.3.0, Android build 8, package `com.ppegu.tambola`. Compare native integer build codes, not version strings.               |
| [App.tsx:41](../../App.tsx#L41)                                                                                                | `TambolaApp` starts device recording and owns home, offline caller, online screens and deep links. The access gate must sit above all of them.                                  |
| [deviceRegistration.ts:13](../../src/online/deviceRegistration.ts#L13)                                                         | `recordDeviceOpen` sends identity and device/build information to `/v2/devices/open`, deduplicating in-flight work.                                                             |
| [deviceRegistration.ts:41](../../src/online/deviceRegistration.ts#L41)                                                         | Checks already run at startup and `AppState` active transitions, with a 30-second retry after failure. Reuse this lifecycle rather than adding a competing request loop.        |
| [storage.ts:27](../../src/online/storage.ts#L27)                                                                               | A random device UUID and secret device credential already exist. Do not regenerate them during an upgrade.                                                                      |
| [CircleDeviceModule.kt:63](../../modules/circle-device/android/src/main/java/com/ppegu/circledevice/CircleDeviceModule.kt#L63) | Native metadata includes package ID, installed version/build and Android scoped ID.                                                                                             |
| [device-records.ts:14](../../server/src/device-records.ts#L14)                                                                 | D1 device records bind UUID to a hash of the device credential and optionally to a player. This is a useful foundation, but is not a ban system.                                |
| [online-api.ts:32](../../server/src/online-api.ts#L32)                                                                         | Current online authentication identifies a registered player by credential hash. Add access policy here and on registration, ticket redemption and other paths that precede it. |
| [table-room.ts:184](../../server/src/table-room.ts#L184)                                                                       | Existing WebSockets have a 12-hour attachment expiry. A new block must also revoke active sockets; changing only HTTP authentication would leave a gap.                         |
| [server/wrangler.jsonc](../../server/wrangler.jsonc), [voice-packs/wrangler.jsonc](../../voice-packs/wrangler.jsonc)           | Cloudflare Worker, D1, SQLite Durable Objects and a separate static voice service exist. No R2 binding is configured in these files.                                            |
| [online-api.ts:39](../../server/src/online-api.ts#L39)                                                                         | There is a small web invite page. This workspace does not yet contain the requested APK download portal or release policy/admin feature.                                        |
| [android/app/build.gradle](../../android/app/build.gradle), [APK workflow](../../.github/workflows/android-apk.yml)            | Release builds require the existing key; CI verifies the APK signature, manifest and hashes and uploads artifacts. Extend this pipeline for publication.                        |

Atlas supplied the cited application/device/authentication context. Some broad queries returned generated declarations or no useful configuration results; scoped symbol queries and targeted local configuration searches filled those gaps. The review is source-based, not a claim about production billing or all remotely deployed resources.

The existing local `artifacts/tambola-circle-1.3.0.apk` is 86,013,021 bytes: about 86 MB / 82 MiB. The design images use **illustrative** version 1.4.0 and 48 MB; production must display verified release metadata. [Release 1.3.0 notes](../RELEASE-1.3.0.md) also record earlier GitHub Actions billing failures; recheck CI availability before relying on it. A signed local D: build remains an existing fallback.

## Feasibility and boundaries

- Website-hosted APK distribution is supported. On Android 8+, users permit installation from the specific source; the browser and Tambola Circle are different installation sources. [Android alternative distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution)
- Implement an explicit user-approved install flow. Android owns its installer and can require permission, confirmation or device-policy checks. Our gate can prevent app use; it cannot force a person to install, prevent them leaving the app, or silently grant installation permission. [PackageInstaller](https://developer.android.com/reference/android/content/pm/PackageInstaller)
- Retain the package ID and existing signing identity, and increase `versionCode` for every public release. Android checks update compatibility. A mismatched signature is not fixed by instructing users to uninstall: that risks their saved data. [Android update requirements](https://developer.android.com/google/play/app-updates)
- Existing build 8 has no remote offline access gate. It cannot be retrofitted while disconnected. The first new build is the bridge release; online API restrictions can be introduced separately with a legacy-client migration period.
- A disconnected device cannot receive a new ban immediately. A finite access lease bounds normal-client offline use. Modified/rooted clients can bypass local code; backend enforcement is the authoritative boundary for online services.
- As of this review, Google's verification page lists 30 September 2026 regional enforcement for participating stores, and broader certified-device expansion in 2027. Plan developer/package registration for direct distribution and recheck applicable rollout details before public launch; no Play Store listing is required for the outside-Play path. [Android developer verification](https://developer.android.com/developer-verification)

## Cloudflare hosting and cost

| Component                      | Proposed use                                     | Current published free allowance / limit                                                                                                                        |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2 Standard                    | Immutable, verified APK objects                  | 10 GB-month, 1M Class A and 10M Class B operations monthly; internet egress is free. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)                |
| Workers Free                   | Device access decisions and small dynamic routes | 100,000 requests/day, 10 ms CPU per invocation. Shared account workload matters. [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| D1 Free                        | Releases, policy, blocks and audit records       | 5M rows read/day, 100,000 rows written/day, 5 GB total storage. Index writes also count. [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)   |
| Pages or Workers static assets | Download/help UI and small public metadata       | Pages has a 25 MiB individual asset limit, so it cannot hold our current APK. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)          |

Illustrative sizing from the actual current APK: ten retained builds use about 0.86 GB; 10,000 complete downloads transfer roughly 860 GB. R2 egress charges would be zero, while storage and operations remain metered. Range requests/retries add operations. Existing voice, API, database and game-room traffic must be included in the overall account estimate.

At 1,000 daily users opening four times, policy checks would total roughly 4,000/day before retries and gameplay traffic. Merge the check into the existing device-open request. Index policy/device lookups and throttle `last_seen` writes instead of writing every refresh. Track actual D1 `rows_read` / `rows_written`; user count alone cannot predict the free-tier ceiling. No new Durable Object is necessary for release metadata; existing table objects need revocation support.

Use an R2 custom domain when an owned domain is available, with appropriate APK caching rules. Cloudflare's `r2.dev` endpoint is intended for development and is rate limited. Without a custom domain, a Worker can stream from a private R2 bucket, at the cost of Worker requests; implement streaming and range handling without buffering whole APKs. [R2 public access](https://developers.cloudflare.com/r2/buckets/public-buckets/)

**Zero cost is plausible for the initial workload, but is not verified for this account or guaranteed indefinitely.** R2 requires enabling a subscription through checkout and charges for usage above its allowance. Budget alerts notify; they are not a hard spending cap. Before activation, inspect current Workers/R2 subscriptions and all relevant usage, retain a small build history, set usage and budget alerts, and decide how to handle exhausted free quotas. Do not automatically upgrade plans. [R2 setup](https://developers.cloudflare.com/r2/get-started/), [budget alerts](https://developers.cloudflare.com/billing/manage/budget-alerts/)

## User experience and decision rules

| Decision                                          | UI and permitted actions                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Allowed / up to date                              | Normal app. Background check adds no modal. Settings includes “Check for updates”.                                                                               |
| Optional update                                   | Compact dismissible banner; detail page and manual download. Dismissal is keyed to release ID and resets for a new release. Never suppress a mandatory decision. |
| Mandatory update                                  | Permanent banner plus full update gate. Download, pause/resume/retry, install, release notes and help remain available. No close, Later or path into gameplay.   |
| Deprecated / archived / revoked installed release | Deny use from the effective time. Show replacement update when compatible; otherwise show an unsupported-version/device explanation and support.                 |
| Device or account blocked                         | “Access restricted”, neutral explanation, opaque support reference, Copy, Get help and Check again. Updating the APK does not remove the block.                  |
| Android app-wide lock                             | Maintenance/access gate with remote safe message, Retry and Help. The platform scope keeps iOS outside this phase.                                               |
| Allowed lease expired and server unavailable      | “Connect to continue”, Retry and Help. Preserve saved games and credentials.                                                                                     |

Precedence: **device/account block → app-wide lock → release denial → required update → optional update → allow**. Downloads and support stay reachable where useful, even when gameplay is denied. Removing one restriction does not override another.

“Archive & disable” explicitly disables that release, matching the requested behavior. Keep artifact retention separate: retiring a release does not silently delete its history or saved user data. Deprecation can be scheduled, but when it takes effect it denies use; warnings before the deadline are optional-update notices. Avoid an ambiguous archive button that merely hides a release in a list.

Mandatory publication should normally target the latest compatible stable build. A release marked mandatory raises the required floor to that build for its cohort. An explicit denied-build list also handles a defective intermediate version; a single minimum version does not cover every revocation case. For emergency mandatory releases, bypass percentage rollout. Never direct a user to an APK that cannot install on their Android version/ABI.

### Opening, resuming and playing

1. Load persisted restriction/lease state before mounting interactive home, caller or online screens. Preserve deep links until access is allowed.
2. On each cold start and real background-to-active transition, asynchronously request policy using native installed build information. Coalesce duplicate in-flight events. This is background network work while opening the app, not continuous work while it is closed.
3. A valid previous allow lease can show the app immediately while checking. First installation without a lease, an expired lease, or a persisted restriction starts at the appropriate checking/gate screen.
4. Replace the current state atomically only with a valid newer response for the same identity/build. Ignore stale responses from an earlier resume or pre-install request.
5. An optional offer during an active round can be surfaced in a reserved banner area or after the round. A mandatory/block decision gates immediately, stops local calling/audio/actions, and preserves the recoverable game state. Never silently discard a local round or debit coins as a consequence of gating.
6. Use online responses/socket control events for restrictions during an active session; add a low-frequency foreground refresh (proposed five minutes) for local-only sessions. Stop that refresh in the background. Server checks still protect online requests.
7. Re-read the native installed build after returning from permission/installer UI and on next launch. Download completion or opening the installer is not installation success. If the build did not change, remain gated.

### Offline proposal pending preference

Default proposal: a **24-hour lease from the last successful allow decision**, configurable remotely within a client maximum. Once expired, connection is required before app use. A known mandatory update or block remains enforced offline until a fresh policy permits access; timeout, HTTP 500, malformed JSON and missing fields never mean “allow”.

Anchor lease timing to server time and elapsed monotonic time, persist a last-seen time watermark, and require revalidation on ambiguous clock rollback/reboot cases. A signed lease prevents ordinary cache tampering; it is not a defense against a patched binary. Show network failure separately from a ban. The offline default is a material change for the existing offline caller and should be finalized during design review.

## APK download and installation

Use a dedicated Kotlin update module exposed to React Native, keeping installer/download work separate from voice downloads. The module reads native version information, manages one persistent download, reports progress and opens Android's permission/installer UI. Existing `CircleDevice` metadata and secure storage can be reused.

1. Retrieve a validated release descriptor over HTTPS with release ID, package ID, integer build code, version name, min SDK/ABI support, immutable URL, byte size, SHA-256, expected signing identity and release notes.
2. Only start the file transfer after a tap. Save under a dedicated app-private update directory. Check free space for both transfer and installation; let Android report final installation-space requirements.
3. Support retry and persisted partial downloads, with HTTP Range/ETag checks. A changed ETag or descriptor restarts safely. Show paused/network-error/storage-error states without dismissing a mandatory gate. Background transfer, if supported, uses Android's user-visible download facilities and notification requirements; no hidden periodic APK fetches.
4. Enforce a size ceiling, verify exact size and SHA-256 before offering install, validate package/build/signing identity, reject untrusted redirects or hosts, and let Android perform its package signature/install validation. A hash retrieved from the same compromised source is not an independent trust anchor; use a signed release descriptor with a bundled trusted public key and a key-rotation plan.
5. Check install-source permission. For Android 8+, open the package-specific unknown-apps permission screen only when needed, then resume on return. Android 7 requires its platform-appropriate settings/help path. Restricted devices get an explanatory recovery screen; never suggest disabling Play Protect.
6. Use `PackageInstaller` with user confirmation (or a tightly scoped `FileProvider` content URI if the implementation chooses the intent flow). Do not expose arbitrary file paths. Handle cancellation and all installer outcomes; a mandatory gate remains after cancellation.
7. After the app restarts, read the actual native build and request current policy. Show success only when both build and access pass. Clean up only updater-owned completed/stale files with bounded retention; retain credentials, saved games and voices.

These are the proposed implementation responsibilities, not a promise that every OEM's permission/installer screen looks like the image. See [PackageInstaller](https://developer.android.com/reference/android/content/pm/PackageInstaller) and [user-action options](https://developer.android.com/reference/android/content/pm/PackageInstaller.SessionParams).

## Remote contract and persistence

Prefer adding a capability/versioned `access` object to the existing `/v2/devices/open` response. Old clients may ignore additive fields during the migration window. A separate `/v2/app/access` read can be added if device telemetry writes cannot be kept cheap; there should still be one app controller, not two lifecycle pollers.

The request supplies schema/capability version, stored device UUID, native package ID/platform/build, and scoped device metadata, authenticated by the existing secret credential. A UUID alone is never authorization. Record that build metadata is client-reported; do not treat it as cryptographic attestation.

Suggested response shape (contract illustration, not deployed values):

```ts
type AccessDecision = {
  schemaVersion: 1;
  policyRevision: number;
  serverTime: string;
  decision:
    | "allow"
    | "optional_update"
    | "required_update"
    | "release_blocked"
    | "device_blocked"
    | "app_locked";
  reasonCode: string;
  publicMessage: string;
  supportReference?: string;
  retryAfterSeconds?: number;
  release?: ReleaseDescriptor;
  signedAllowLease?: string; // device/build-bound; fixed expiry
};
```

The server derives decisions, required floor, compatibility and rollout cohort. Validate with a shared schema before using it. Bind leases to identity, platform, package, installed build and policy revision; check signature and expiry. Keep allow expiry separate from sticky denial persistence. Only an authenticated policy response can lift a known restriction; installing a newer build alone cannot lift a device block.

Protected APIs return machine-readable codes (`APP_UPDATE_REQUIRED`, `RELEASE_DISABLED`, `DEVICE_BLOCKED`, `APP_LOCKED`) with sanitized decision metadata. Use documented HTTP semantics, for example 403 for access denial and 503 plus Retry-After for maintenance. A shared API handler drives the same root gate instead of scattered alert dialogs. Do not use transport errors as policy decisions.

Suggested data model:

| Table                 | Principal fields                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app_releases`        | ID, platform, channel, package, version code/name, status, object key, size, hash, signer, minimum SDK/ABIs, notes, source commit, published time                         |
| `app_policy`          | Platform/channel, revision, latest release, required floor, disabled builds, effective time, app-lock message, offline lease duration, rollout settings                   |
| `device_restrictions` | Device UUID/credential hash or separately indexed scoped-ID HMAC, player ID where applicable, blocked status, reason, public support code, created/expiry/unblocked times |
| `admin_audit_log`     | Admin actor, action, target, before/after, timestamp, request ID; no device secrets                                                                                       |

Reuse `online_devices`. Its existing `device_hash` is the **credential hash**, not a hash of Android ID: name any new scoped-ID column explicitly. Index all policy lookup keys. Do not put private block lists, raw IDs or device-specific allow responses into public CDN caches.

## Device blocking and server enforcement

Offer future admin operations for blocking/unblocking a device, blocking all known devices for an account, retiring/restoring a release and locking/unlocking Android app access. Require explicit reason, effective time and audit record. The client can ship these states before the panel exists, but real remote triggering requires the policy API and an authenticated operator path.

Use existing UUID plus possession of its credential as the primary installation identity. Optionally correlate an HMAC of the Android scoped ID to carry restrictions across normal reinstalls where that ID remains stable; keep access to that signal limited. Android ID is scoped to app signing key, user and device on Android 8+, and can change on factory reset or signing changes. It is not a universal hardware identifier. Do not request IMEI, MAC or serial identifiers. [Android ID reference](https://developer.android.com/reference/android/provider/Settings.Secure#ANDROID_ID)

A client can lie about identifiers or generate a new installation identity. Combine restrictions with account association and server rate limits on registration, authentication and gameplay. Device blocking is one abuse-control signal, not complete attack prevention. More sophisticated attestation is a separate evaluated feature, not a prerequisite that silently introduces Play Store dependency.

Enforcement coverage must include anonymous device registration, sign-in, `/v1` legacy access where relevant, `/v2` operations, WebSocket ticket issuance **and redemption**, and currently open sockets. Bind tickets to server-resolved device/build/access state. Do not trust incoming `X-Player-Id` or build headers as authority.

On a block, invalidate pending tickets and signal all active affected table objects to close that player's sockets and exclude them from future broadcasts. Enforce a short maximum revocation window (proposed <=60 seconds) through periodic server revalidation as a fallback, including passive receive-only sockets. Do not let a client avoid revocation by stopping pings. Blocked host handling must follow existing ownership/reconnect rules and preserve ledger invariants. Online gameplay commands continue to pass server authorization even if the client UI is modified.

The operator path must use backend-validated admin authentication/roles or scoped administrative tooling. Never ship an admin secret in the app or expose public unauthenticated block endpoints. A future panel calls this same audited service. This proposal does not require building the entire admin panel now.

## Download web pages and shareable links

| Proposed path                  | Behavior                                                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/download/android`            | Stable shareable latest-download landing page, real version/size, compatibility, download CTA, release notes and copy/share action.                                                                              |
| `/download/android/latest.apk` | Controlled redirect to the current immutable APK. Short/no caching on the changing alias; do not overwrite an immutable APK key.                                                                                 |
| `/releases/android/{version}`  | Permanent release page, build ID, notes and file details. Retired builds show retirement and a latest link, without promoting a disabled APK. If a version label is reused, include build code in canonical URL. |
| `/help/install-android`        | Browser-source and in-app-source instructions, permission denial, cancellation, insufficient space and signature mismatch help.                                                                                  |

The pages work without sign-in. Desktop users can copy/share the stable link; add a real generated QR code later if desired. Show APK SHA-256, package/version/size and signing information in a collapsible technical details section. Keep implementation details out of the main download flow. Handle no published release, incompatible Android version, unavailable file and retired-release links explicitly. iOS visitors receive a concise Android-only explanation.

Serve APKs as `application/vnd.android.package-archive`, with predictable attachment filenames and appropriate `Content-Length`, ranges, ETag and immutable object caching. The catalog/latest pointer must refresh quickly. Release activation is atomic only after the hosted object is verified. A publicly downloaded APK can be shared; blocking app/backend access does not retract previously downloaded files.

No separate full web application was found in this workspace; initially these routes can live alongside the existing Worker web/invite surface or static assets. If the separately hosted web app is in another repository, integrate the same catalog there after its location is known. Keep the download URL independent of any installed-app deep link so sharing never requires the app first.

## Implementation sequence after design approval

1. **Client contract and app gate.** Shared schemas/fixtures, deterministic access state reducer, secure persistence and clock handling, startup/resume integration, root routing/deep-link guard, Settings update check and structured API errors. Android only, with tests for every decision and race. No production blocking yet.
2. **Native updater.** Persistent manual download, progress/retry/pause, integrity checks, source permission, installer handoff and actual installed-build verification. Validate on the oldest supported Android version and a current physical device, including an in-place signed upgrade with saved data.
3. **Minimal remote service.** D1 migrations, release/device policy lookup, signed manifests/leases, protected operator actions, audit history, HTTP/registration/socket enforcement and revocation. Keep panel UI deferred. App-only fixtures prove rendering, but do not count as working remote enforcement.
4. **Delivery and web pages.** R2 setup after billing verification, immutable upload and validation, stable catalog/URLs, responsive download/help pages and release notes. Extend the existing verified build workflow with publication as a separate controlled step. Keep signing keys in their current protected location and artifacts on D:.
5. **Bridge rollout.** Release the new client as optional first. Observe adoption and failures. Test required-update and unblock recovery with internal devices before raising the supported floor. Maintain a clear legacy cutoff for missing version/device metadata.
6. **Admin panel later.** Device/account search, block/unblock, release history, mandatory update/effective-time settings, app lock and audit views using the already enforced operator contract.

Client-first scope is practical. Activating secure remote controls still needs steps 3 and 4; pretending a client-only lock secures the backend would leave the main abuse path open.

## Publication and recovery rules

- Build and verify using the existing signing key. Compute metadata from the APK, never from manually typed version/size fields.
- Upload to a new immutable key, verify the served file, then activate the release and policy together. Refuse mandatory activation when the target is missing, unverified or incompatible with the affected users.
- Keep the previous known-good artifact. If the new APK is broken, lift its mandatory policy where safe and ship a fixed APK with a **higher** build code. Do not attempt an Android downgrade or reuse a version code.
- Reverting a mistaken device block or global lock publishes a new policy revision and invalidates relevant server caches; affected users can “Check again”.
- Keep update/help/policy-recovery endpoints available during app locks. A rollback of policy must not depend on the locked UI.
- Native tamper resistance and public CDN artifact withdrawal are limited. Serve access policy privately and never imply an immutable public APK can be recalled from users' devices.

## Acceptance checks

| Scenario                                                   | Required result                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cold start / resume / duplicate events                     | One appropriate check; normal allowed app remains responsive; stale responses cannot override newer restrictions.        |
| Optional dismissal                                         | App remains usable; banner stays dismissed for that release; newer or mandatory releases still appear.                   |
| Mandatory + Back/deep link/restart/installer Cancel        | No path to home, online play or offline caller. Back can leave the app.                                                  |
| Interrupted download/process death/disk full/hash mismatch | Recoverable error; no install of partial or corrupt bytes; mandatory gate stays active.                                  |
| Permission denial / restrictive device policy              | Accurate help and retry; no false success or data-loss workaround.                                                       |
| Signed in-place upgrade                                    | Correct higher installed build; account, device identity, history, wallet relationship and downloaded voices retained.   |
| Blocked device updates/reinstalls normally                 | Update does not clear block; credential/scoped-ID correlation works within documented limits.                            |
| Active socket + new block                                  | Ticket replay rejected; affected sockets stop receiving data within the defined revocation window.                       |
| App lock / retired version / incompatible replacement      | Correct distinct gate and recovery path; download/help remain reachable.                                                 |
| Network timeout / 5xx / malformed policy / clock change    | No fabricated ban, no conversion of known deny into allow; lease rules consistently applied.                             |
| Offline before and after lease expiry                      | Previously allowed access only within proposed grace; expired or known-denied access stays gated.                        |
| Missing/forged UUID, absent build or spoofed header        | Server authorization cannot be bypassed by choosing an identifier/header; documented attestation limits remain explicit. |
| Publication fails / operator undo                          | Latest never points to incomplete file; unblock and policy recovery work.                                                |
| Accessibility / small display / large text                 | Clear focus, spoken state/progress, scrollable gate, tappable CTAs, no clipped mandatory banner.                         |
| iOS smoke check                                            | No Android updater permissions, routes or enforcement accidentally applied.                                              |

Run repository type checks and relevant unit/native/API tests, then an actual signed update on a device; do not claim mockups or JS tests prove installer behavior. Validate web links and hosted hashes after deployment. This planning-only pass does not run application builds or change production access.

## Design review defaults

Proposed defaults are: full gate for mandatory updates; manual transfer and Android confirmation; archive/deprecate means disabled at its effective time; Android-only app lock; neutral blocked-device copy; existing purple/gold design; 24-hour offline lease pending preference; graphical admin panel deferred. Domain selection and Cloudflare account billing/usage remain deployment inputs. Final visual approval precedes feature implementation.
