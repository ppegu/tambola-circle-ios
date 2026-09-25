# Fuller cheerful female voice

This 90-call test pack changes the **body and resonance** of the original cheerful
Poppy voice. It is generated from `en-female-cheerful-test`, not the earlier
lower-pitch experiment. Pitch and expressive pitch range are left unchanged.

Open `review.html` and choose **Fuller voice · New**. The original cheerful and
standard voices are available beside it. All earlier WAV packs remain intact.

## Processing

- Praat formant ratio **0.84** lowers vocal resonances to create a thicker tone.
- Original pitch median, pitch range factor 1, and duration factor 1 retain the
  original melody and speaking speed.
- A smooth **+3.5 dB low-mid boost around 320 Hz** adds body; a gentle **-1.5 dB
  high shelf around 4 kHz** softens brightness while retaining consonants.
- Each phrase is processed separately; the existing gap before the full number
  remains unchanged. Final outer quiet is trimmed with 5 ms protection.
- Loudness is matched to the source and the tallest peaks are gently limited.
- Output: mono, 22,050 Hz, signed 16-bit PCM.

The implementation uses [Praat's independent formant, pitch and duration
controls](https://www.fon.hum.uva.nl/praat/manual/Sound__Change_gender___.html)
through [Parselmouth](https://parselmouth.readthedocs.io/en/stable/). Subjective
fullness and naturalness need listening review. `quality-report.json` contains
actual pitch, spectral-balance, volume, silence, and transcription checks.

## Attribution and licence

Source: Piper `en_GB-semaine-medium`, speaker 3 (Poppy), derived from **Copyright
2009 DFKI GmbH**, [DFKI SEMAINE data](https://github.com/marytts/dfki-semaine-data).
This transformed test pack retains the source's
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) terms.
The changes are formant adjustment, EQ, level matching, limiting, and edge cleanup.
It is separate from the app's bundled voice and is for local listening tests.

## Regenerate

From the repository root in PowerShell, using the D: voice environment:

```powershell
. .\scripts\use-d-drive.ps1
.\.tools\voice-venv\Scripts\python.exe -m pip install praat-parselmouth==0.4.7
.\.tools\voice-venv\Scripts\python.exe scripts\generate-fuller-voice.py
```

The manifest records the source and output hashes and processing settings. The
generator verifies that the source packs, runtime registry and voice timings
remain unchanged.
