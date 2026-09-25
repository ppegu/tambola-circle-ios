# UI alignment — Tambola Circle 1.1.1

**Later correction (1.1.2):** the offline caller follows the user-supplied Photo 2 original, with white background, cyan grid, red called cells, and original purple/wood control artwork. iPhone manual phone entry and startup device recording also supersede the original no-input iOS design. Online visual styling remains as documented below.

The approved source of truth is the nine v2 boards in `images/` and `SCREEN_SPEC.md`.

This update replaces the simplified implementation with the approved plum, ivory and gold visual system. It includes the friends-circle home and launcher logo, ticket illustration, shared vector icons, gold/outlined actions, illustrated setup/join/invite banners, paper ticket panels, circled marks, compact live rails and side drawers, avatars, readiness badges, timed reviews, evidence selection, and dedicated table/host controls. Decorative banners reuse the approved artwork; all tickets, table codes, names, counts, timers, marks and results remain native, live data.

Screen coverage:

| Boards | Implementation |
| --- | --- |
| 01 Entry and SIM | HomeScreen; OnlineEntry (online, registration, unsupported) |
| 02 Tables and lobby | OnlineEntry (create, automatic code preview); TableManagement (invite); TableScreen (lobby) |
| 03 Ticket strips | TableScreen full-screen chooser and ready-member viewer, half/full segments, expiry notice |
| 04 Immersive play | TableScreen current call, left call history, right player drawer, peer live viewer |
| 05 Reviews and proof | Per-ticket declare sheet; ReviewScreen frozen ticket, cell evidence, proof review |
| 06 Host controls | ReviewScreen final decision; TableManagement ownership, co-host and acting-host controls |
| 07 Results and rejoin | TableScreen results, spectator/reconnecting notices; OnlineEntry ongoing/history |
| 08 Ownership and history | TableManagement reclaim, members, timeline/tickets; OnlineEntry profile |
| 09 Details and next round | Member detail sheet; timing settings; no-winner result; next-round lobby |

The approved boards contain illustrative names, numbers and SIM rows. Production continues to use only real table data and the native device number picker. Unsupported devices display the designed fallback. Decorative art does not supply game tickets. The app does not imitate device frames or bake screenshots into interactive screens.

The offline caller retains its tested fixed, non-scrolling layout and now uses the same icons and menu styling. The media session and bundled voice packs are unchanged.

## Reproducible local review

Dot-source `scripts/use-d-drive.ps1`, then run `node scripts/export-ui-preview.mjs` and serve `artifacts/ui-preview`. The export script temporarily selects `scripts/ui-preview.tsx` and restores `index.ts` in a `finally` block. The release entry imports only `App.tsx`. The isolated preview uses deterministic fixtures and never signs into or modifies a production table.

Preview query examples: `?screen=home`, `online`, `registration`, `lobby`, `live`, `claim`, `proof`, `host`, `invite`, `settings`, `members`, `cohost`, `transfer`, `finished`, `timeout`, `directory`, `profile`, `history`, `reconnecting`, `acting`, `reclaim`, `next`, `offline`. Use the actual buttons for create/join, half/full, drawer, member, declaration and proof-composition states. `width` and `height` parameters support compact-phone review.

Validation: app/server TypeScript, 48 existing game/audio/layout tests, and 134 local multiplayer API checks covering WebSocket synchronization, role permissions, deadlines, idempotency, durable history and reconnect. Real-component browser inspection covered 390×844; the fixed offline caller was also checked at 320×568 and 320×480.

The review gallery in `artifacts/ui-review/index.html` contains 39 application captures and all nine approved reference boards. Its portable release attachment is `tambola-circle-1.1.1-ui-preview.zip`. Screenshots use sample data and are actual component renders, not generated mockups. Visual checks in a browser do not replace physical-device validation of SIM selection, system bars, or media-volume behavior.

Native release source: `2904f9b447018b1f89022f92e5d407d9b16bee88`. The iOS archive was built by [run 35679110013](https://github.com/ppegu/trust-tambola/actions/runs/35679110013), then verified again after downloading to D:. The check confirmed an unsigned arm64 iPhoneOS app, standalone JavaScript, version 1.1.1, preserved executable permissions, and all 342 bundled voice clips. [iOS release and installation steps](https://github.com/ppegu/trust-tambola/releases/tag/ios-v1.1.1).

The signed Android build passed [run 35679107805](https://github.com/ppegu/trust-tambola/actions/runs/35679107805). The downloaded APK checksum matches CI, and the verification records confirm package `com.ppegu.tambola`, version 1.1.1/code 4 and the existing release certificate. [Android release and screen-gallery download](https://github.com/ppegu/trust-tambola/releases/tag/v1.1.1).

| Artifact | SHA-256 |
| --- | --- |
| Android APK | `b23dbc0ea8e87267f309fc8530b37708f5ddd341d30f38e5d2e577a76595aaea` |
| Unsigned iOS IPA | `381852135f810763373b6e0c6e22567723d2d5e6323e176d7113a92a45b62708` |
