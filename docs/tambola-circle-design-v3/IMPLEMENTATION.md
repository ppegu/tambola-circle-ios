# Tambola Circle v3 implementation checklist

The 20 approved phone concepts in `artifacts/design-v3-gameplay/screens` are the visual reference. Live ticket values must always come from the validated ticket generator, never from illustrative artwork.

## Screens and features

- [x] Home: illustrated crowned logo, velvet background, coin balance, Play online → My tables → Offline caller, Coins / How to play / Settings.
- [x] Online hub: create private table, join by code/link, resume tables, device profile.
- [x] Device number: Android native number picker, selected number shown in a disabled input with Change; iOS manual entry. Device UUID recorded before registration. Numbers remain explicitly unverified.
- [x] Join: six-digit table code, invite deep links, table preview, join or watch.
- [x] Table settings: private-only label; calls every 3–10 seconds; Half/Full fees; manual start by default; optional scheduled start.
- [x] Host lobby: roster, readiness, invite/code, co-host, ownership transfer, watching without paying, optional tickets, Start game, scheduled countdown, End round.
- [x] Player lobby: balance and fees, Your tickets game button, ready players' ticket previews, readiness, watch, scheduled countdown. No selection deadline.
- [x] Ticket chooser: Half = 3 panels / Full = 6 panels, regenerate, confirm, compact continuous scrollable paper strip.
- [x] Live: immersive display, current and previous/replay number, called/remaining counts, left Board/History drawer, right ranked-player drawer, scrollable tickets, stable Full house button beside each panel.
- [x] Marking: manual taps only; bold colored circles, configurable red default, star animation, haptics, reduced motion and larger numbers. Never auto-mark.
- [x] Players: avatar, name/mobile, connected/ready/watching state, completed-panel count, best panel progress/remaining, live ticket markings.
- [x] Host controls: co-host failover and reclaim, transfer, kick, next-round settings, schedule or end with confirmation.
- [x] Verification: pause calls, share frozen ticket above called board, bounded server progress, automatic result, missing numbers and resumed play on invalid claim.
- [x] Winner: verified full house, winning ticket, round summary, next-round lobby.
- [x] Recovery/end: host can terminate and refund, all clients converge to the same result; no voting or challenge pipeline.
- [x] Coins: available/reserved balances, three clearly labelled FREE TEST packs, transaction history, low-balance buy/watch choices.
- [x] Preferences: female caller only, sound, mark color, haptics, stars/reduced motion, larger numbers.
- [x] My tables: resume ongoing tables and inspect persisted round/event history.
- [x] Offline caller: preserve the original Photo 2 fixed white layout and cyan/red board; share improved female audio and tap feedback.

## Server rules

- Server owns tickets, draws, readiness, schedule, verification, balances and history.
- Ready reserves coins; unready/pre-start leave releases them. Start consumes once. Host/system abort refunds once. Completed rounds and voluntary mid-round leave are not refunded.
- At least two funded ready players to start. Everyone else watches. A scheduled start with too few ready players cancels and releases reservations.
- The first accepted claim by server sequence owns the frozen call snapshot; further claims wait for its result. All 15 values must exist in that snapshot; personal marks never establish a win.
- Verification takes at most three seconds of server time plus delivery latency. Invalid claims show missing values and resume play; no elimination or manual vote.
- A durable pending transaction coordinates D1's idempotent coin ledger with the room state. Network retries reuse identifiers. Wallet balance can never be negative.
- Coins are virtual entertainment credits, with no cash withdrawal or cash prize pool.

## Deferred (keep relevant visuals)

- [ ] Real payment gateway / app-store purchases, receipts and reconciliation. Test purchases are free and visibly labelled.
- [ ] Voice chat: retain a disabled Coming later affordance; no microphone access.
- [ ] Ads / rewarded ads: retain a Coming later visual where appropriate; no ad SDK or promised rewards.
- [ ] Public matchmaking, verified-phone login fallback and account migration/recovery require a separate product decision.

## Validation log

- Passed app/server TypeScript, 60 Vitest tests, 2 native configuration tests and 13 Python tests (including 6 ledger cases).
- Passed 131 local Wrangler D1/Durable Object/API/WebSocket integration assertions.
- Inspected the implemented components at 390×844: home, entry, registration, table settings/lobby, chooser, shop, live play, drawers, verification and offline caller.
- Local Android 1.2.0 (versionCode 6) release build passed. Original signing certificate, three ABIs, all 90 female voice hashes, production API and all five game-art pixel payloads verified. Launcher/splash use the same new crowned artwork.
- Cloudflare migration 0006 and Worker deployed; live health check passed and no migrations remain.
- APK SHA-256: `13e6072a804317b5ea729a8ba434a2a7f3d84d24557a1f3cf37ced08c8170c84`.
- [ ] Physical Android/iPhone acceptance: long playback, hardware volume, haptics, SIM picker, deep links and upgrade preservation. No device is attached to this Windows host; no new IPA is claimed.

The visual checks rendered actual React Native components in a browser harness. They are not physical-device screenshots.
