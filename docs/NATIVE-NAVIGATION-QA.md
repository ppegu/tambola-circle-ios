# Native navigation and approved caller/lobby revision

Validated on 24 September 2026 on the connected OPPO CPH1945 (Android 11), using the development APK and Metro. Only fictional players and the local QA Coin Check table were changed.

## Architecture

- Wix React Native Navigation 8.9 registers each full screen as a native stack component. Android transitions move horizontally; compact confirmations use native modals. Home remains mounted to own audio, deep links, device initialization and the release-update service.
- Zustand stores retain identity, socket snapshots, offline state, preferences, API resources and optimistic ticket marks. Hidden native screens freeze their data selection. A mark notifies the affected ticket and stays optimistic until its server state is committed.
- API resources retain cached data during refresh, deduplicate requests and reject stale responses. Initial loads use screen-shaped skeletons. Button progress occupies a fixed icon slot.
- Native community sliders move on the UI thread and commit preferences at drag completion. Voice selection prepares five bundled female preview clips on mount and releases preview players when closed.
- The same signed update controller is shared by all native screens, including the development build. App Updates opens its check screen.

## Approved UI and workflows

- Lobby: shared coin indicator, compact code/share row, settings beside the title, player summary beneath the roster, and a fixed ticket/play/watch/start footer. Watching hides ticket selection. The host starts manually unless a countdown is configured.
- Caller: app logo, direct 4/5/7-second choices, one volume button with percentage badge and native slider, a gold current-number frame, red Play/Pause, called/remaining progress, and a light board with red circular markers. It sizes from its measured viewport. Older saved 3/6-second preferences normalize to 4/7 when opened.
- The approved Game paused dialog supports Keep playing, Restart game and Back to home. Restart and Home clear the round; dismissing a paused running game resumes it.
- Static vector stars decorate the shared background. They cannot intercept touches and have no animation loop or remote dependency. The caller uses a subdued purple background.
- Ticket selection shows half/full prices inline and uses regenerate/check icons in the footer. Direct sharing opens the OS share sheet. Ownership, co-host and removal actions live in player details; rules are inline in Table settings.
- Paid roster players may switch to Watch and resume without a second entry charge. Late spectators cannot enter a live round. Round history shows the actual outcome and called-number board.

## Physical-device checks

- Installed the rebuilt arm64 dev APK in place; saved identity and wallet survived.
- Verified caller speed switching, Play/Pause, pause/resume, restart, and zero called numbers after returning Home and reopening.
- Verified lobby coin display, watch/play switching, hidden host tickets while watching, full-ticket regeneration/confirmation, and ready state.
- Changed the QA interval with the native slider and saved it. Checked the current round history board.
- Started round 5 with the phone and a scripted fictional peer. Toggled a marked cell and observed the saved count decrease. End round & refund returned the table to its ended state, with 29 called numbers and no winner; the wallet returned to 1,160 coins.
- Played Neerja's bundled preview while its full pack was absent. App Updates returned “You're up to date”, version 1.4.0-dev.
- Opened Wallet, See all transactions and Top up. The backend catalog loaded, the round refund was visible, and the duplicate transaction-history action was absent. No coins were purchased.

Screenshots are local under `artifacts/android-qa`, including `lobby-approved.png`, `tickets-compact.png`, `settings-inline.png`, `round-history-native.png`, `pause-dialog-confirmed.png`, and `caller-circles-final.png`.

## Build and limitations

The development APK is `artifacts/android-qa/tambola-circle-dev.apk`; it uses Metro for JavaScript. Android native assembly and in-place installation succeeded. App/server typechecks, 122 Vitest tests, two native configuration tests and 16 Python verifier/ledger tests passed. Both platform JavaScript bundles were validated. Bundle validation checks 90 Aria calls plus four offline preview WAVs by hash.

An iOS Xcode archive and iOS device run were not performed on this Windows host. No release-mode frame-rate benchmark or updater APK download/install was repeated in this pass. No production backend deployment, payment, ad or voice-chat implementation is included.
