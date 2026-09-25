# Tambola Circle — rules and timers
Final design handoff · 21 September 2026 · Version 2

This document supersedes v1. Latest user requirements take precedence: the default is **120 seconds**, replacing the earlier 60-second proposal. All deadlines and state transitions belong to the server.

## Tickets and readiness

- **Half:** three panels. **Full:** six panels. One panel is a 3-row × 9-column Tambola ticket with 15 numbers, five numbers per row, and 12 blanks.
- Finalization choice: generate a valid full strip containing 1–90 exactly once, then use three panels from that strip for Half. Full-house claims apply to **one 15-number panel**, selected by its own Win button.
- Players may select either strip size. Full provides more panels and therefore more chances; disclose this in selection. This is a friends-and-family game without money or prizes managed by the app.
- The server generates candidates, records candidate versions, and owns the selected strip. Regenerating replaces the complete candidate strip; clients cannot supply their own numbers. Regeneration stops on ready, on deadline, or on round start.
- Joining a lobby starts that member's ready deadline. Opening the chooser, leaving, reconnecting, and reinstalling the UI do not extend it. Existing membership and session determine whether a return is a rejoin.
- Selecting a strip does not mark the player ready. The player must explicitly select **I'm ready**. Ready locks the selection. Before round start, the player can explicitly become unready and change tickets only within the original deadline.
- Finalization choice: a player who misses the deadline watches the current round. Never auto-ready a player. Start atomically when all remaining eligible participants are ready, with at least two ready players.
- If fewer than two remain, show “Waiting for another ready player.” No live round exists yet, so no number generation is paused indefinitely. The host can open a fresh attempt; every member receives a new disclosed deadline. No hidden timer extension.
- Joins committed before the start transaction join the ready cohort. Joins committed after it are spectators until the next round. Prevent join-spam from extending a ready cohort indefinitely by locking new active seats once all existing eligible members are ready.
- In the lobby show all members and their individual status/time. Own strip stays hidden behind **My tickets**. Ready members' strips can be opened read-only.
- At next round, create new selections and a new readiness attempt. Previous tickets and marks remain in history.

## Configurable timing contract

| Setting | Default | Applies to | At expiry |
|---|---:|---|---|
| readyWindowSeconds | 120 | Each member's current lobby/next-round selection attempt | Unready member becomes spectator for that round |
| reviewWindowSeconds | 120 | Full-house review | Each unanswered eligible vote becomes approved_by_timeout |
| reviewWindowSeconds | 120 | Shared-proof review | Each unanswered eligible vote becomes proof_accepted_by_timeout |
| reviewWindowSeconds | 120 | Final host decision, as a bounded finalization choice | End the round without a winner if no effective host decides |
| callIntervalSeconds | 8 | Live server caller; host-configurable | Generate the next previously uncalled number |
| hostOfflineGraceSeconds | 15 | Server presence lease; operational default | Connected appointed co-host becomes acting host |

Ready and review times are separate table settings. Claim and proof review share one setting. Suggested v1 implementation bounds are 30–600 whole seconds for ready/review and 3–30 seconds for calls; these bounds are product defaults chosen for this handoff.

Snapshot table configuration onto each round/ready attempt. A settings edit applies to future attempts/rounds, never silently extends or shortens an active countdown. Host transfer, takeover, rejoin and device time changes do not reset deadlines. The current host cannot bypass a ready requirement or secretly change a review result.

Every timed UI shows a labelled **MM:SS remaining**. The server supplies serverNow, startedAt and deadlineAt. The client estimates the server clock offset, uses a monotonic local countdown, refreshes after app foreground, and treats 00:00 as “Resolving…” until the authoritative event arrives. Accessibility announcements occur at useful thresholds, not every second.

## Live marking and claims

The current called number remains pinned above the strip. Tap a nonblank number to toggle one automatic circle. There is no pen, eraser, color selector, freehand canvas, or automatic marking of all called numbers.

Permit a player to circle an uncalled number: the social cross-checking and false-claim flow depends on this. The server still records what was called and what was marked. Marks belong to a panel/cell, not a bitmap. Other members see accepted mark/unmark events in real time. A member never changes somebody else's ticket.

The per-panel **Win** action opens “Declare full house?” with panel identity and review duration. Declaration may be attempted at any time while the player is eligible. The server validates ownership and state, freezes the panel and its marks with the precise called-number sequence, and pauses calling atomically. The authoritative snapshot prevents correcting evidence after a claim.

Only one claim review runs at once. The first declaration accepted by the table server owns the review; competing commands receive “A claim is being reviewed” and may retry after a rejected claim. There is no retroactive second winner after the round finishes.

## Claim → proof → host

