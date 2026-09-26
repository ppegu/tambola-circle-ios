# Android development app: interaction and history revision

Validated on 2026-09-23 using the connected OPPO CPH1945, Android 11, and Metro. Work is directly on `main`.

## Changes

- Development builds use the same update controller and signed access checks as release builds. Rebuilt and installed the native development APK in place, preserving its profile and data. Settings → Check for updates returned “You’re up to date”, version 1.4.0-dev.
- Android gradients now paint in one native Canvas view. They resize on the UI thread, with explicit handling for zero-sized views while modals close. The SVG fallback remains for other platforms. This fixes the partially painted cards observed after resizing.
- Ticket paper is a bundled, compact raster texture generated from code. Repeated paper masks and texture nodes no longer mount for every ticket.
- Local mark changes notify only the touched ticket. Confirmed optimistic marks remain visible until the matching server state is committed. Superseded unsent toggles are skipped; server commands remain serialized and claims still wait for outstanding marks.
- Ticket panels are memoized by their own cells. Decorative stars cannot capture touches, and moving out of a cell cancels its press. The chooser opens immediately and mounts its windowed list after the native modal transition.
- Main action buttons depress with native-driven springs, with immediate touch haptics and a fixed spinner slot. Reduce motion retains pressed feedback without the spring. Ticket chooser spinners identify the active action.
- Sliders update their animated position during dragging and persist preferences on release, avoiding repeated whole-app preference updates and storage writes during the gesture.
- Host controls and table settings share one Table settings entry. Round rules, people, ownership, scheduling and history are nested there.
- Both round-history entry points show the actual result and called-number board. Player tickets expand on demand; event logs are no longer the history UI. API loading/error and pull-to-refresh states remain available.

## Real-device checks

Only the fictional QA Coin Check table was changed. The unrelated user table was untouched.

1. Opened My tickets from the lobby, switched half/full strips, scrolled to ticket 6, returned to half and confirmed the selection.
2. Readied the native QA player and started round 4 with a scripted second player. Seven physical ADB taps included three successive taps on number 3 and individual taps on 68, 83, 33 and 44. Server state contained exactly five marked cells: 3, 33, 44, 68, 83. The screen showed 5 / 15 and Saved.
3. Opened the unified Table settings while live. End round & refund finished the QA round with `host_ended`, no winner, 15 calls and 75 numbers remaining. Entry holds were cleared and the native balance returned to 1,260.
4. Round history showed that exact status and board. Switching to an older round loaded its own board. The resized round-selector card painted completely.
5. Voice-volume drag selected 20%; a second drag restored the original 100%. Closed preferences and left the app at Home.
6. The runtime console reported no warnings or errors during the final native checks.

Evidence is kept locally under `artifacts/android-qa/`:

- `dev-update-workflow.png`
- `ticket-picker-native-ready.png`, `full-strip-scroll.png`
- `live-native-verified-marks.png`
- `table-settings-native.png`
- `history-native-ended-board.png`
- `picker-before-native-gradient.txt`, `picker-native-gradient.txt`

The final development APK is `artifacts/android-qa/tambola-circle-dev.apk`. It includes the updater and native gradient view; current JavaScript and assets are served by Metro, as expected for this development build.

## Validation and limits

- `npm run check`: app/server typechecks, 110 Vitest tests across 18 files, and two native configuration tests passed.
- `npm run test:coins`: nine SQLite ledger tests passed.
- Android arm64 debug assembly succeeded and the APK installed using an in-place update.
- New tests cover panel-local notifications, stale mark acknowledgements, clearing marks between rounds and round-status labels.
- The chooser opening sample had 111 frames before and after the native gradient change: median 12 → 11 ms, 95th percentile 73 → 61 ms, janky frames 35 → 30. These small debug samples are directional only; they do not establish consistently smooth release performance. Both reported zero slow bitmap uploads.
- No iOS device or release-mode frame benchmark was run. The native updater's signed check was exercised; downloading/installing a newer APK through the updater was not repeated in this pass.
- Voice chat, real payments and ads remain deferred. No production backend deployment or public release was made for this development-app revision.
