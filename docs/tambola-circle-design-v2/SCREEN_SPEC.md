# Tambola Circle — screen and interaction specification

Final design handoff · 36 screen concepts · 9 boards · Version 2

Use [review.html](review.html) for board and individual-screen inspection. Generated images establish layout and visual direction; this written contract and the validated [ticket fixture](ticket-fixture.json) define exact behavior/data. Sample people, copy, timer values and rasterized grid digits in images are illustrative, not production ticket records.

## Visual and layout system

- Name: **Tambola Circle**. Tagline: **Your people. Your game.**
- Deep plum #290435, violet #76207d, warm gold #efd080, ivory #fffaf2, dark ink. Consistent sans-serif typography; gold primary actions, restrained illustrations on entry/invite screens.
- Primary live viewport: compact latest-call header; tall vertical ticket scroll area. Call history/previous numbers are on the **left**, player avatars/list on the **right**. Both expand as overlays. Closed is the default.
- Prefer edge handles in the header zone to permanently narrowing the ticket grid. The latest call remains visible while either side overlay is open; one overlay at a time.
- No persistent bottom app navigation during live play. Hide Android status/navigation bars on immersive game/ticket surfaces; system gestures can transiently reveal them.
- Every ticket view uses the same full-width, naturally sized card. Half has three cards; Full has six. Scroll rather than fit the whole strip into a thumbnail. Review/host surfaces can expand a claimed panel for evidence and continue vertically into the rest of the strip.
- Grids remain 3×9. Number labels stay legible inside circles. Tap targets, semantic number labels, selected state, color-independent evidence outlines and screen-reader navigation are required.
- Each own live ticket has a compact **Win** action aligned with its heading. The confirmation names **Full house** and the exact panel. Other players' tickets, snapshots, history and spectator tickets have no Win action.
- Tap a numbered cell to circle/uncircle; no manual brush, pen, eraser, color palette or drawing settings.
- Proof selection is an evidence rectangle/cell selector on a frozen ticket, not a general drawing tool.
- Read-only ticket viewers preserve the latest call and show Live marks / Last synced / Frozen at claim as appropriate. Ticket number and player name remain unambiguous.
- All countdowns have a purpose label and MM:SS. Timer state must not depend only on red/green. 00:00 resolves via server state, not a local vote.

## Screen inventory

