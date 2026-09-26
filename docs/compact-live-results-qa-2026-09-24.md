# Compact live controls and round results

## Changes

- Captain quick speeds share one 36 dp row with called/left counts. This replaces the 44 dp speed row, 4 dp gap and 25 dp progress row, returning 37 dp to tickets/the watching board. Quick speeds remain 4s, 5s and 7s; custom table speeds remain visible. The offline control is unchanged.
- Winners see “You won!” and “Congratulations!”. Other round participants see “Better luck next time!”. Spectators see a neutral full-house announcement. New copy is bundled in English, Assamese and Hindi.
- Results identify the winner and display the frozen winning ticket, expanded called-number board, then the viewer's ticket options. The board's history icon opens the existing native numbers view. Ended/cancelled reasons and refunds remain distinct from wins.
- The v4 guide records these overrides; existing mockups remain intact.

## Validation

- App and Worker TypeScript checks passed; 160 Vitest tests and three native configuration checks passed.
- Connected OPPO CPH1945, Android 11, 360 dp width, development app through Metro and isolated local API. Only fictional QA accounts were used.
- Tapped 7s and 4s in the compact live selector and confirmed the corresponding server values. A custom 3s setting was also visible. The watching board and bottom controls fit the screen.
- The local server ran a real round to 75 calls. A scripted QA player marked only called cells, declared a completed ticket and received a verified full house. Saved evidence: `artifacts/android-qa/compact-result-server.json`.
- Captured the real spectator result, then temporarily changed only the in-memory viewer of that same accepted result to inspect winner and other-player layouts. No saved identity, credentials, result or server state was changed. Restored the Captain view afterward. The other-player ticket option opened that player's three tickets; the board history icon opened the native numbers view.
- Screenshots: `compact-live-speed.png`, `compact-live-custom-speed.png`, `compact-result-watcher.png`, `compact-result-winner.png`, `compact-result-other-player.png`, under ignored `artifacts/android-qa/`.
- A 320 dp device-size override was denied by Android's secure-settings permission. The display stayed at its original size; no 320 dp native test is claimed. iOS runtime was not tested.

## Build policy

Both native workflows now run automatically only on a published `v*` GitHub release. Manual dispatches must target a `v*` tag. Branch pushes and bare tag pushes do not build; there is one automatic event rather than duplicate tag/release builds. iOS attaches its IPA to the requested release and no longer creates an `ios-main-*` release per commit. Existing assets are not overwritten.

Parsed both YAML files and checked their event sets, published-release filter and tag-only job guards. No workflow was dispatched to test this policy, so validation consumed no build runners. See [GitHub's release event documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release).

No new APK or backend deployment is part of this UI change. The connected Metro app has the updates.
