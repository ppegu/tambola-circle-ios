# Five female voice auditions

Open `review.html` to compare five distinct female voices reading identical number calls. These are short selection samples; they are not complete 1–90 packs.

| Choice | Voice  | Accent          | Service voice ID             |
| ------ | ------ | --------------- | ---------------------------- |
| 1      | Neerja | Indian English  | en-IN-NeerjaExpressiveNeural |
| 2      | Ava    | US English      | en-US-AvaNeural              |
| 3      | Emma   | US English      | en-US-EmmaNeural             |
| 4      | Sonia  | British English | en-GB-SoniaNeural            |
| 5      | Aria   | US English      | en-US-AriaNeural             |

Text: “Single number one. Single number four. Single number six. Single number seven. Four, seven. Forty seven.”

Generated on 2026-09-23 through the Microsoft Edge online speech service using [edge-tts](https://github.com/rany2/edge-tts) 7.2.8. The service catalog identifies all five voices as female. `manifest.json` records exact voice IDs, service metadata and file hashes.

All use rate `-8%`, pitch `+0Hz`, and volume `+0%`. Natural timing differs between voices. Downloaded MP3s are decoded to 22,050 Hz mono PCM16 WAV. Outer silence is trimmed with a 10 ms margin; a shared 0.18 RMS target, gentle peak limiting and 3 ms edge fades prepare them for comparison. No pitch or formant shifting is applied.

Regenerate from the repository root in PowerShell:

```powershell
. .\scripts\use-d-drive.ps1
& .\.tools\voice-venv\Scripts\python.exe scripts\generate-five-voice-samples.py
```

The existing voice environment needs `edge-tts==7.2.8`, `av` and `numpy`. Generation requires internet access and sends the sample text to the speech service. Source MP3s and the voice catalog are retained under `artifacts/voice-five-samples`. This service source record is not an audio distribution license.

Existing packs and app runtime files are preserved. `quality-report.json` records audio checks and local speech-recognition results; subjective voice preference should be judged by listening.
