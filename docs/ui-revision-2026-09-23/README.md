# Approved host controls and wallet

These images are consolidated in [Design v4](../../design-v4/index.html). The [v4 guide](../../design-v4/DESIGN_GUIDE.md) records later simplifications, including merged Table settings, player actions in details and removal of duplicate history buttons. The implementation notes below describe the original pass.

Approved by the user on 23 September 2026: “Oka approved the both designs continue”.

- `host-controls.png`: Table, People and Your seat groups; separate Back to game and End round actions.
- `wallet.png`: available balance, reserved entries, Top up, recent transactions and history.
- `transactions.png`: date groups, All / Top-ups / Entries / Refunds, signed amounts and status.

These are design references, not app backgrounds. Their illustrative names, dates and balances are replaced with authenticated API data. The phone implementation uses the existing approved artwork and Fredoka typefaces. Additional host actions are under More options so the main controls fit the tested 360dp Android screen. Selecting a seat is available in the lobby; joining an already running roster remains prohibited.

## Implementation and validation

- `HostControls.tsx` reuses existing invite, settings, co-host, transfer, player management, schedule, leave and end commands. Ending still requires the explicit refund confirmation.
- `WalletScreen.tsx` is the entry from Home and coin indicators, with Top up opening the backend-driven test shop. Android Back returns through the nested wallet pages.
- `/v2/wallet/transactions` is authenticated, filtered and cursor-paginated. It displays balance movements once: consuming an entry updates its status rather than adding a second debit. SQLite tests verify pagination ties, refunds, account isolation and invalid queries.
- Artwork is packaged with `node scripts/prepare-game-art.mjs` into 30 small native images (15 avatars, nine icons, three coin piles, logo, hero and hub banner). Release builds bundle these static resources. Metro development serves them over the development connection.
- Gradients, paper decoration and ticket grids no longer use a JS layout-measurement pass. An experimental native gradient path crashed Android 11 during filter changes and was replaced before completion with the existing SVG renderer using percentage geometry and memoized paint.
- Ticket cells are memoized. Immediate toggles use the latest pending mark, and decorative stars cannot intercept touches. Six native taps across the three rows persisted exactly the expected two marked numbers.
- Duplicate My tables routing and the Home button are removed. Play online retains the ongoing cards and separate history.
- Finished rounds share the winner layout, with actual reason, called/remaining counts, entry/refund status and the current called-board overlay.

Android QA: OPPO CPH1945, Android 11, Metro on 8081 and an isolated local Worker on 8791. Only fictional QA identities were used. Wallet test purchase: 1,060 → 1,160 (+100). Round 3 then reserved/used 60 and returned it on host termination; the peer's 110 was also returned. All 15 avatars were visible; avatars 7 and 15 were selected successfully, then the QA avatar was restored.

Evidence is under `artifacts/android-qa/`: `host-controls-fit.png`, `wallet-refunds-native.png`, `wallet-refund-detail-verified.png`, `wallet-back-navigation-verified.png`, `optimized-live-ticket.png`, `rapid-marks-verified.png`, `round-ended-redesign.png`, `ended-round-called-board.png`, `optimized-avatar-gallery.png`, `avatar-seven-selected.png`, `avatar-fifteen-selected.png`.

Final checks also cover Wallet and transaction pull-to-refresh (`wallet-entry-history-final.png`), the compact registration form with both actions visible (`registration-fit-final.png`), and host round-history pull-to-refresh (`host-history-pull-final.png`). A fresh runtime showed no gradient warnings. The local server and Metro remain available for review; no production deployment or new APK was made in this pass.

Checks: app/server TypeScript; 105 tests in 16 Vitest files; two native configuration tests; nine SQLite coin-ledger tests. This pass does not claim a release-build startup/frame-rate benchmark or physical iPhone verification. Real payments, ads and voice chat remain TODO.
