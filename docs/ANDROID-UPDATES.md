# Android direct updates and remote access

Current release: **1.5.2 / Android build 12, required update**. Production policy revision 6 sets both latest and minimum build to 12. The direct update workflow first shipped in 1.4.0 / build 9. Design reference: [approved screens](android-updates-design-v1/SCREEN_SPEC.md) and [workflow boards](android-updates-design-v1/README.md).

## What ships

- An Android root guard covers home, offline play, online play, dialogs and deep links. A restriction unmounts gameplay, stops its audio/socket work and keeps saved data.
- Checks run on cold start, every real foreground resume and every five minutes while active. A first launch needs the server. An existing signed allow lease permits offline use for at most 24 hours; a reboot, expired lease, backwards clock or missing/invalid signature requires another check. A cached denial stays denied until a fresh signed server decision clears it. An online-only policy checks every 25 seconds and permits at most a 30-second fresh session.
- Optional releases have a dismissible home banner and a manual Settings check. Required updates have a permanent banner and full-screen gate. Back exits the app instead of opening gameplay. A compatible replacement, manual download, pause/resume/retry, verification, source permission, Android installer, cancellation and success are separate states.
- A download never starts without a tap. It pauses when the app goes into the background. Files stay in private app storage and are excluded from backups. Range/ETag checks support safe resumption; final SHA-256, package, build and installed signing certificate must match. Download completion alone never unlocks a mandatory gate.
- Deprecated, archived and revoked releases stop working at their effective time. An incompatible replacement shows help and Check again. Device/account blocks take priority over an app lock and update requirements. A new APK does not erase a device restriction.
- Existing authenticated HTTP requests, socket tickets, socket messages and passive sockets are checked server-side. Passive sockets recheck at most every 30 seconds; emergency device blocking also asks relevant rooms to revoke access immediately.
- The public download, release and installation-help pages work without login. Stable links are `/download/android`, `/download/android/latest.apk`, `/releases/android/<version>` and `/help/install-android`. Copy/share actions use these links. Immutable APK paths include package, build and hash. Retired binaries return 410.
- Authenticated operator endpoints provide publish/policy, release retirement, device/account block/unblock, device lookup and audit history. A graphical backend admin panel remains deferred as specified in the approved plan. These endpoints are ready for that panel to call from its trusted server.

## Hosting and current release status

Production was first deployed on 2026-09-23 after the user approved Cloudflare hosting and APK publication. The current Tambola Circle Worker serves the update API and public pages. On 2026-09-24, APK 1.5.2 / build 12 was published and its full public download checksum verified before raising the minimum build to 12 as explicitly requested. Policy revision 6 keeps the app unlocked, the existing 24-hour offline lease and legacy metadata enforcement disabled. Production signed-response checks confirm build 11 receives `required_update`, with the exact verified replacement, and build 12 receives `allow`; see [current release verification](RELEASE-1.5.2.md). The earlier physical upgrade from build 8 to build 10 is recorded in [1.5.0 verification](RELEASE-1.5.0.md).

