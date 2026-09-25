# Caller voices — local implementation and review handoff

Implemented on 2026-09-23, following the approved mockup. The user completed the listening review and authorized Cloudflare publication and APK/IPA builds for version 1.3.0. See `docs/RELEASE-1.3.0.md` for release verification and remaining device checks.

## Audio review

Open http://127.0.0.1:8795/female-voice-samples/review.html.

- Five complete packs: Aria, Neerja, Ava, Emma and Sonia; 90 calls each.
- Click any number; play 1–90 for one voice; or play all 450 sequentially.
- Pause, resume, stop, previous/next, and adjustable gaps between clips.
- Flag calls, attach notes, and export the review. Browser storage retains played-call marks and notes, scoped to each pack revision.
- The earlier identical short auditions remain at `auditions.html`.
- Local review server: `scripts/serve-voice-review.py`, bound only to 127.0.0.1:8795. It exposes the complete packs without uploading them.

Aria is stored in `assets/voice/aria`. Optional packs are under `voice-packs/public/packs/<voice>/<revision>`. `shared/voicePacks.json` records the exact sizes, hashes, text, durations and service voice identifiers.

## Implemented behavior

- The existing shared Game settings sheet opens the new Caller voices picker, using the app's GameCard, GameButton, Sheet, typography and colours.
- Aria is the only bank statically required by the app, so both native platforms embed the same default audio.
- Other voices offer Preview and Download with actual sizes. Download progress and cancellation retain the current caller. Users explicitly tap Use voice after completion.
- A dedicated local preference persists the chosen voice. Android filesDir and iOS Application Support retain optional packs offline; these are separate from temporary playback caches.
- Every file has an expected byte count and SHA-256. Incomplete or corrupt packs cannot be selected. Startup verifies saved packs and safely falls back to Aria when needed. Retrying reuses already verified files.
- The native download implementations validate voice IDs, revision paths and the configured HTTPS host. Only optional packs can be removed; an active pack must be deselected before removal.
- The caller and voice previews share one playback controller. A selection change takes effect after any current number finishes. Android prepares the selected bank in its existing SoundPool.
- Shared automatic-call timing accommodates the longest version of each call, including the earlier standard bank, so changing voices does not shorten the available speaking time.
- The independent Cloudflare static asset config is `voice-packs/wrangler.jsonc`. It leaves the multiplayer server deployment separate.

## Validation completed

- App and server TypeScript checks passed.
- All 88 Vitest tests passed, including download completion, cancellation/retry, offline restore, corruption fallback, low storage and removal constraints.
- Nine existing Kotlin playback tests passed. A new Kotlin storage test exercises actual persistence, corrupt/partial file rejection, cached retry, URL/path guards, cancellation and removal.
- All 450 WAVs passed format, duration, level, clipping, edge-silence, exact-size and SHA-256 checks.
- All 450 local review URLs returned the expected file hashes.
- Selected calls from each pack were transcribed locally with Whisper for inspection; this is not a subjective pronunciation guarantee. Detailed report: `artifacts/caller-packs/quality-report.json`.
- Rendered React Native web components were checked separately for the settings entry, progress, explicit selection and restored choice. That visual check used a simulated native download adapter; it is not device download verification.

## Release verification

- Preserve the five approved packs and pinned manifests/revisions.
- Upload the optional packs to the independent Cloudflare asset service and verify its URLs and hashes.
- Run native integration checks on installed Android and iOS builds, including download cancellation, offline reopening and active-call switching. The iOS Objective-C download bridge still needs an Apple build environment to compile and verify.
- Produce release APK/IPA artifacts from the coordinated source checkpoint. Preserve signing credentials and saved app data.

Changes were kept to voice playback, native voice storage, the settings entry/new picker, voice timing, generated audio and their review/tests. Other agents' App, lobby, registration, table and artwork edits were preserved.
