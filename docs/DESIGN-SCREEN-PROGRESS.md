# Sequential design matching

Current consolidated reference: [Design v4 gallery](../design-v4/index.html) and [v4 design guide](../design-v4/DESIGN_GUIDE.md). The records below are historical QA; later v4 overrides take precedence.

Reference gallery: `artifacts/design-v3-gameplay/index.html`.
Keep newer accepted user decisions when they supersede copy or features in the original mockups. Work on one screen, compare it on the connected Android through Metro, then proceed to the next.

## Already completed

01 Home; 02 Online hub (revised cards and separate History, pull-to-refresh only); 03 Registration (iOS manual entry, 15 avatars, Terms/Privacy links, no global service banner).

## Completed: 04 Join a table

- Dedicated `JoinTableScreen`: reference invitation artwork, six code cells, Find table, separate purple/cream preview card, host/avatar roster, actual playing/watching counts, Half/Full fees, Enter lobby.
- Native controls and actual API data; no illustrative balances, codes or people baked into the UI.
- Keep the earlier removal of “Watching is free.”
- Invalid code and network failures appear within this screen. Editing the code clears an old preview; stale requests cannot replace newer input. Finding a table dismisses the keyboard.
- Code lookup and invite links use the same preview. Revoked invite tokens are rejected before showing details. Contact numbers, tickets and marks are excluded from the preview response.
- No schema migration for this screen.
- Local integration: `scripts/test-join-preview.mjs`, 39 checks passed.
- App/Worker type checks and all 72 unit tests passed after these changes.
- Native Android verified after reconnecting to the new endpoint `192.168.31.184:40779`: six code digits show cleanly, all preview content fits, invalid code clears the preview and shows a local error, and Enter lobby joins the correct table.
- Final captures: `artifacts/android-qa/join-table-preview-device-final.png`, `join-enter-lobby-verified.png`.
- Softened the invitation artwork's edges to remove the visible rectangular crop. Local Metro (8081), API (8791), and design gallery (8093) remain running.
- Local QA fixture `.tools/join-screen-fixture.json` contains the test table and synthetic credentials; never print its credentials. Its current six-digit code is 261780.

## Completed: 05 Create table

- Dedicated CreateTableScreen matches the reference header/logo, gold icon badges, cream gradient widgets, cyan fee steppers, purple call slider, start-mode and seat choices, and gold creation button.
- Default form fits the connected Android without scrolling; expanded schedule options remain scrollable.
- Co-host is chosen in the lobby once another member is available; no fabricated member is shown before creation.
- Creation now saves optional host-playing and server-based countdown atomically with the initial room state. Default remains manual start with a watching host. No coins are reserved merely by creating a table.
- Unit tests: 80 passed. Local creation API: 29 checks passed, including retries preserving the original table/start time, invalid options and wallet safety.
- Android verified fee increments, slider bounds 3/10, scheduled/manual choices and host playing/watching choices. Creation opened the correct lobby with a live countdown, 60/110 fees and the chosen host seat. Captures: `create-table-final-device.png`, `create-table-schedule-device.png`, `create-table-created-lobby.png`.
- Existing table-settings modal also uses the new fee and timing widgets. Other management pages are part of the later host-controls pass.

## Completed: 06 Host lobby

- Added TableLobby for hosts: reference-style header and room name/count, icon-only settings, grouped room code with copy feedback, cyan Invite button, cream roster with avatar/state pills, and gold Start game action.
- Preserved later user decisions: no Choose tickets button for a watching host; table controls are available by tapping the table banner; settings remains a side icon.
- Verified on Android with four fictional API peers: two ready, one choosing, and one watching alongside the watching host. Ready-player tap shows selected tickets; settings and invitation entry points work; Start is disabled without two ready players and enabled with them.
- Captures: `host-lobby-roster-device.png`, `host-ready-player-tickets.png`, `table-settings-from-host-lobby.png`.
- Temporary local peer presence: `scripts/prepare-lobby-qa.mjs 761238`; credentials stay in `.tools/host-lobby-qa.json`. Stop the process after native multiplayer checks.

## Completed: 07 Scheduled player lobby

