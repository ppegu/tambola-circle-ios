# Lobby, startup and invite fixes — 24 September 2026

## Changes

- Compact lobby dock: shorter translated `Tickets` label, smaller ticket icon and text, less ticket-widget width, and single-line Play/Watch labels. The compact seat controls and host-ready checkbox retain at least 44dp touch targets. Full/half and coin amount remain visible.
- First access check stays in a loading state while identity, policy cache and server verification settle. Reading the native download state no longer delays the access request. Failed checks show an error only after completion; retry shows loading. Verified restrictions remain visible and cannot be bypassed.
- Public invite/API/share URLs normalize the former production origin to `tambola-circle.ffegu0617.workers.dev`. Existing table IDs and invite tokens are unchanged. Local QA and custom deployment URLs remain intact.
- The legacy API proxy redirects valid GET/HEAD invitation links to the current domain. API, WebSocket, voice and signed APK paths continue to forward unchanged. Internal package IDs and storage keys are retained for installed-update and saved-data compatibility. Already-sent chat messages cannot be rewritten by the app.

## Verification

- App/server TypeScript checks passed; 149 Vitest tests and two native configuration tests passed. New tests cover delayed first checks, failed checks/retries, restrictions during retries, URL normalization and legacy proxy routing.
- OPPO CPH1945, Android 11, Metro and an isolated local API. Reinitialized the renamed local D1 schema; used the previously approved fictional QA number only. No production player/table changes.
- Created `QA Compact`, switched Watch → Play, opened ticket selection, confirmed a full strip, readied/unreadied the host, and returned Home. Coin reservation was released; no round started.
- Captured the actual 360dp layout and a temporary 320dp React Native container on the same phone. The temporary width override was removed afterward. These are layout/interaction checks, not release FPS measurements.
- Android denied attempts to change display size and screen timeout; both remained unchanged (1080×2340, timeout 600000ms). The narrow-width check used the temporary app container instead.
- Screenshots: `artifacts/android-qa/compact-lobby-360.png`, `compact-lobby-320.png`, and `compact-lobby-final.png`.
- Deployed legacy API proxy version `b1c973d7-3ab8-41ec-84a5-02c4da1010fe`. A synthetic old invite returned HTTP 308 to the current domain; the destination returned HTTP 200 with Tambola Circle branding. Legacy `/health` still returned 200.

The production APK remains 1.5.1/build 11. These app changes are available through the development Metro bundle and require a new APK release for installed release users.