1. **Claim review:** every other nonremoved player in the frozen round roster reviews the claimed panel, including a player who has become a spectator after an earlier rejected claim. Offline reviewers remain in the roster and receive timeout votes. New spectators joining midround can watch but do not vote.
2. Reviewers choose **Approve** or **Challenge**. Challenge opens the evidence selector; merely opening it does not pause the claim deadline. A challenge counts only after valid evidence is submitted before that deadline.
3. If all reviewers explicitly approve, the claim can pass early. Otherwise, at the exact deadline unanswered votes become approvals and an unchallenged claim passes. Store whether acceptance came from explicit votes or expiry. Do not describe an automatic approval as human verification.
4. **Shared proof:** the first valid submitted proof advances to a new proof-review phase with a full reviewWindowSeconds. Freeze the same claim snapshot. Evidence contains selected cell IDs and/or a normalized selection rectangle plus reason and optional short text; no arbitrary editable screenshot replaces the original.
5. All other roster members, **including the claimant**, review the proof; the challenger is recorded as agreeing with their submitted proof. All viewers see the same proof and supporting call history. Further evidence can be added within the existing deadline, but cannot create new review windows.
6. **Agree with proof** means reject the claim. If every required reviewer agrees, reject early. At proof expiry, unanswered votes become proof approvals. If no explicit disagreement exists, uphold the proof and reject the claim.
7. Any explicit **Disagree → Host**, including the claimant's disagreement, moves immediately to the final host decision phase. No recursive peer review or appeal starts. Remaining proof votes are no longer necessary.
8. The effective host reviews the frozen panel, selected evidence, call list and votes, then chooses **Accept claim** or **Uphold challenge**. This is the final social decision for that round. Record the decision, actor, authority epoch and supporting server facts. If a host accepts despite a mismatch, retain that distinction in the log; do not silently replace the user's agreed host-final rule with an automatic validator.
9. The host-decision timer uses the table's review duration. A host/co-host change keeps the original deadline. If no effective host decides by expiry, close the round **without a winner**, record decision_timeout, and return to the next-round lobby.
10. A rejected claimant cannot mark, declare again, regenerate or re-enter as an active player in that round. They may watch tickets/calls and review subsequent claims under the frozen roster rule. Resume calling from the remaining unique number pool. They may play the next round.

A malformed or out-of-bounds proof is rejected before publication. A plausible but incorrect proof is a social dispute, handled by the flow above. Server facts (for example, “83 not called at sequence 28”) accompany the proof; neither a malicious client nor a freehand circle defines the call history.

Finalization choice for conflicts of interest: if the effective host is the claimant or challenger, offer the appointed connected co-host the final decision with the remaining time. If no independent co-host is available, keep the agreed effective-host-final rule and visibly label the conflict; timeout still ends the round. Do not invent a public voting system or an endless host election.

Maximum time for one claim is three configured review windows: at the default, at most six minutes from claim through proof to final decision. Opening sheets, posting evidence, returning from offline, or switching hosts cannot extend this bound. A rejected claimant loses further declarations that round, limiting serial disruption. When the 90th number is called, open one final review-duration claim opportunity; if none is accepted, close without a winner. Number exhaustion never leaves an endless live round.

## Host ownership and availability

Permanent **ownerId**, effective **hostId**, appointed **coHostId**, and a monotonically increasing **authorityEpoch** are distinct fields.

- The current owner can transfer ownership to a connected table member with explicit confirmation. The server commits the transfer once, invalidates old administrative commands, and broadcasts the new owner/host. The old owner can leave and cannot later “reclaim” ownership.
- The owner can appoint or replace one co-host from connected members. The co-host is visibly identified in the lobby.
- After the owner's server presence lease expires, the appointed connected co-host becomes temporary acting host. Calling continues on the server. A review remains paused for its intentional review window, not because the owner disconnected.
- Acting-host powers include resolving disputes, removing members, controlling invites and changing future-round table settings. Permanent ownership transfer and replacement of the owner remain owner powers, preventing temporary takeover from silently stealing the table.
- When the owner reconnects, the acting host remains effective until the owner explicitly selects **Reclaim host**. That atomic event restores effective control and the co-host designation. Decisions already finalized by the acting host stand.
- Reject stale role commands using authorityEpoch. No two clients can simultaneously exercise effective-host powers.
- If neither host nor co-host is available, ordinary calling continues. A later host decision still has a finite deadline and the no-winner fallback. No new owner is silently elected.
- Leaving a table does not erase participation history. Offer transfer before a permanent owner departs; a disconnected owner retains ownership until explicit transfer or table closure. Kicking revokes access/rejoin rights and is recorded with actor/reason. It does not erase evidence or votes already cast.
- A kick during an active review must not silently shrink the electorate or erase a challenge. Keep the frozen votes and evidence; unresolved votes still follow the same timeout rule at the original deadline, with the removal recorded. Defer nonurgent member removals until the current review ends so the host cannot suppress a reviewer's access to proof. Urgent removal needs a recorded reason and remains visible to the table.

## Server time and race handling

Serialize each table's commands in a single authoritative coordinator. Before processing a command, resolve all due deadlines at the server's current time. A command arriving at or after its phase deadline cannot be backdated by a client timestamp. Persist the winning transition before acknowledgement/broadcast.

Draw and declaration racing at the same time have one total order: a draw committed first belongs in the frozen call list; a claim committed first prevents that draw. Late votes, duplicate claims, expired old ready commands and stale host actions receive the current snapshot and a specific rejection reason.

Durable alarms may be delayed or retried. Logical deadlines remain exact; no distributed system promises delivery to every phone at the exact millisecond. Idempotent alarm handling and resolve-due-on-command/reconnect produce one consistent outcome.