- Dedicated PlayerLobby matches the purple roster, gold countdown, table/code capsule, ticket widget, reserved/available coin strip and Ready action.
- Real server data supplies the scheduled start, host/co-host, player states, ticket count and balances. Host/co-host/current player appear first; five members fit on the test phone.
- Android selected six tickets, became ready, reserved exactly 110 coins (1500 to 1390 available), and remained in the scheduled lobby. Change tickets released the hold and restored 1500, reopening the chooser.
- Final capture: `player-lobby-ready-final.png`. Native player is currently unready in the chooser for the next pass.
- Scripted host table 261780 has a 30-minute schedule created around 10:13 IST for QA. Cancel/extend it before long live-game editing to avoid an unintended test start. Local QA data only.

## Completed: 08 Ticket chooser

- Dedicated full-screen TicketChooser with illustrated Half/Full pill controls, configured price, compact textured paper strips and fixed cyan Shuffle/gold Use these tickets actions.
- Half produces three panels; Full produces six. All six remain scrollable beneath the fixed controls. Initial empty selection generates a strip once; a failed generation leaves an explicit Shuffle retry.
- Android verified Half at 60 coins, Shuffle, Full at 110 coins, scrolling to ticket six and confirmation back to the lobby. Confirmation does not ready the player or reserve coins.
- Captures: `ticket-chooser-half-final.png`, `ticket-chooser-full-final.png`, `ticket-chooser-sixth-final.png`.
- Cancelled the local scheduled QA start after screen 07 verification. The QA host will start the next test manually.
- Concurrent voice-pack work caused transient Metro errors/reloads; left it untouched. Latest app typecheck passed after its missing catalog and typing were completed.

## Implemented and visually verified: 09 Live game

- Compact family/table header, current and previous number widgets, called/remaining counters and Numbers/Players side controls now follow the reference.
- Textured compact tickets use solid live grids, round red marks, progress badges, stable per-ticket save status and small gold Full house actions. Manual marking remains the only marking mode.
- Live layout verified on both Android 16 (RMX3951) and Android 11 (CPH1945); Android system bars hide on the live screen. Previous phone's server-saved marks survived rejoining.
- **Pending functional check:** automated cell taps on the replacement phone did not persist MARK commands in the local Metro session. Repeated build/Fast Refresh activity and the round ending complicated diagnosis. No confirmed cause or product fix yet; do not claim the new phone's full marking workflow passed.
- Captures: `live-game-settled-device.png`, `new-phone-live-after-outside-close.png`.

## Completed: 10 Numbers drawer

- Cream gradient side panel, Board/History tabs, red called cells, gold current-number border, recent balls and replay action; close is icon-only. Outside tap dismisses the overlay.
- Verified Board, real History ordering, replay action, close icon and outside dismissal on the replacement CPH1945 using an actual local multiplayer round.
- Captures: `new-phone-numbers-board.png`, `new-phone-numbers-history.png`.
- New Android 11 device exposed modal content underneath system bars. Fixed TicketChooser, NumbersDrawer and shared Sheet using modal-local SafeAreaProvider/SafeAreaView. Verified the ticket footer and nested CallerVoicePicker Done button remain above navigation controls. App typecheck passed.
- New phone: CPH1945 / Android 11 / 1080x2340, connected as `192.168.31.18:46641`. Metro 8081 and local API 8791 are reversed. Android QA helper now recognizes both colon and equals foreground-activity formats.
- Fictional QA Mira profile uses the isolated local API; no real SIM number submitted. New player joined via code, confirmed a half strip, reserved exactly 60 coins and entered round 2. Round 3 is currently in the lobby, unstarted, for the marking follow-up.

## Completed: 11 Ranked players

- Added a cream gradient side drawer with gold/silver/bronze rank badges, avatars, purple View widgets, completed-house totals, best-ticket progress and a separate Watching section.
- Ranking uses actual server-saved marks for numbers already called. No sample names, totals or balances are embedded.
- The replacement Android displayed QA Mira first with one saved mark and showed that mark in the compact, scrollable ticket viewer. Captures: `ranked-players-v3.png`, `player-ticket-live-marks.png`, `live-mark-persisted.png`.
- Ticket diagnostics were removed without retaining speculative grid changes. The stable round saved number 26 as `0:20` and the separate ticket viewer retrieved it. The automated tap requested 24, so precise touch targeting still needs confirmation; a manual-tap question is pending. Do not describe that discrepancy as fixed.
- The local Worker had stopped and Metro later stalled delivering bundles. Restored the Worker on 8791 with the same `.tools/v3-integration-state` and applied migration 0010 locally for the concurrent updater changes. No remote database changes in this pass.

## Completed: 12 Watching host live screen

