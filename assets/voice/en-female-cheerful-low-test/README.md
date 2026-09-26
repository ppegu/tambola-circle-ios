# Cheerful female voice — lower pitch

A separate 90-call test pack based on the accepted Poppy cheerful voice.
Pitch is lowered **two semitones** (frequency ratio 0.890899), with the original
speaking pace, words, and phrase pauses retained. Neither earlier voice pack nor
the app's voice selection has been replaced.

Open `review.html` to compare all three voices. Speech is processed at the original
speed; quiet outer edges are then trimmed. Internal phrase pauses are unchanged.
Files are mono, 22,050 Hz, 16-bit PCM.

## Processing and verification

The offline [Rubber Band 4.0.0](https://breakfastquay.com/rubberband/) R2 engine
processes each phrase with formant preservation, pitch -2 and time ratio 1.
Formant preservation helps retain the female speaker's vocal character while
lowering the fundamental pitch. Temporary analysis padding protects initial
consonants and is removed before saving. Gain matches the source loudness with
gentle limiting of the tallest peaks; brief edge fades keep the edges clean.
R2 was selected because it retained short word onsets more accurately in this
pack; the R3 candidate softened some initial consonants.

`manifest.json` records the source file hashes, exact durations, phrase positions,
processing settings and resulting file hashes. `quality-report.json` records
the audio checks and sample speech-recognition results. Listen to assess the
resulting timbre; automated checks cannot establish voice preference.

## Attribution and licence

Derived from the local `en-female-cheerful-test` pack using Piper
`en_GB-semaine-medium`, speaker 3 (Poppy). Source speech: Copyright 2009 DFKI GmbH,
[DFKI SEMAINE data](https://github.com/marytts/dfki-semaine-data).
The source voice and this processed test pack use
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Changes are pitch reduction, level adjustment, and edge processing as above.

The Rubber Band utility is used locally for asset preparation and is not bundled
with the application. Its own licence is included with its download.

## Regenerate

Extract the [official Windows utility](https://breakfastquay.com/files/releases/rubberband-4.0.0-gpl-executable-windows.zip)
under `.tools/rubberband-4.0.0/`, retaining the archive's directory structure.
Archive SHA-256:
`f2d47fc64dbb42f6cc62edf7933ac4fa89d8f0ef8b9cf97b6afc263a7fe05644`.

Run from the repository root in PowerShell:

```powershell
. .\scripts\use-d-drive.ps1
.\.tools\voice-venv\Scripts\python.exe scripts\generate-lower-pitch-voice.py
```

The generator uses the existing NumPy voice environment. Its temporary WAV files
stay under `artifacts/voice-lower-pitch-work` on D:. The approved source WAVs,
manifests, app voice registry and server voice timings are verified unchanged.
