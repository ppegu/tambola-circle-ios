# Home design touch-up — 22 September 2026

Reference: `artifacts/design-v3-gameplay/screens/01-home.png`.

The home screen now uses a separate gold coin indicator and green shop action,
larger illustrated buttons, a cyan outline around My tables, stronger bevels and
shadows, and locally bundled Fredoka type. The sprite crops no longer expose
parts of neighboring icons under the footer. Home remains a fixed layout.

The caller entry is always **Offline caller**. Returning Home through the game
menu stops playback and clears both the current and saved round, using the same
reset function as Restart. Preferences and the online account remain intact.

## Android verification

Tested through Metro on the connected realme RMX3951, Android 16, 360 × 800
logical pixels. Only `com.ppegu.tambola.dev` was installed/restarted. The local
backend used the existing fictional QA account; no real SIM number was submitted.

- All three main actions and footer actions fit without scrolling.
- Tapping the coin amount leaves Home open; tapping the separate green + opens
  Coin shop. The displayed 1,500 coins matches the backend-backed shop balance.
- Play online, My tables, profile, footer Coins, How to play and Settings all
  opened their intended screens/panels and returned to Home.
- Leaving the previously saved 75-call round and reopening the caller showed
  **0 / 90 called**, **90 left**, with no current/previous number.
- A fresh automatic round advanced through 24 calls, then was paused and reset
  by returning Home. The reset was checked again after restarting the dev app.
- TypeScript validation and the Android debug build passed. The installed APK
  contains both bundled Fredoka font files.

Screenshots: `artifacts/android-qa/51-home-touchup-final.png` and
`artifacts/android-qa/50-offline-reset-zero.png`.

Metro continues on port 8081 and the isolated backend on port 8791. Generated
artifacts and local backend/build state are excluded from Metro's file watcher.
After startup, the voice asset request measured about 8 ms and native player
preparation about 100–120 ms during this check. This is a short development
session check, not a new complete audio endurance certification.

Font resources are registered for both native projects; runtime verification
for this home pass was Android only. No new release APK was published in this
home-screen iteration.
