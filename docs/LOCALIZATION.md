# App languages

The native app bundles English (`en`, default), Assamese (`as`) and Hindi (`hi`). No translation or font download is needed. The brand artwork and the existing English number-call recordings stay unchanged. Player/table names, mobile numbers, invite codes and ticket numbers are never translated.

On first launch after this update, an installation without a saved language gets a native modal with English preselected. Continue saves the choice; simply highlighting a choice does not save it. A failed save keeps the dialog open with a retry message. Game settings → Language allows changing it later or dismissing the picker without saving. An explicitly selected English choice suppresses the first-run prompt too. Cold invite navigation waits until the choice has been saved, and the picker respects the app-update gate.

The preference is local to the installation in AsyncStorage (`tambola.circle.language.v1`). It is separate from the legacy calling-preferences API schema. Zustand only notifies language subscribers when the language changes, and screens update without replacing the native navigation stack or resetting game data.

`src/i18n/messages.ts` stores English UI copy as typed keys, followed by Assamese and Hindi translations. Call `tr(key, values)` explicitly for UI copy and subscribe with `useLanguage()` in the rendering component. Use whole messages with named interpolation values for new copy. Do not translate user-entered strings. `localizeKnownCopy` is restricted to known server errors and bundled voice metadata; unknown diagnostic copy falls back unchanged. Backend-managed coin plan names and release notes retain their supplied text.

Shared native Text/TextInput wrappers use system fonts for Bengali-script Assamese and Devanagari, with enough line height for vowel signs. English keeps the bundled Fredoka font. Numeric ticket/call cells retain the original 1–90 notation and metrics.

## Verification — 24 September 2026

- App and server TypeScript checks pass.
- Full regression suite: 133 Vitest tests and 2 native configuration checks pass, including 11 localization tests.
- Android and iOS production JavaScript bundles pass; bundled artwork and 94 offline voice/preview clips verify successfully.
- Locale tests cover catalog completeness/interpolation parity, unmodified user values, zero values, first use, all saved languages, invalid data, storage failures and delayed hydration.
- Connected Android with Metro: first-launch picker, Assamese Home and Settings, Hindi Home/caller/pause dialog/online hub, and saved Hindi after cold restart. No app data was cleared.
- iOS uses the same translation code and native font fallback; physical iOS layout has not been verified on this Windows host.

Screenshots are local under `artifacts/android-qa`, including `language-picker-first.png`, `home-assamese.png`, `settings-assamese.png`, `home-hindi.png`, `caller-hindi.png`, `pause-hindi.png`, and `online-hindi.png`.
