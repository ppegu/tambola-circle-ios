# Tambola Circle — gameplay design v3

Archived specification: use the [v4 gallery](../../design-v4/index.html) and [current design guide](../../design-v4/DESIGN_GUIDE.md) for approved revisions and later copy/behavior changes.

Date: 22 September 2026
Status: **Approved visual reference. Implemented features and deferred items are tracked in IMPLEMENTATION.md.**
Output: 20 individual portrait phone mockups, intended ratio 9:20. Generated with the built-in image-generation tool. Exact prompts are in `prompts.json`.

## Direction
Playful purple, gold and ivory; tactile game buttons; restrained number-ball illustrations; paper strips with thin perforated seams. Decoration is strongest on home and entry screens and quietest during play. My tables sits immediately after Play online. Only private tables are available: the lock is informational, never a public/private choice.

The approved Photo 2 offline caller remains the layout reference. This proposal does not replace it with the online design. Shared haptics, preferences and audio reliability work still apply offline.

## Round rules
- **Host starts is the default.** All players becoming ready does not start a round.
- The host may choose **Schedule**, select a date/time and confirm it. Everyone then sees an absolute start time and server-synchronized countdown. This is the only automatic-start mode.
- No ticket-selection timeout. An unscheduled lobby has no countdown, including for the host.
- Proposed starting rule: at least two funded, ready players. Unready players watch the current round. If the scheduled time arrives without enough ready players, cancel that start, release reservations and return to the lobby with a clear message.
- Host can watch/control without selecting or paying for a ticket. Assign a co-host, transfer ownership, cancel an upcoming round or end the current round.
- Co-host takes temporary control after a server-defined offline grace period. The returning owner explicitly reclaims control. Use a server host-role version so two devices cannot make conflicting host decisions.
- Manual host actions and scheduled starts use the same atomic start operation. Reconnects, double taps and duplicate alarms cannot start or charge twice.

## Tickets and live play
Half = three standard tambola panels; Full = six. Each panel has three rows, nine columns and fifteen numbers, five per row. Production grids must come from validated ticket data; generated artwork is not a numeric fixture.

Choose/shuffle a strip before Ready. Ready reserves its entry cost and locks the selected strip; changing tickets first releases the reservation and clears Ready. In the lobby, show player status and a tactile ticket button, not the current user's full strip. Ready players' strips are viewable.

Use thin 4–6 logical-pixel perforation seams, small headers and a continuous vertical strip. Do not compress touch targets merely to show every panel: scroll the strip. At phone widths a nine-column grid is naturally tight; preserve numeral readability and provide a zoomed-ticket mode when larger touch targets/text are needed.

Live play uses immersive mode where supported, respecting safe areas and screen-reader escape routes. Keep the current number, previous/replay, called count and remaining count visible. Numbers drawer on the left has Board and History tabs; player drawer opens from the right. A backdrop tap closes the drawer and must not pass through to mark a ticket.

Tap a number to toggle a bold filled red circle with white numeral; personal colour is configurable. Add a short, cell-confined star burst and light haptic. A second tap unmarks without celebration. Honour device haptic settings and Reduce Motion. Mark state must also be announced accessibly, not communicated through colour alone.

Each ticket has a stable **Full house!** action aligned with its header. Autosaving never changes that label, width or location. Use optimistic local marks, a separate saved/offline indicator and ordered, retryable server synchronization. One claim at a time; repeat taps are idempotent.

Player list shows completed houses, best-ticket marked/15 and remaining count, with a live-ticket action. Rank first by completed panels, then best-panel progress; use stable ties. Do not rank by raw strip total, which favours Full over Half. Count only server-validated marks corresponding to called numbers in the progress ranking; a premature personal mark may remain visible but cannot improve ranking.

## Automatic verification
Manual reviewer voting, challenge posts, proof-area selection and review/challenge timers are removed.

1. Server freezes the call sequence at the accepted claim and stores ticket ID, round ID, called-number version and claim ID.
2. Broadcast a shared verification state. Show the claimed ticket above the called-number board and recent history on one phone screen.
3. Check ownership, locked ticket integrity and that all fifteen ticket numbers occur in the authoritative called set. Local marks alone never prove a win.
4. Progress UI follows the server result; a short animation may visualize the checks but must never imply an unconfirmed win.
5. A valid claim records the result and ends the round. Everyone can inspect the evidence and return to the lobby.
6. Proposed invalid-claim rule for this revision: show the unmatched numbers and resume calling, without the previous manual-dispute punishment. No other player needs to approve/reject. This rule is a product assumption for confirmation.
7. A system/connection error preserves evidence and retries with a bounded timeout. Host or acting co-host may end/refund the round and return everyone to the lobby. An ordinary player's Back to lobby action leaves/spectates; it cannot reset everyone else's game.