- Implemented `HostLiveScreen` with compact logo/coin header, Host/Watching badges, current and previous balls, called/left counts, server-clock countdown, expanded 90-number board, live player previews and bottom co-host/transfer/end controls.
- Co-host and ownership actions open their existing management workflows. End opens confirmation, never ends a round on the initial tap. The watching host sees no ticket chooser.
- App typecheck passed. Android verified the full dashboard, correct called/left counts, countdown, co-host/transfer shortcuts, Players opening/outside dismissal, and End confirmation cancellation while the server remained live (round 6, four calls).
- Kept the called-cell face geometry stable and remounted its painted face on state change after Android 11 initially drew some new marks square. Final capture has round marks: `host-live-v3-round-six.png`. Other evidence: `host-end-confirmation.png`, `host-players-overlay.png`, `host-players-dismissed.png`.
- Metro recovered after restarting hidden with logs at `.tools/metro-qa.stdout.log` and `.tools/metro-qa.stderr.log`; its bundle returned HTTP 200 in 0.75 seconds. Explicit app restart loaded the current module.
- Current local fixture: Friday circle 261780, round 6; native QA Mira is owner/host and watching. QA Ravi and QA Visitor are playing scripted peers. QA Asha is the previous host. Keep all profile data and credentials private.

## Completed: 13 Automatic verification

- Added the centered logo, claimant avatar, paused-call badge, full claimed ticket, animated server progress and called-number board with recent replay balls.
- No premature success label: Ticket received is shown while verification is still running. The 15-number check and all displayed data come from the server.
- Android displayed 0 then 6 checked during a real claim. An incomplete claim resumed play at the same 65 calls with missing numbers; a later valid claim finished round 6 at 84 calls. Captures: `auto-verification-1.png`, `auto-verification-2.png`.
- Added an opaque paper fallback for first-frame legibility. Final board-height adjustment verified during round 7; all 90 cells and the footer fit. Capture: `verification-final-fit.png`.

## Completed: 14 Verified winner

- Winner avatar, gold Full house heading, green 15/15 confirmation, real winning ticket, board/history shortcut, round/ticket/entry summary and host Back to lobby action now match the reference layout.
- Watching participants see their actual zero entry and watching state. Non-hosts wait for the host to open the next round; no client can reset the server round itself.
- Android verified QA Ravi as the actual round 6 winner, opened the 84-number board and persisted round history, then returned through the host action to an unstarted round 7 lobby. Captures: `winner-v3-final.png`, `winner-number-board.png`, `winner-round-history.png`, `winner-return-lobby.png`.
- App typecheck passed.

## Completed: 15 Verification recovery

- Preserves the last received claimant, ticket and board during a lost connection. Reconnecting indicator, Retry connection action and host recovery controls match the reference; End remains disabled while offline.
- The paused badge explicitly identifies the last update so it does not claim the server remains paused after disconnection. A server verification error instead shows the finished/refunded state and host return-to-lobby path.
- Added an explicit socket reconnect action without resubmitting the claim. Native round 7 interruption test retained the two-call and later 26-call snapshots while the server rejected incomplete claims and continued calling. Restoring connectivity recovered the running game at 56 calls.
- Android 11 painted over the recovery footer controls when its decorative gradient shared their native container. Separated the paint layer and content; final controls render and fit. No speculative shared gradient change was retained.
- Typecheck passed. Evidence: `recovery-v3-final.png`, `recovery-resumed-live.png`, `verification-final-fit.png`.
- The temporary local proxy was stopped and ADB API reverse restored to 8791 -> 8791. Metro and the local server remain running.

## Completed: 16 Coin shop

- Backend-driven pack cards, selected-pack summary, gold test-purchase action, header balance and compact real ledger now follow the reference; test mode remains free and clearly labelled.
- Cropped the existing coin artwork in code to remove transparent margins. No screenshot assets or sample prices/balances were added.
- Android selected the real 100-coin pack, received exactly 100 coins (1020 -> 1120), and displayed the purchase in the ledger. Pull-to-refresh completed; See all and Purchase history opened the correct records.
- Captures: `coin-shop-v3-final.png`, `coin-shop-test-purchase.png`, `coin-activity-v3.png`, `coin-purchases-v3.png`. Typecheck passed.

## Completed: 17 Low coins

