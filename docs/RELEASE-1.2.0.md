# Tambola Circle 1.2.0

Android versionCode 6. Built locally on D: using the existing release identity. This release includes the existing React Native 0.86 migration and the v3 game implementation. Saved data and package ID remain unchanged.

## Included

- Illustrated purple velvet theme, crowned logo, glossy game buttons, avatars, compact paper tickets and coin shop artwork.
- Private tables, Half/Full strips, host-controlled or optional scheduled starts, free host spectating and low-coin watch mode.
- Manual colored marks with star animations and haptics; board/history and ranked-player drawers with tap-away dismissal; live ticket sharing.
- Server verification of all 15 values in a frozen full-house claim. Calls pause, progress is shared, invalid claims resume play, repeated claims on the same call are blocked.
- Atomic coin reservations, consumption and cancellation refunds, idempotent ledger transactions, 1,200 welcome coins and free test packs.
- Female-only repeated calls with consistent 2.6-second clips, native player recovery and media-volume session improvements.
- Persisted history, device UUID registration, iOS manual mobile entry, Android device-number selection, host transfer/co-host failover.

## Validation

- App/server TypeScript: passed.
- 60 Vitest checks plus 2 native configuration checks: passed.
- 13 Python checks, including 6 ledger atomicity/idempotency cases: passed.
- 131 local Wrangler D1/Durable Object/API/WebSocket integration assertions: passed.
- Actual React Native screen components inspected in a 390×844 browser rendering harness. This is visual/component QA, not an Android emulator.
- Cloudflare migration 0006 and Worker deployed; version `f55ec22a-da21-499f-a34f-aff9a7b9e332`.
- Final APK packaging and verification: passed. 65,974,774 bytes; ARM64, ARMv7 and x86_64. Original signing certificate retained; all 90 voice hashes and five game-art pixel payloads verified.
- Production health check passed; no migrations remain.
- APK SHA-256: `13e6072a804317b5ea729a8ba434a2a7f3d84d24557a1f3cf37ced08c8170c84`.

## Deferred and device acceptance

Real coin payment checkout, ads and voice chat are TODO; their coming-later/free-test visuals are retained. Public matchmaking and verified-phone fallback are deferred. No auto-mark is included.

No Android device is attached, and this Windows host cannot compile iOS. Physical Android/iPhone testing of SIM selection, long playback, background/foreground, hardware volume, haptics, deep links and upgrade preservation is still required. The app code is updated for both platforms; no new IPA is claimed.

Download: [Android APK](https://github.com/ppegu/trust-tambola/releases/download/v1.2.0/tambola-circle-1.2.0.apk). This private repository requires GitHub access. The local copy is in `artifacts/release-1.2.0`.