Live links: [Download page](https://tambola-circle.ffegu0617.workers.dev/download/android), [APK](https://tambola-circle.ffegu0617.workers.dev/download/android/latest.apk), [release notes](https://tambola-circle.ffegu0617.workers.dev/releases/android/1.5.2), [installation help](https://tambola-circle.ffegu0617.workers.dev/help/install-android).

The account inspection on 2026-09-23 found approximately 19.8 GB across existing R2 buckets. R2 Standard includes 10 GB-month of free storage, 1 million Class A operations and 10 million Class B operations; internet egress is free. Storage beyond the allowance is $0.015/GB-month, rounded to whole billable units. A roughly 90 MB APK has a fractional storage rate around $0.00135/month, but actual incremental billing may be zero or another $0.015 when it crosses a rounded boundary. The account is not currently within the storage allowance. Request charges and the actual Workers account plan must also be checked. The user approved publication on this existing account. The dedicated `tambola-circle-releases` bucket now holds the APK; no billing plan was changed and no unrelated bucket was modified. [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Workers Free permits 100,000 requests/day and 10 ms CPU per invocation. This feature streams APK bytes from R2 and asks R2 to verify the upload checksum, instead of buffering or hashing an APK inside Worker JavaScript. RSA policy signing, D1 queries and traffic still need real production CPU/usage monitoring before claiming it fits Free at scale. Active socket enforcement adds periodic reads. Exhausted free quotas may interrupt service; there is no automatic paid upgrade in this implementation. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [R2 checksum support](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

Cloudflare Pages cannot directly host APKs larger than its 25 MiB per-file limit. The Worker serves the lightweight pages/assets and streams private R2 release objects. R2 public bucket access is not needed. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

## Signing and credentials

Keep both the existing Android keystore and `.credentials/update-signing.json` backed up privately. They are separate keys: the Android key preserves upgrade compatibility, while the RSA key signs access decisions. Never put either private key or the admin token into source control, client environment variables, web assets or screenshots. The app contains only `shared/update-keys.json` public keys. Lost policy keys require a planned app/key transition; do not run a key regeneration as a routine fix.

`node scripts/setup-update-signing.mjs` creates missing material once and refuses to overwrite it. `--local` adds it to ignored `server/.dev.vars`. The setup has already been completed for this checkout. The production certificate is pinned by the release inspection tool. Never uninstall an existing user's app to fix a signing conflict.

## First deployment procedure (completed for this account)

Run from the repository on Windows, with existing account authorization:

```powershell
. .\scripts\use-d-drive.ps1
node node_modules/wrangler/bin/wrangler.js r2 bucket create tambola-circle-releases --config server/wrangler.jsonc
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --remote --config server/wrangler.jsonc
node scripts/app-release.mjs provision-secrets
node node_modules/wrangler/bin/wrangler.js deploy --config server/wrangler.jsonc
node scripts/app-release.mjs status
```

Create the bucket only if absent. Review pending migrations before applying them; this shared repository may contain other approved work. Migrations 0010 and 0011 add release policy, restrictions, audit and immutable release identity. Provisioning sends existing secrets to the configured Worker without printing their values. Keep the default minimum build 1, lock false and requireMetadata false for the first bridge release. Confirm the unchanged allow path for existing clients before publishing.

## Build and publish a release

Use the existing GitHub Actions `Build Android APK` workflow or `scripts/build-local-apk.ps1`. CI produces the signed APK, manifest/permission/certificate checks, voice integrity report, checksum, source commit and `release.json`. Add `docs/releases/<version>.txt` for each release (one plain-language note per line), and increment both the app version and native Android versionCode. Keep the same package and signing key.

On Windows, set `JAVA_HOME` to the existing D: Java 21 installation and `ANDROID_HOME` to the existing D: SDK if not already set. Inspect before any upload:

```powershell
. .\scripts\use-d-drive.ps1
node scripts/app-release.mjs inspect artifacts/release-1.4.0/tambola-circle-1.4.0.apk --notes docs/releases/1.4.0.txt --out artifacts/release-1.4.0/release.json
node scripts/verify-apk.mjs artifacts/release-1.4.0
node scripts/app-release.mjs publish artifacts/release-1.4.0/tambola-circle-1.4.0.apk --notes docs/releases/1.4.0.txt --out artifacts/release-1.4.0/release.json
```

`publish` verifies native metadata/signature, uploads to R2 Standard, registers a verified draft, activates it while preserving the current mandatory floor and downloads the public bytes to verify their hash. Registration requires an existing object and a matching R2-verified checksum. Build codes, release IDs and version names are immutable. It does not raise the minimum build. If publication stops after registration, inspect status and use the policy command to activate that existing draft; do not overwrite its APK or rerun publication blindly. If public verification fails, investigate before raising the floor.

After publication, verify the public download/help/release pages and an actual install over the previous APK. Only then distribute the stable link. Build 8 and older have no offline guard; they cannot be retroactively forced to close when disconnected. Offer build 9 as an optional bridge first. Future build 10+ can then be made mandatory for clients containing this guard.

## Operator actions

Use `status` to read the current revision. Write request bodies to a JSON file under `artifacts/updates/` and apply them with the CLI. This avoids logging tokens in shell history. Every restriction/policy mutation needs an operator reason and is audited. The current token represents one release-operator role; a future multi-admin UI needs individual authentication/roles before exposing these endpoints to people.

```powershell
node scripts/app-release.mjs status
node scripts/app-release.mjs devices <device-or-player-UUID>
node scripts/app-release.mjs apply policy artifacts/updates/policy.json
node scripts/app-release.mjs apply release-status artifacts/updates/retire.json
node scripts/app-release.mjs apply block artifacts/updates/block.json
node scripts/app-release.mjs apply unblock artifacts/updates/unblock.json
node scripts/app-release.mjs audit
```

Example policy (replace revision and build with verified current values):

```json
{
  "packageId": "com.ppegu.tambola",
  "expectedRevision": 4,
  "latestBuild": 10,
  "minimumBuild": 10,
  "locked": false,
  "message": "",
  "offlineHours": 24,
  "requireMetadata": false,
  "reason": "Require the verified replacement after staged testing"
}
```

Use minimumBuild 1 for an optional update. A mandatory floor cannot exceed its verified available replacement. Stale revisions return 409 and must be re-read, not automatically retried. Policy activation and floor changes commit atomically. To temporarily lock Android, keep the remaining fields and set locked true with a user-facing maintenance message. To recover, set locked false using the new revision. Cached denies clear at the next successful check; offline devices cannot learn about an unblock.

Example retirement:

```json
{
  "packageId": "com.ppegu.tambola",
  "versionCode": 9,
  "status": "archived",
  "effectiveAt": 1790208000000,
  "reason": "Replace a retired build"
}
```

Omit effectiveAt for immediate retirement. Status active restores a retired release. The current latest release cannot be retired until a verified replacement is activated. Previously unpublished builds must first be registered with their genuine artifact, or covered by a minimum floor. Never replace a published binary with new bytes under the same build.

Example device block:

```json
{
  "kind": "device",
  "target": "DEVICE-UUID-HERE",
  "reason": "Confirmed abusive traffic",
  "matchReinstalls": true
}
```

Use the real UUID returned by device lookup; `kind:"player"` targets an account. Optional expiresAt is an epoch timestamp in milliseconds. Save the returned restriction ID and support reference. Unblock with `{"id":"RESTRICTION-UUID-HERE","reason":"Investigation resolved"}`. The neutral user message never exposes the internal reason. matchReinstalls additionally hashes the signer/user-scoped Android ID using server HMAC; raw IDs are not used as block credentials. This survives ordinary reinstall on the same Android profile/signing identity, not factory reset, another profile or a modified client. Blocks are abuse controls, not unforgeable hardware identity. Server rate limits remain necessary.

`requireMetadata` is an eventual legacy API enforcement switch, not needed for normal new-client access checks. Leave false during the bridge rollout. Unidentified legacy requests do not reveal their platform, so enabling it can also affect old iOS clients; only enable after all supported clients carry device metadata or the legacy API is deliberately retired. iOS does not mount the new updater/gate.

## Local verification and device testing

All local changes use the isolated Worker on 127.0.0.1:8792 and `.tools/update-test-state`, never the production database. Do not point operator test scripts at production.

```powershell
. .\scripts\use-d-drive.ps1
node scripts/setup-update-signing.mjs --local
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --persist-to .tools/update-test-state --config server/wrangler.jsonc
node node_modules/wrangler/bin/wrangler.js dev --ip 127.0.0.1 --port 8792 --inspector-port 9232 --persist-to .tools/update-test-state --config server/wrangler.jsonc
# In a second terminal, from the repository:
. .\scripts\use-d-drive.ps1
npm run test:updates
```

The integration suite uses non-installable fixture bytes and the `.dev` policy. After it runs, reset that local policy to your real QA APK before using a phone. Unit tests cover tampered signatures, identity/build binding, stale replies, persisted restrictions, lease expiry/clock changes, coalesced checks and in-place/browser update success. Integration tests cover real signed responses, D1/R2, mandatory/retired/incompatible states, device/account/reinstall blocks, unblocks, HTTP/socket denial, passive revocation, range downloads and operator concurrency.

`./scripts/build-update-qa.ps1 -VersionCode 9` and `-VersionCode 10` build side-by-side `.dev` APKs. Production build tasks reject this override. An old Metro debug shell without the new native module temporarily renders the existing app so other development work can continue; rebuilt debug and all release builds mount the guard. This fallback is never enabled in production.

Device acceptance: optional dismiss/reopen; mandatory Back; interrupted/resumed download; app background and process restart; integrity failure; Android source permission; installer cancellation; update over existing data; fresh post-install allow; device block surviving upgrade; app lock; retired/incompatible version; expired offline lease. Coordinate ownership of a shared ADB phone first. Use `adb install -r`, never uninstall/clear data, and do not install a production bridge APK until its signed service is deployed. Preserve and restore any existing Metro/reverse mappings. Screenshots of app/installer states belong under `artifacts/updates/`.
