# Number voice playback and audio review

The Android caller uses one `SoundPool`, with one active stream and all 90 number
recordings decoded in advance. `PreparedVoicePlayer` owns loading, readiness,
volume, cancellation, and playback completion. It never creates a player for
each number. The existing iOS playback path is unchanged.

Preparation starts while the app is in the foreground with sound enabled, so it
can finish on the home screen or in the online lobby. Offline Play/Next shows
“Preparing audio…” while the bank loads. Playback also waits for preparation,
including previews started with sound muted. The bank survives calls and
replays; going to the background or unmounting releases it. Returning prepares
it again. Downloaded Metro WAVs still use the disk cache, with the asset hash in
their URL so regenerated files do not reuse an older recording.

The preparation promise resolves only after every sample has successfully
decoded. Errors or a 30-second timeout release the pool and permit retry. A new
call cancels the current one. Cancelled calls cannot start after an old preload
finishes. SoundPool has no completion callback: completion uses the exact WAV
duration from the generated manifest plus a 100 ms output margin, without
stopping the naturally finishing stream. Device and Bluetooth latency still
need validation on an installed build.

## Listen before packaging

Open `D:\OnlineTam\assets\voice\en-female`. Files are named `1.wav` through
`90.wav`. These are the files the app will bundle, not separate demo recordings.
Try single digits and double digits such as 1, 10, 23, 77, and 90.

Cadence version 8 uses the Piper female model at a fixed, slower length scale of
1.20. Each word is generated once and reused, so its pace and volume stay the
same across numbers. Single digits say “Single Number One” through “Single
Number Nine.” Word gaps are 180 ms; the pause between digits and the full number
is 500 ms. Words are normalized for louder, even speech with soft peak limiting.
There is no added silence at either end. The manifest records word boundaries,
actual duration, and SHA-256 hashes.

The word “one” uses explicit, primary-stressed /wʌn/ phonemes instead of the
model's default weakly stressed /wɒn/. Its final RMS level targets 0.215 of full
scale, close to “two”, with peaks limited to 95% of full scale. The same corrected word
is reused in every affected announcement. Listen to `1.wav`, `12.wav`, and
`21.wav` to review it alone after “Single Number” and within double-digit calls.

Version 8 revises “single”, “six”, “seven”, and “four”. These words use the
model's normal acoustic noise scale of 0.667, with duration noise still zero.
A fixed per-word seed and fresh ONNX session make regeneration reproducible.
“Four” uses explicit /fˈɔːɹ/ phonemes for a clear ending. All other words,
including the approved “one”, retain their previous samples. Review `1.wav`,
`4.wav`, `6.wav`, and `7.wav` before rebuilding the installed APK.

Speech is no longer squeezed into a 2.8-second target. The local caller waits for
playback to finish. The online engine uses the greater of the chosen interval
and that number's generated duration plus 250 ms. `shared/voiceTiming.json` is
regenerated alongside the WAVs. The matching server timing update was deployed
on 23 September 2026 as Worker version
`0cbd4d53-cf86-4fb4-893f-b7946523a342`.

The version 7 recordings were approved on 23 September 2026. Release 1.2.1 (Android
version code 7) was built with the original signing key and installed over ADB
on the connected Realme RMX3951 using an in-place update. The package UID and
original installation date were retained, and the app opened without recorded
startup or audio errors. The APK and verification reports are in
`D:\OnlineTam\artifacts\release-1.2.1`. APK verification matched all 90 voice
hashes and confirmed both prepared-player classes in the packaged native code.
The installed APK contains version 7 audio. Version 8 is available in the review
folder and source control; another APK build awaits listening approval.

The 81 obsolete `*-digits.wav` recordings were moved to
`D:\OnlineTam\artifacts\voice-legacy-20260923` so the review folder contains only
the 90 current complete announcements. The archived clips are not in the runtime
voice bank.

## Verification without an APK

Dot-source `scripts/use-d-drive.ps1` before development commands.

- `npm run voice:generate` regenerates the WAVs and manifest using the local
  Python voice environment.
- `npm run typecheck` checks application and server types.
- `npm test` includes audio integrity, preload deduplication, retry, cancellation,
  and announcement sequencing checks.
- `scripts/test-voice-player.ps1` compiles and runs the actual Kotlin controller
  against a deterministic pool and clock, using the cached Kotlin compiler on D:.
- Gradle task `:circle-device:compileDebugKotlin` checks the Android adapter and
  bridge without packaging an APK. Use the existing Android SDK on D:.
