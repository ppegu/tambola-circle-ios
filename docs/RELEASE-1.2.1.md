# Tambola Circle 1.2.1

This update repairs native Android card fills and brings the game screens back into usable phone proportions while retaining the approved artwork, glossy buttons, and purple/gold theme.

- The home screen uses a fixed layout with visible footer actions. Online pages have compact headers, buttons, table rows, and ticket strips.
- Create-table settings have separate cards for the name, ticket costs, and a 3–10 second call slider. Private tables remain the only mode.
- Coin offers come from the authenticated backend catalog. Purchases use a plan ID and an idempotent receipt; the database determines the amount and credits it atomically. Real payments, ads, and the catalog admin panel remain future work.
- All 90 female calls were rebuilt with a consistent voice speed. Two-digit calls say the individual digits, pause for 500 milliseconds, and then say the full number. Each clip occupies 2.8 seconds.
- Number-history close controls use an icon, and tickets retain manual marking and the stable full-house action.
- Registration uses name/mobile labels, a Terms & Privacy screen, and a Play as guest action. Invalid or missing header balances display zero.
- The guest caller has a fixed layout, a red Play/Pause button beneath the current number, a styled previous-number badge, and a board that fills the remaining space.
- Lobby settings sit behind an icon. Watching hosts choose to play explicitly; ticket selection uses compact illustrated Half/Full controls, paper strips, and a fixed footer.
- Live play has compact called/remaining counters and expandable board, history, and ranked-player drawers. Game preferences include mark colours, effects, haptics, larger numbers, and native voice volume.

Migration `0007_coin_catalog.sql` adds the catalog and purchase receipts without changing existing balances, holds, memberships, or game history. The API continues accepting the previous app's amount-based test purchases only when they match a single active backend offer.

## Validation

The app/server type checks, 60 unit tests, 2 native configuration checks, 9 SQLite coin tests, and 139 local multiplayer API/WebSocket checks passed. Voice validation covers all clip hashes, durations, and the exact silent gap. A local speech-recognition pass found no unexpected filler words.

Browser layout checks passed for a 320×568 home and 390×844 home, settings, coin shop, and live tickets. Real Android workflow results and limits are recorded in [ANDROID-QA-1.2.1.md](ANDROID-QA-1.2.1.md).

The separate `com.ppegu.tambola.dev` package allows Metro/local-backend testing without replacing the installed release or its data. Screenshots and temporary test artifacts stay under `D:\OnlineTam\artifacts\android-qa`.

No iOS device testing or new IPA build is included in this Windows verification pass.
