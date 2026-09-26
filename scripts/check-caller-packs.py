"""Validate every complete pack, plus selected spoken-content samples locally."""
import argparse
import hashlib
import json
import wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("--transcribe", action="store_true")
args = parser.parse_args()
catalog = json.loads((ROOT / "shared/voicePacks.json").read_text(encoding="utf-8"))
model = None
if args.transcribe:
    from faster_whisper import WhisperModel
    model = WhisperModel("base.en", device="cpu", compute_type="int8", cpu_threads=2,
                         download_root=str(ROOT / ".tools/whisper-models"), local_files_only=True)
results = []
for pack in catalog["packs"]:
    folder = ROOT / "assets/voice/aria" if pack["bundled"] else ROOT / "voice-packs/public/packs" / pack["id"] / pack["revision"]
    assert [file["number"] for file in pack["files"]] == list(range(1, 91))
    assert sum(file["bytes"] for file in pack["files"]) == pack["totalBytes"]
    rows = []
    for item in pack["files"]:
        path = folder / f"{item['number']}.wav"
        raw = path.read_bytes()
        assert len(raw) == item["bytes"] and hashlib.sha256(raw).hexdigest() == item["sha256"]
        with wave.open(str(path), "rb") as wav:
            assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, 22050)
            data = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(float) / 32767
        assert data.size * 2 < 1_048_576
        assert abs(len(data) / 22050 * 1000 - item["durationMs"]) < .01
        active = np.flatnonzero(abs(data) >= .003)
        assert active.size and active[0] / 22050 < .04 and (len(data) - active[-1] - 1) / 22050 < .04
        assert np.max(abs(data)) < .951 and .16 < np.sqrt(np.mean(data ** 2)) < .19
        row = {"number": item["number"], "durationMs": item["durationMs"], "physicalChecksPassed": True}
        if model and item["number"] in [1, 4, 6, 7, 10, 12, 30, 40, 47, 66, 70, 77, 84, 90]:
            segments, _ = model.transcribe(str(path), beam_size=5, language="en", condition_on_previous_text=False)
            row["transcript"] = " ".join(segment.text.strip() for segment in segments)
            print(f"{pack['name']} {item['number']}: {row['transcript']}", flush=True)
        rows.append(row)
    results.append({"id": pack["id"], "revision": pack["revision"], "files": rows})
    print(f"{pack['name']}: all 90 file/hash/audio checks passed", flush=True)
report = {"physicalChecksPassed": True, "calls": 450, "asr": "Selected Whisper base.en transcriptions for review; not a subjective pronunciation guarantee" if model else None, "packs": results}
(ROOT / "artifacts/caller-packs/quality-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
