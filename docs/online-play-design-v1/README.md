# Trust Tambola — online play design review v1

> **Superseded:** use the [Tambola Circle finalized v2 handoff](../tambola-circle-design-v2/README.md), [revised gallery](../tambola-circle-design-v2/review.html) and [implementation plan](../tambola-circle-design-v2/IMPLEMENTATION_PLAN.md). This v1 folder is historical; its name, drawing tools, registration/recovery flow, tickets and unresolved review rules are no longer the implementation baseline.

Prepared 21 September 2026. **Proposal for validation; design is not locked and multiplayer is not implemented.**

Open [the visual review gallery](review.html) to inspect **28 screen concepts across seven image boards**. Each board opens at its original resolution. The screens use the existing app's plum, gold, lotus and Tambola identity.

- [Screen flows, behavior and open decisions](SCREEN_SPEC.md)
- [Repository findings and implementation plan](IMPLEMENTATION_PLAN.md)
- [Mobile-number feasibility](PHONE_VERIFICATION.md)
- [Exact image prompts and revision prompts](prompts.json)

| Board                 | Screens                                                      | Image                                                |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| 01 — Get together     | 01–04: home, modes, registration, create table               | [Open PNG](images/01-entry-and-registration.png)     |
| 02 — Find your seat   | 05–08: join, invite, ticket choice, lobby                    | [Open PNG](images/02-invites-tickets-lobby.png)      |
| 03 — Play together    | 09–12: live game, drawing, players, live ticket              | [Open PNG](images/03-live-game-and-drawing.png)      |
| 04 — Claims and proof | 13–16: declaration, review, proof selection, evidence review | [Open PNG](images/04-claims-and-proof.png)           |
| 05 — Outcomes         | 17–20: winner, spectator, reconnect, next round              | [Open PNG](images/05-results-and-reconnection.png)   |
| 06 — Account states   | 21–24: saved sign-in, recovery, restore, expired invite      | [Open PNG](images/06-account-and-invite-states.png)  |
| 07 — Controls         | 25–28: number board, table controls, claim pending, leave    | [Open PNG](images/07-controls-and-review-status.png) |

## Review priorities

1. Visual direction: familiar plum and gold, light paper tickets, visible participants.
2. Identity: device sign-in with a **self-declared** phone number, or online carrier verification without SMS. Local SIM retrieval does not establish trustworthy ownership.
3. Claims: everyone else reviews; a challenge must carry evidence. Decide the rule for disagreement or absent reviewers.
4. Confirm full house as the first winning pattern, phone sharing with private-table members, and proposed table size/call interval.

Images were generated with the **built-in image generation tool**, then visually inspected; boards 02 and 04 received targeted corrections. They are concept art, not exact production layouts or deterministic test fixtures. Decorative taglines, system chrome, sample ticket values and called-number counts are illustrative. The screen specification governs behavior and copy. Winner and rejected-claim screens show alternative outcomes.

This work adds design artifacts only. Existing uncommitted app, artwork and voice changes were preserved.
