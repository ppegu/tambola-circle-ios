# Female number caller

Version 1.2.1 bundles 90 female English number calls generated with the pinned Piper `en_US-ljspeech-high` model. There is no male selection and no runtime speech service, model download or microphone access. Legacy saved voice values resolve to the female pack.

Two-digit calls say the digit phrase, exactly 500 ms of silence, then the whole number: “two three … twenty three” and “eight six … eighty six”. Single digits are spoken once. Every delivered file is 2,800 ms at 22,050 Hz mono 16-bit PCM, including trailing silence. This leaves 200 ms before the minimum three-second interval. The pause is built into the audio so it does not depend on a JavaScript timer or network connection.

`scripts/generate-voice.py` uses deterministic synthesis at one shared speaking speed for the entire bank. `assets/voice/manifest.json` records the digit/full transcripts, segment boundaries, silence, synthesis speed, duration and SHA-256. Automated checks verify all 90 hashes, duration, channels, audible segments and exact silent gap. `scripts/audit-female-calls.py` optionally runs an existing local Whisper model as a speech-recognition sanity check. These checks do not replace listening and long-running playback checks on supported phones.

The [pinned model card](https://huggingface.co/rhasspy/piper-voices/blob/c10ece1aade47bb51c153c893d14e5bf8e5b7117/en/en_US/ljspeech/high/MODEL_CARD) identifies the source dataset as public domain. Piper is a GPL-3.0-or-later development tool; the app ships generated audio, not Piper or its model weights. Historical male files in source are unreferenced and excluded from native bundles.

Regenerate with `npm run voice:generate` after installing `scripts/voice-requirements.txt` in `.tools/voice-venv`. Windows commands first source `scripts/use-d-drive.ps1`; downloads, models and temporary files stay on D:. `VOICE_PYTHON` can override the local virtual environment.
