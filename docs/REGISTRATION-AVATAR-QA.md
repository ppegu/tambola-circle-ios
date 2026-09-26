# Registration and avatar gallery — 23 September 2026

- Registration keeps the approved purple game background, paper form, cartoon avatar and gold Continue button, with the game font and larger avatar.
- Tap the avatar for a 15-choice gallery. Select a portrait, then Use avatar; Back or tapping outside discards the draft choice.
- The original six portraits remain stable IDs 0–5. Nine additional portraits generated with the built-in image tool are IDs 6–14. Asset and prompt are in `assets/game-v3/game-avatars-extra.png` and `avatar-pack-prompt.txt`.
- Android retains its disabled selected number and Change/SIM picker. iOS uses an editable phone field with country code and no SIM picker, plus keyboard avoidance.
- Continue accepts the linked Terms and Conditions and Privacy Policy. Each link opens its own tab and preserves the form on return. There is no consent checkbox or Why we save this link.
- Selection is stored on the player record and in the saved device profile, and included in joined/rejoined room snapshots and history/list avatars. Existing players can change their avatar from Your profile. Already-open rooms receive a changed profile avatar when that player rejoins.
- Removed the global online error banner. Passive wallet/connection errors no longer appear across unrelated screens. Failed user actions use a relevant alert; table/history list failures retain their existing local feedback.

## Verification

- Connected realme RMX3951 through Wi-Fi ADB, development app and Metro 8081; isolated local API 8791.
- Native Android: 15 gallery choices rendered, selecting/confirming, Terms link, Privacy link, Android hardware Back, fictional QA number, profile avatar save, Home rendering and persistence after Metro reload.
- `npm run typecheck`: app and Worker pass.
- `npm test`: 72 tests pass.
- `node scripts/test-device-registration.mjs`: 83 local API checks pass. Includes iOS manual entry, Android restrictions, invalid avatar rejection, all 15 valid IDs, registration idempotency, authenticated updates, unchanged other accounts, and room/list propagation.
- iOS registration code and API path verified; a physical iPhone run was not available.
- No real phone number was submitted during QA; the existing development QA identity and fictional API fixtures were used.

## Local artifacts

- `artifacts/android-qa/registration-final-device.png`
- `artifacts/android-qa/registration-avatar-gallery-final.png`
- `artifacts/android-qa/avatar-persisted-after-reload.png`

Migration `server/migrations/0009_player_avatar.sql` is applied to `.tools/v3-integration-state` only. Apply it to the target database before deploying the updated Worker. This task uses the local Metro development app; no production deployment or release build was made.

## Follow-up: silent cancellation

- Cancelling number selection, returning no number, or an unavailable picker leaves the previous number untouched and shows no banner. Registration has no inline input-error banner; Continue stays disabled until the required fields are valid.
- Native share dismissal does not open an error or fallback dialog. The invite screen still provides explicit copy controls.
- Ticket type controls are disabled while ready/busy instead of opening a warning. Setting a game time is disabled for incomplete/invalid dates or times outside the server's 10-second to 7-day window; no input-error banner is shown.
- Avatar dismissal and other existing Cancel/Back controls already leave their screens silently. Actual failed data requests keep their contextual retry feedback.
- App and server type checks pass. The new real-device cancellation check was interrupted when Wi-Fi ADB disconnected; reconnecting to the advertised address timed out. The screenshots above verify the preceding registration/avatar work, not this cancellation follow-up.
