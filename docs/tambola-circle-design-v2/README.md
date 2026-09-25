# Tambola Circle — finalized design handoff
Version 2 · 21 September 2026
Implementation is now available in the working tree. See [implementation and validation status](../TAMBOLA-CIRCLE-IMPLEMENTATION.md); production deployment and a new app release are separate steps.
**36 screen concepts across nine image boards**, revised to the latest requirements. This is the current implementation/design baseline; the previous online-play-design-v1 folder is retained as superseded history.

Open the [visual gallery](review.html) to browse boards or inspect individual screens.

- [Implementation plan](IMPLEMENTATION_PLAN.md)
- [Rules, timers and host decisions](RULES_AND_TIMERS.md)
- [Screen-by-screen behavior](SCREEN_SPEC.md)
- [SIM-selection feasibility](PHONE_FEASIBILITY.md)
- [Validation and limitations](VALIDATION.md)
- [Exact image prompts and revisions](prompts.json)

## Final changes

Tambola Circle has private code/link tables, Half (3 panels) or Full (6 panels), a two-minute default ready period, and a tall scrolling ticket screen with tap-to-circle marking. The call stays prominent; number history is on the left and players on the right, closed until expanded. Each own panel has a compact Win action.

Claim and proof review each default to two minutes, configurable by the host through one review setting. Unanswered reviews approve on expiry. Disagreement goes directly to the effective host. Host decisions are final, with a bounded timer so no round remains stuck. The owner can transfer permanently, appoint a co-host for temporary offline takeover, and explicitly reclaim control after returning.

All accepted game actions/history are durable. A returning player restores the same round, ticket strip, marks and deadlines. Every device talks through the authoritative table server.

## Explicit finalization choices

- A full-house claim is for one 15-number panel. Full strips contain 1–90 once; Half selects three valid panels.
- Missing the ready deadline means watching that round, never automatic readiness.
- The final host decision uses the same review duration; no decision by expiry ends the round without a winner.
- Ordinary calling continues when the host disconnects. Co-host takeover does not reset review deadlines.
- Supported SIM selection is required for new online registration. It is labelled device-selected, not ownership-verified. Unsupported selection has no manual-number fallback.
- New-device/reinstall account restoration is deferred; there are no recovery codes.

## Boards

- [01 — Join your circle](images/01-entry-and-sim.png) · Screens 1–4
- [02 — Set the table](images/02-tables-and-lobby.png) · Screens 5–8
- [03 — Pick your tickets](images/03-ticket-strips.png) · Screens 9–12
- [04 — Ticket-first live play](images/04-immersive-play.png) · Screens 13–16
- [05 — Timed reviews](images/05-reviews-and-proof.png) · Screens 17–20
- [06 — Host controls](images/06-host-controls.png) · Screens 21–24
- [07 — Come back to your circle](images/07-results-and-rejoin.png) · Screens 25–28
- [08 — Ownership & history](images/08-ownership-and-history.png) · Screens 29–32
- [09 — Details & next round](images/09-details-and-next-round.png) · Screens 33–36

## Handoff scope

The images were made with the built-in image generator and visually inspected. They are design concepts, not running application screenshots. Exact ticket data and transitions are defined in the written spec and validated fixture. Small raster typography, decorative artwork and illustrative copy should be implemented using native text/components.

Repository study used Atlas. No application source was changed for this design handoff, and no production multiplayer tests are claimed as passed. Browser interaction testing of the local gallery was unavailable because the browser policy blocked local-file access; file/link/JavaScript/fixture checks are documented separately.