If multiple claims arrive together, process against the same frozen call snapshot, with a deterministic tie rule finalized before implementation. Do not award a second debit or invented prize.

## Virtual coins — proposed economy
The preview uses Half 50, Full 100 and a sample balance of 1,200. Shop pack sizes and rupee prices are illustrative, not approved store products. Play credits have no cash-out and this design introduces no cash prize or transferable coin pool.

- Entering the lobby and watching are free.
- Ready places a server-side hold. Available balance excludes holds.
- Round start consumes each participating player's hold exactly once.
- Unready, leaving before start, a cancelled schedule or failed start releases holds.
- Proposed policy: a host/system-aborted round refunds each entry once. Completed rounds and a player's voluntary mid-round departure do not refund entry.
- Insufficient funds cannot produce a ready playing seat. Show Get coins and Watch for free.
- Use an append-only server ledger with immutable transaction IDs, per-account atomic balance checks and round-seat uniqueness. The client never awards coins.
- Purchases use native store products and localized prices. Server verification grants each store transaction once. Pending purchases are shown as pending and do not increase spendable balance.
- Handle retries, duplicate callbacks, offline restoration, refunds/revocations and interrupted checkout. Never use a mobile number or reinstall-generated UUID as sufficient authorization to access a paid wallet.
- Before launch, test concurrent Ready/start/cancel, stale clients, schedule/manual start races, host transfer, reconnect, double refunds and purchase replay. Reconcile ledger totals and purchased grants.

Reference: [Apple in-app purchase guidance](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase), [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Google Play Billing security](https://developer.android.com/google/play/billing/security).

## Registration and device identity
Android shows the selected device-provided phone number in one read-only input with a Change link that reopens the native picker. Do not show a permanent SIM list. A selected number is not proof of ownership; never label it verified. When unavailable, explain that state instead of inventing a number. iPhone retains manual phone entry for now, as previously requested. No recovery-code UI.

Record app-scoped installation/device information with notice and link it to the profile. A UUID is an installation identifier, not a secret or proof of personhood. Avoid promising permanent hardware identity across reinstall/reset. Store-backed paid accounts need a durable authenticated identity plan before purchase launch; an unverified number must not let someone take over another wallet.

## Sound and tactile feedback
Buttons and actionable controls give a light haptic, with distinct success/error patterns where appropriate and a user setting. No vibration for passive updates or each animation frame.

Calling cadence is a table setting from 3 to 10 seconds. At short intervals use concise full-number clips; never overlap long digit-by-digit audio or queue announcements that drift behind live state. Preload the next clip, serialize playback, recover the media session and provide visible Replay/sound-state controls. Host/server number calls continue independently of one device's audio failure.

The reported audio dropout and hardware-volume behaviour need an actual native fix. Mockups do not validate it. Required device checks: prolonged offline and online runs, iOS/Android interruptions, lock/unlock, mute/unmute, Bluetooth/route changes, reconnect and 3-second cadence. Verify physical buttons adjust active game media volume between calls.

## Implementation sequence after design approval
1. Freeze visual tokens and reusable buttons, dialogs, avatar rows, drawers and paper-ticket geometry. Preserve the approved offline caller layout.
2. Migrate round lifecycle and shared types: private-only, 3–10 cadence, manual/scheduled start, spectator host, cancellation and co-host ownership.
3. Implement atomic wallet ledger/reservations/refunds and authenticated account binding; add store sandbox purchase verification before exposing Buy coins.
4. Replace manual review with authoritative claim checking and failure recovery; persist every event, result and host change.
5. Implement tight ticket strips, optimistic mark sync, stable Full house actions, ranked players and Board/History overlays.
6. Add haptics, personal mark colour, reduced motion and accessibility. Diagnose/fix native audio and volume routing.
7. Test multiplayer race conditions and long native sessions, compare real screenshots with approved concepts, then build/release.

## Review caveats
These are concept images, not screenshots of working functionality. Tiny labels, decorative tickets and some generated number-board details may need deterministic correction in implementation. The exact rules above supersede illustrative number content. Do not use image-generated ticket numbers as playable tickets. No app source or backend deployment is changed by this design pack.

Decisions still to confirm with the visual direction: actual coin packs/prices and initial grant; minimum funded player count; invalid-claim/tie policy; aborted-round refund policy; durable paid-wallet login.
