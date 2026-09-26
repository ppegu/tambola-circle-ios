# Captain round controls — 24 September 2026

## Behavior

- User-facing Host / Co-host copy is now Captain / Co-captain, including Assamese and Hindi. Stored roles, event IDs and API fields remain compatible with existing accounts and rooms.
- Confirming the Captain's tickets reserves their entry coins and makes them ready. Start also supports already-selected tickets from older clients without requiring a separate Ready action. A round still requires two playing members with funded tickets.
- The Captain has one **Play this round** switch in creation, the lobby and table settings. Off means managing and watching without a playing ticket.
- Manual and scheduled rounds enter the live feed with a server-owned five-second countdown. The first draw occurs at its deadline; reconnecting does not restart the countdown.
- Tapping the current number pauses/resumes calls for the current Captain. Pause preserves the remaining countdown/call time and survives reconnects and Captain handover.
- The live feed uses the offline caller's shared **4 / 5 / 7** speed control. The Captain can change it while playing or watching, including while paused. Changes are broadcast and saved for subsequent rounds. The API accepts 3–10 whole seconds. Existing custom speeds remain visible until changed.
- Pace changes preserve elapsed active time, pause state, the opening countdown, the final full-house claim window, and the minimum recorded announcement duration. They do not change ticket fees or charge coins.
- A failed full-house claimant becomes watch-only for that round. Their frozen declared ticket, missing numbers and reason remain visible in the live feed. Server validation and optimistic-mark guards prevent more marks, claims or switching back to play, including after reconnecting.
- Every current member can return a finished round to the next lobby. Simultaneous return requests are idempotent. Starting the next round remains a Captain action.

## Verification

- App and Worker TypeScript checks passed.
- 160 Vitest tests passed, including timer boundaries, scheduled starts, pause/resume, live pace changes, authority fencing, voice duration, failed claims, reconnect and concurrent lobby return.
- 167 isolated local API checks passed with authenticated QA players and WebSockets. Includes exactly-once holds/refunds, live marks, speed broadcasts, automatic verification, scheduled starts, Captain takeover and persistent history.
- Nine SQLite coin-ledger checks passed; three native configuration checks passed.
- Connected OPPO CPH1945, Android 11, development app through Metro: verified compact lobby, Captain start without Ready, automatic readiness on ticket confirmation, the live countdown, number-button pause/resume, 7-second selection while paused, 4-second selection while calling, playing/watching Captain feeds, and the persistent rejected-ticket screen after reconnecting. A scripted non-Captain returned the shared table to the next lobby.
- Only fictional QA accounts and the isolated local database were used for gameplay tests. No personal phone number was submitted. Native iOS runtime testing was not performed in this pass.

Local screenshots (ignored build artifacts):

- `artifacts/android-qa/captain-lobby.png`
- `artifacts/android-qa/captain-countdown-live.png`
- `artifacts/android-qa/captain-countdown-proof.json`
- `artifacts/android-qa/captain-paused.png`
- `artifacts/android-qa/captain-rejected-claim.png`
- `artifacts/android-qa/captain-live-speed.png`
- `artifacts/android-qa/captain-only-speed.png`

Metro's Windows watcher was also corrected to ignore generated folders using both Windows and normalized POSIX paths. Transient Wrangler build directories had caused a watcher crash during device testing; the regression test covers both path forms and nested Worker projects.

## Deployment

Cloudflare Worker `tambola-circle` deployed with version `d35fb79a-09a7-4eaa-b3d8-380fdc9f8a76`. Existing D1, R2 and Durable Object bindings were retained. Production health returned `ok: true`.

The connected development app has the changes through Metro. This change does not publish a new APK release; the previously published Android release remains 1.5.1.
