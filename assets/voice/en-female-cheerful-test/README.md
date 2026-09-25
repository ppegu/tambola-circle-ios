# Cheerful female voice — listening test

Experimental alternative for Tambola number calls 1–90. This pack is separate
from the approved `assets/voice/en-female` pack and is not registered in the app,
packaged into an APK, or used by the server.

Open `review.html` to compare each call with the approved voice, or play the
numbered WAV files directly. Start with **1, 4, 6, 7, 23, 47, 67, 77, and 90**.
The emotional tone needs human listening approval; automated recognition cannot
establish whether a voice sounds cheerful, celebratory, or natural.

## Voice and processing

- British English female **Poppy**, speaker 3 of Piper `en_GB-semaine-medium`.
  The source speaker performs an outgoing, optimistic character.
- Phrase synthesis preserves the voice's intonation. Singles say “Single,
  number, one!”; double-digit calls say the digits, pause 500 ms, then the number.
- Length scale 1.12, natural synthesis noise 0.667, duration noise 0, and a fixed
  seed and generation order. Commas separate the spoken digits and single-number words.
  Call 30 uses “Three. Zero!” to give that digit pair a clearer boundary.
- Leading/trailing quiet trimmed with 5 ms consonant protection, 3 ms fades,
  consistent loudness, and soft limiting below full scale. No pitch shifting.
- WAV format: mono, 22,050 Hz, signed 16-bit PCM.
- `manifest.json` records exact synthesis text, durations, source provenance and
  hashes. `quality-report.json` contains automated measurements and sample ASR.

## Source attribution and test-use license

Source speech database: **Copyright 2009 DFKI GmbH**,
[DFKI SEMAINE data](https://github.com/marytts/dfki-semaine-data).
The dataset and [voice model card](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/en/en_GB/semaine/medium/MODEL_CARD)
specify [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Keep this experimental pack for noncommercial evaluation; commercial release
would need a compatible voice or separate permission. This generated and
processed test pack is shared under those same terms, with the changes above.

## Regenerate locally

The model and configuration live in `.tools/piper-models` and are not app assets.
Download `en_GB-semaine-medium.onnx` and `en_GB-semaine-medium.onnx.json` from
`https://huggingface.co/rhasspy/piper-voices/resolve/c10ece1aade47bb51c153c893d14e5bf8e5b7117/en/en_GB/semaine/medium/`.
Expected model SHA-256:
`d6dab6f3b92db43ea3f78c7f20dc8eadb47a1f15d8a1c9d451cf3ccd201a2f66`.

From the repository root in PowerShell:

```powershell
. .\scripts\use-d-drive.ps1
.\.tools\voice-venv\Scripts\python.exe scripts\generate-cheerful-voice.py
```

Requires the existing Piper, NumPy and ONNX Runtime environment. The generator
reads the approved phrase manifest and asserts that the approved assets and
runtime registry/timings remain unchanged. `--numbers 1 4 6 7 23 77` generates a
partial preview and replaces this test pack's manifest; rerun without that
argument before using the full pack.
