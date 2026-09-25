# Screen mount and navigation QA — 24 September 2026

The native stack could finish sliding before React mounted the screen content. Pushes did not wait for rendering, each separate native root waited for fresh safe-area measurements, and the ticket chooser explicitly hid cached tickets until `componentDidAppear`. Navigation context changes then invalidated the screen again.

## Changes

- Native push/root transitions wait for the initial React render. API requests remain asynchronous and retain their existing skeleton, retry and empty states.
- Reuse measured safe-area metrics between compatible native roots; keep immersive and normal measurements separate and reject stale window widths. Native measurements still correct the seed.
- Separate visibility/appearance subscriptions from navigation actions and memoize route data/content. Hidden-screen subscriptions still resume when a screen reappears. Back handlers, offline calling and app-update gates retain reactive visibility.
- Remove duplicate background and safe-area layers on surfaces that already own them.
- Render cached ticket strips immediately, with all six possible panels in the initial list batch. Keep loading feedback when ticket generation actually needs the API.
- Read-only tickets and blank cells use plain native views instead of disabled pressables with animation state. Ticket preferences subscribe once per panel instead of once per cell. Live cells retain marking, hit targets and native-driven star animation.

## Validation

- OPPO CPH1945, Android 11, `com.ppegu.tambola.dev`, Metro over ADB reverse; isolated localhost API on port 8791.
- Settings and online hub forward/back navigation checked. Temporary React profiling confirmed content commits before `componentDidAppear`; visibility-only commits were small rather than a second full-screen rebuild. Probes removed from the final code.
- Created local `QA Mount`, opened the lobby, selected half/full strips, returned to the lobby, reopened cached six-ticket strips and scrolled through ticket six. No ready/start action or coin purchase was submitted.
- Clean dev-app restart and reopening the saved QA table/tickets checked after the final cell optimization. App data and signing material preserved.
- App/server TypeScript checks, 140 Vitest tests and two native configuration tests passed. Final ticket changes passed app TypeScript and the 140-test suite again.
- Local screenshots: `artifacts/android-qa/mount-cached-full-tickets.png` and `artifacts/android-qa/mount-final-tickets.png`.

These are functional and React-commit checks in development mode, not release FPS measurements. Cold development mounts still include React development overhead. Wi-Fi screenshot capture takes several seconds and cannot establish animation frame pacing. No new release APK was published for this change; the connected dev app uses the updated Metro source.
