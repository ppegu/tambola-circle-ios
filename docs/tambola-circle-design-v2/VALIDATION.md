# Validation record

Tambola Circle v2 · 21 September 2026

## What was checked

- Nine final image boards were visually inspected through the built-in image-generation outputs. The gallery contains 36 numbered screen concepts.
- Corrected the live board to remove claim actions from other players' tickets and use compact **Win** buttons on own panels.
- Corrected the results board to use large scrollable cards, moved spectator calls/players into side handles, and removed contradictory “waiting for next call” copy during a paused review.
- Defaults, timer labels, ready-timeout spectator behavior, automatic review approvals, host final decision, permanent transfer, co-host takeover/reclaim, supported SIM selection and unavailable-device state are represented.
- The full strip fixture is independently checked for 3×9 panels, five numbers per row, 15 per panel, number/column validity, ascending columns and coverage of 1–90 exactly once.
- JSON parsing, PNG headers/dimensions, local gallery links, 36 unique screen IDs, JavaScript syntax, and repository citation file targets are checked by [validate-artifacts.cjs](validate-artifacts.cjs).
- Existing v1 README and gallery explicitly link to this superseding version. The new handoff contains no freehand-marking or recovery-code feature.

## Scope and limits

Images are generated visual concepts, not application screenshots. Rasterized sample grids, member counts, incidental copy and decorative marks can vary; implement the exact data/behavior in SCREEN_SPEC, RULES_AND_TIMERS and the validated ticket fixture. For example, production review labels use the actual claimed player's name and roster, and all saved badges require acknowledgement.

Some PNGs contain a transparent backdrop. The gallery supplies an opaque pale-lilac background, preserving title contrast. Individual-screen views crop the unchanged original images with CSS.

Browser policy blocked local-file access during the earlier gallery preview attempt. No alternate proxy/browser bypass was attempted. The v2 gallery is statically checked; browser interactions and device layout are **not runtime-verified** here.

Native Android/iOS SIM selection and immersive-bar handling still require real-device feasibility tests. Current platform documentation supports only the scoped feasibility conclusions in PHONE_FEASIBILITY; this handoff does not assert a universal SIM picker or verified phone ownership.

Production code was not changed. No multiplayer server was deployed, no schema was migrated, and the production acceptance tests in IMPLEMENTATION_PLAN have not been run for an implementation that does not yet exist.

## Reproduce artifact checks

From the repository root:

```powershell
node docs/tambola-circle-design-v2/validate-artifacts.cjs
```

This verifier checks design-package integrity, not gameplay implementation.
