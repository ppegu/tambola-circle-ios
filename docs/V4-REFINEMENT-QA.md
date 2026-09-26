# V4 visual and native modal QA — 24 September 2026

Physical device: OPPO CPH1945, Android 11, 1080×2340. Development app used Metro on port 8081 and the isolated local Worker on port 8791. The new `QA Avatars` table and two fictional scripted players were used; existing personal tables were not changed.

Verified on the phone:

- Pause dialog: curved gold title, three icon medallions, glossy buttons, cloth detail and stars.
- Online hub: shared button finish and bundled table avatars.
- All 20 table avatars rendered. Creation saved Tea club; the host changed it to Champions. A second authenticated local player received avatar ID 14 from the server.
- Creation: centered large editable avatar, no duplicate Create table / Private heading. Avatar picker: large selected preview, scrollable grid and fixed confirmation action.
- Reproduced a blank inactive seat control. Repeated Play too / Watch & host switching passed after keeping elevation, border geometry and native children stable and disabling clipping on form ScrollViews. Host starts / Schedule also switched successfully.
- Lobby: gold gear visible, framed roster, ready/watching counts and fixed footer. Host play/watch switching preserved both option surfaces.
- Live caller: one volume percentage badge; native slider changed 100% to 60%. Calls continued. The previous call appeared inside Numbers; current call and called/left strip updated.
- Native Numbers modal: 90-number board, board/history switching, outside-tap dismissal back to the same round.
- Native Players modal: retained the game behind the panel; peer marks updated the rank/progress display while open.

Local captures are in `artifacts/android-qa/`: `v4-pause-polish.png`, `v4-hub-polish.png`, `v4-avatar-large-preview.png`, `v4-switch-fixed.png`, `v4-lobby-final.png`, `v4-live-host-current.png`, `v4-live-volume.png`, `v4-native-numbers.png`, `v4-native-players.png`. These are implementation captures, not replacements for approved reference images. Some development captures include a warning overlay; the invalid SVG decimal-string warning was corrected afterward.

Automated checks: app/server TypeScript, 138 Vitest tests and two native configuration checks passed. Avatar tests cover range validation, host/authority checks, legacy defaults, listing persistence and preservation of live round/coin state. Modal tests cover dismissal, retry and duplicate taps.

Signed release 1.5.0/build 10 also installed over the existing production build 8 without clearing app data. Language selection, offline calling, the pause dialog, Home return and the App Updates version screen passed. Captures: `release-150-pause.png`, `release-150-updates.png`. The phone was returned to the Metro development app.

This is functional and visual Android QA, not a frame-rate benchmark or an iOS device test. Signed release and public download verification are recorded in `RELEASE-1.5.0.md`.