|   # | Screen                      | Required behavior                                                                                                                                                                                   |
| --: | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  01 | Home                        | Tambola Circle, prominent Play online, Offline caller, My tables, Settings, Account. Offline caller remains available without online sign-in.                                                       |
|  02 | Online mode                 | Private table selected; Public disabled “Coming soon.” Create/join entry, ongoing-table rejoin and history. Gate protected actions through supported device sign-in.                                |
|  03 | Select your SIM             | Name field, native SIM-number selection/result, read-only mobile value, disclosure about table-member visibility. No typed mobile field or verified-phone claim.                                    |
|  04 | SIM selection unavailable   | Honest unavailable message, Retry and Offline caller. Retain pending invite. No manual-number or recovery fallback.                                                                                 |
|  05 | Create a table              | Name, Private/Public disabled choice, ready time 02:00, review time 02:00, call interval 8 seconds, Half/Full player choice; optional co-host chosen in lobby.                                      |
|  06 | Invite your circle          | Short table code, copy/share link, system share sheet and lobby action. Code is a table invitation, not a phone-verification OTP.                                                                   |
|  07 | Join a table                | Enter table code or resolve link; preview name/host/members/settings. Sign in before membership access. Explain personal ready timer starts on joining.                                             |
|  08 | Timed lobby                 | Every member, role, ready state and time left. My tickets opens chooser. Own strip not displayed inline. Ready members' strip links enabled; choosing members' drafts hidden.                       |
|  09 | Half selection              | Half·3 / Full·6 segmented selection, personal countdown, three large cards, Regenerate and Use half ticket. Choosing a strip does not itself click ready.                                           |
|  10 | Full selection              | Six cards in a vertical scroll viewport; only those fitting naturally are visible. Regenerate/use actions and countdown remain accessible. Explain more panels means more chances.                  |
|  11 | Ready player's strip        | Read-only selected strip; player, ready status, target round and Half/Full label. No regeneration, marking or claim action.                                                                         |
|  12 | Ready window ended          | 00:00, watching status for unready member, view tickets/watch action; ready cohort starts if minimum count met. Otherwise show waiting-lobby variant.                                               |
|  13 | Live · panels closed        | Latest call pinned; prior calls left, avatars right; own strip fills remaining height. Per-panel Win and server-saved/pending indicators.                                                           |
|  14 | Calls expanded · left       | Overlay for newest-first call order and optional all-90 view. Clicking a call can emphasize it in own strip; never auto-circle it. Close restores scroll position.                                  |
|  15 | Players expanded · right    | Meeting-style roster with avatars, names, online state, owner/acting-host/co-host labels. Tap opens member details (33); view tickets opens 16.                                                     |
|  16 | Other player's live tickets | Large read-only strip synchronized to server events. Name, Full/Half and current call visible. Info action opens 33. No Win or editable cells.                                                      |
|  17 | Declare this ticket         | Full-house confirmation with panel identity and configured duration; Declare / Keep playing. Pauses caller only after server accepts the command.                                                   |
|  18 | Review full house           | Calling paused, claim timer, frozen claimed panel, scrollable strip context, explicit/remaining reviewer count. Approve / Challenge; timeout auto-approval copy.                                    |
|  19 | Share proof                 | Same claim deadline while composing; select cell/region, reason and short note. Context calls available. Share commits proof before expiry; no separate infinite compose period.                    |
|  20 | Review proof                | New proof deadline, same shared highlight and claim snapshot; Agree with proof / Disagree → Host. Unanswered votes agree at expiry.                                                                 |
|  21 | Host final decision         | Host timer, complete claim/proof/call context and expandable votes. Accept claim / Uphold challenge. Decision final; no decision at deadline ends without winner.                                   |
|  22 | Transfer host               | Choose a connected member, confirm permanent ownership transfer; owner can leave after server confirmation. Distinct from temporary co-host assignment.                                             |
|  23 | Choose a co-host            | Select one connected member. Explain temporary host powers on offline takeover and original owner's explicit reclaim. Owner retains permanent ownership.                                            |
|  24 | Temporary host takeover     | Offline owner notice; effective acting host badge; game continues; dispute, member-management and future-settings actions. No round reset.                                                          |
|  25 | Round result                | Winner and claimed panel, explicit vs timeout approval counts, tall scrollable ticket strip, Next round and round-log link. No fake “verified” label for timeout votes.                             |
|  26 | Rejected claim · watching   | Compact reason banner, continuing latest call, left/right handles and large read-only own strip. No further marks or declarations this round. Next round restores eligibility.                      |
|  27 | My tables & history         | Ongoing/history tabs. Rejoin same membership/round; completed rounds open recorded history. Saved status does not promise cross-device account recovery.                                            |
|  28 | Reconnecting                | Last synced call/strip read-only, clear connection notice and still-running phase timer. No stale offline claim/vote submission. Restore authoritative state and current role.                      |
|  29 | Owner returns               | Temporary acting-host identity, “You remain owner,” Reclaim host / Continue as player. Reclaim is explicit and does not restart timers.                                                             |
|  30 | Manage players              | Member state/actions; remove confirmation. Record actor/reason; revoke membership access without deleting history or frozen evidence.                                                               |
|  31 | Round log & replay          | Ordered, timestamped events, tickets tab, filters and final snapshots. Timeout votes, host rulings and transfers are distinguishable.                                                               |
|  32 | Saved player profile        | Read-only device-selected mobile, display name and “Signed in on this device.” Continue / ongoing tables / device support. No recovery-code UI.                                                     |
|  33 | Member details              | Avatar, name, role, online status and phone shared with table members; View live tickets. Only current authorized members can open it. Phone icon is informational, not an unrequested call action. |
|  34 | Table timing settings       | Host changes ready and shared review durations, call interval. Defaults 02:00/02:00/8s. Explain automatic approvals and future-round-only changes.                                                  |
|  35 | Decision time ended         | 00:00, no winner, reason and retained history. Next-round lobby / round log. No endless review screen.                                                                                              |
|  36 | Next-round lobby            | New round/attempt, fresh personal countdown and choices; all members and ready states, hidden own strip behind My tickets, explicit ready button.                                                   |

## Secondary variants sharing those screens

These use the same components and do not require separate visual systems:

- **Claimant waiting:** screen 18 in read-only claimant mode; no self-approval, but may inspect proof and disagree in screen 20.
- **Expired/wrong/revoked invite:** screen 07 inline error with retry/new-code entry; do not reveal membership or phone details before authorization.
- **No active table / empty history:** screen 27 empty state with Create/Join.
- **Settings errors:** screen 34 range validation; screen 05 duplicate/missing table-name validation.
- **No co-host available:** screen 24 indicates no acting host; server calling continues, screen 21 still has a bounded deadline.
- **Waiting for minimum players:** screen 12/lobby variant; no round has begun. Start a new readiness attempt explicitly.
- **Removal notice:** screen 30 action result for removed user returns to My tables with access revoked, leaving history subject to the access policy.
- **Network error in selection:** show pending/failed action; do not regenerate on the client or restart timer.
- **Expired session:** preserve table intent, restore the saved device credential when valid; otherwise use the supported identity flow. Do not invent recovery methods.
- **Historical ticket:** screen 16 renderer with Frozen history badge and no current live status.
- **Host/claimant conflict:** screen 21 offers a connected co-host to decide, with the same remaining deadline; otherwise clearly labels that the effective host is involved.

## Cross-screen rules

Live evidence is always an immutable server snapshot at claim time. Display “Frozen at claim” on all review variants, even if a conceptual image omits that microcopy. Never use a zoomed raster screenshot as the authoritative evidence.

Member names and participant counts in boards demonstrate separate states, not a single continuous match. Production counts must come from the same frozen electorate/roster as the review engine. Use “This player's other tickets” when reviewing another person's strip; do not copy illustrative first-person mockup wording into that state.

All “Saved” badges require server acknowledgement. A rejoining client shows “Last synced” until it has received the authoritative snapshot. Co-host capabilities are administrative only when granted by the server's effective-host state, not because a badge was rendered locally.

See [RULES_AND_TIMERS.md](RULES_AND_TIMERS.md) for expiry, round-start, review electorate, role transfer and race handling.