- Cream modal with coin artwork, real available/entry amounts, exact shortfall, Get coins and Watch game actions now follows the reference.
- The native QA player had 1120 coins against a 1500-coin entry: the dialog correctly showed 380 needed. Get coins opened the backend-driven shop; Watch game returned to the lobby with the player marked Watching and the balance unchanged.
- Captures: `low-coins-v3.png`, `low-coins-opens-shop.png`, `low-coins-watching.png`. Typecheck passed.

## Completed: 18 Preferences

- Rebuilt settings as a compact full-screen layout with illustrated controls, glossy colour selectors, ticket preview, grouped sound controls and a fixed Done action. Voice selection and the updater entry remain available.
- Native colour and Large numbers choices survived closing/reopening. All four switches were exercised and restored, Test voice was invoked, and the female voice selector opened. Replay is correctly disabled when no last call exists.
- Capture: `preferences-v3-final.png`. Typecheck passed; subjective audio quality was not assessed from the screenshot test.

## Completed: 19 My tables/history

- My tables has a compact logo/balance header, illustrated room cards, real participant avatars and fixed Create/Join actions. History remains a separate icon entry; completed games stay out of the ongoing list.
- Native pull-to-refresh completed for both lists, saved round 6 winner details opened, and the room card entered the actual QA lobby. Corrected an Android percentage-width issue in the illustration pane.
- Captures: `my-tables-v3-final.png`, `history-before-v3.png`, `history-details-v3.png`. Typecheck passed. No fabricated scheduled time or countdown is shown when the table summary API does not supply it.

## Completed: 20 End round

- Added the reference-style confirmation with actual round/player counts and total refundable entries, Keep playing, and explicit End round & refund actions.
- Native QA round 2 ended with `host_ended`; the 60-coin native entry returned (1000 -> 1060) and the scripted player's ledger recorded a 110-coin refund. The host returned to an unstarted round 3 lobby.
- Captures: `end-round-v3-dialog.png`, `marking-rows-verified.png`.
- Found and fixed the watching host's Play this round transition: selecting that action now changes the seat to playing before opening the chooser. Native Ready and manual Start were verified.
- Native marking diagnosis: a permanently mounted, invisible transformed celebration Text distorted Android touch targeting. Celebration now mounts only while animating under a non-touchable View. Controlled taps on 15, 34, 22 and 49 saved the exact cells across all three rows. Diagnostic logs and unrelated layout experiments were removed; final rapid-tap regression remains pending.

## New revision requested 2026-09-23

- Investigate delayed bundled artwork/gradient rendering and blank avatar selections; optimize ticket interaction and repeated renders.
- Remove the duplicate My tables screen and Home entry. Online hub remains the single ongoing/history destination.
- Revisit every v3 reference; align registration, tickets and round-ended outcomes with the accepted visual system.
- Host controls and dedicated Wallet/transactions need new phone-format mockups and explicit user approval before implementation.
- Work and push directly on main from now on.

Voice chat, real payments and ads remain TODO. Never reintroduce auto-mark, male voices, manual review/challenges, default ready countdowns, or non-private tables from older concepts.

## Approved revision implemented: host controls, wallet and rendering

The user approved both new designs. See `ui-revision-2026-09-23/README.md` for references, implementation decisions, real-device evidence and validation limits.

- Host controls use compact grouped widgets, with extra actions expandable and End round separate.
- Home and coin indicators open the dedicated Wallet. Transactions have API pagination, filters, details and pull-to-refresh; top-up remains free in test mode.
- My tables is removed; the existing online hub and its separate History remain the single table entry point. This supersedes screen 19's duplicate entry above.
- All avatars use individual native images; gradients/paper/ticket grids paint without waiting for JS measurements. Native row-targeting and mark/unmark persistence are verified after the decorative-star fix.
- Round ended shares the winner composition and uses the current number-board/history overlay.
- Work is on `main`; baseline commit `86b488f` was already pushed before these revisions.

## Development app, interaction and history follow-up

See `DEV-PERFORMANCE-QA.md` for the implementation and real-device evidence. The updated native dev APK includes the updater and native Android gradients. Ticket interaction now isolates optimistic edits to the touched panel, the chooser mounts a windowed list after opening, and common buttons/sliders avoid repeated heavyweight renders during gestures. Table settings is the single management entry. Round history now uses result cards, called-number boards and expandable tickets instead of the event log.

The connected Android verified half/full selection, scrolling, precise repeated ticket taps, host-ended history, refunds and slider restoration. Automated validation passed. Small debug frame samples improved but are not a release-performance guarantee.
