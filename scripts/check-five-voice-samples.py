"""Check audition audio structure, levels, protected assets and spoken content."""
import hashlib
import json
import re
import wave
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets/voice/female-voice-samples"
manifest = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf-8"))
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
protected_ok = all(sha(ROOT / path) == digest for path, digest in manifest["protectedFiles"].items())
assert protected_ok, "An existing voice asset changed"
model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=2,
                     download_root=str(ROOT / ".tools/whisper-models"), local_files_only=True)


def normalize(text):
    text = text.lower()
    for numeral, words in [("47", "forty seven"), ("1", "one"), ("4", "four"), ("6", "six"), ("7", "seven")]:
        text = re.sub(r"\b" + numeral + r"\b", words, text)
    # ASR may spell the homophone "four" as "for" in this isolated digit pair.
    text = re.sub(r"\bfor seven\b", "four seven", text)
    return " ".join(re.sub(r"[^a-z ]", " ", text).split())


results = []
for voice in manifest["voices"]:
    path = OUTPUT / voice["file"]
    with wave.open(str(path), "rb") as wav:
        channels, width, rate, frames = wav.getnchannels(), wav.getsampwidth(), wav.getframerate(), wav.getnframes()
        data = np.frombuffer(wav.readframes(frames), dtype="<i2").astype(float) / 32767
    active = np.flatnonzero(np.abs(data) >= .003)
    leading = float(active[0] / rate * 1000)
    trailing = float((len(data) - active[-1] - 1) / rate * 1000)
    rms = float(np.sqrt(np.mean(data ** 2)))
    segments, _ = model.transcribe(str(path), beam_size=5, language="en", condition_on_previous_text=False)
    transcript = " ".join(segment.text.strip() for segment in segments)
    checks = dict(format=(channels, width, rate) == (1, 2, 22050),
                  duration=7 < frames / rate < 20, noClipping=bool(np.max(np.abs(data)) < .951),
                  matchedRms=.17 < rms < .19, outerQuiet=leading < 40 and trailing < 40,
                  sha256=sha(path) == voice["sha256"],
                  expectedWords=normalize(transcript) == normalize(manifest["text"]))
    results.append(dict(name=voice["name"], file=voice["file"], durationSeconds=frames/rate,
                        rms=rms, peak=float(np.max(np.abs(data))), leadingQuietMs=leading,
                        trailingQuietMs=trailing, transcript=transcript, checks=checks))
    print(json.dumps({"name": voice["name"], "transcript": transcript, "checks": checks}), flush=True)

report = dict(generatedAt=datetime.now(timezone.utc).isoformat(), protectedFilesUnchanged=protected_ok,
              asr="faster-whisper base.en, CPU int8, beam size 5; numeral and for/four-seven homophone normalization; text check only, not subjective audio quality",
              voices=results, passed=all(all(v["checks"].values()) for v in results))
(OUTPUT / "quality-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
assert report["passed"], "Inspect quality-report.json for a failed check"
