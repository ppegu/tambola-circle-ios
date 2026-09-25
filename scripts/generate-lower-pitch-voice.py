"""Create a separate, two-semitone-lower copy of the cheerful test voice.

Uses the official Rubber Band 4.0.0 utility's R2 engine, with formant preservation and
unchanged speaking speed, followed by outer-silence trimming. Does not write the
source packs or application configuration.
"""

import hashlib
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/voice/en-female-cheerful-test"
OUTPUT = ROOT / "assets/voice/en-female-cheerful-low-test"
WORK = ROOT / "artifacts/voice-lower-pitch-work"
RUBBERBAND = ROOT / ".tools/rubberband-4.0.0/rubberband-4.0.0-gpl-executable-windows/rubberband-r3.exe"
TOOL_SHA256 = "f4cd498f36e22e624268e3e5aa47803449cb786f7850b83ddd26324162fcdb8a"
SEMITONES = -2
RATE = 22050


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_wav(path):
    with wave.open(str(path), "rb") as wav:
        assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, RATE)
        return np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").copy()


def write_wav(path, pcm):
    with wave.open(str(path), "wb") as wav:
        wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        wav.writeframes(pcm.astype("<i2").tobytes())


def shift_phrase(pcm, key):
    source = WORK / f"{key}-source.wav"
    shifted = WORK / f"{key}-shifted.wav"
    # Give the analysis windows context before an immediately spoken consonant.
    # Without padding, formant preservation can soften/delay an initial "S".
    padding = round(RATE * 0.3)
    write_wav(source, np.pad(pcm, (padding, padding)))
    subprocess.run([
        str(RUBBERBAND), "--fast", "--formant", "--pitch", str(SEMITONES),
        "--time", "1", "--quiet", str(source), str(shifted),
    ], check=True, capture_output=True, text=True)
    transformed = read_wav(shifted)
    assert len(transformed) == len(pcm) + 2 * padding, f"Timing changed in {key}"
    result = transformed[padding:padding + len(pcm)].astype(float)
    original_rms = np.sqrt(np.mean(pcm.astype(float) ** 2))
    shifted_rms = np.sqrt(np.mean(result ** 2))
    assert shifted_rms > 1, f"Silent result in {key}"
    # Match source loudness; gently limit only the tallest transformed peaks.
    # Scaling the whole phrase down for one transient made "six" too quiet.
    result *= original_rms / shifted_rms
    knee = 0.80 * 32767
    ceiling = np.floor(0.95 * 32767)
    magnitude = np.abs(result)
    peaks = magnitude > knee
    result[peaks] = np.sign(result[peaks]) * (
        knee + (ceiling - knee) * np.tanh((magnitude[peaks] - knee) / (ceiling - knee))
    )
    # The pitch transform can spread tiny amounts of energy into quiet edges.
    # Silence only that exterior noise; retain the source sample count exactly.
    active = np.flatnonzero(np.abs(result) >= 0.005 * 32767)
    margin = round(RATE * 0.005)
    start = max(0, int(active[0]) - margin)
    end = min(len(result), int(active[-1]) + margin + 1)
    result[:start] = 0
    result[end:] = 0
    fade = min(round(RATE * 0.003), (end - start) // 2)
    result[start:start + fade] *= np.linspace(0, 1, fade)
    result[end - fade:end] *= np.linspace(1, 0, fade)
    return np.rint(result).astype("<i2")


def finish_call(call, pcm):
    # Pitch processing can soften the last few low-level frames. Remove that
    # exterior quiet, while keeping speech speed and every internal pause.
    active = np.flatnonzero(np.abs(pcm.astype(float)) >= 0.005 * 32767)
    margin = round(RATE * 0.005)
    left = max(0, int(active[0]) - margin)
    right = min(len(pcm), int(active[-1]) + margin + 1)
    result = pcm[left:right].copy()
    current = dict(call)
    current.update(sourceDurationMs=call["durationMs"], durationMs=round(len(result) / RATE * 1000, 3),
                   trimStartSamples=left, trimEndSamples=len(pcm) - right,
                   peak=round(float(np.max(np.abs(result.astype(float))) / 32767), 5),
                   rms=round(float(np.sqrt(np.mean((result.astype(float) / 32767) ** 2))), 5))
    current["segments"] = [dict(part,
        startSample=max(part["startSample"], left) - left,
        samples=min(part["startSample"] + part["samples"], right) - max(part["startSample"], left))
        for part in call["segments"]]
    return current, result


def main():
    assert RUBBERBAND.is_file(), "Download the utility described in the lower-pitch pack README"
    assert sha(RUBBERBAND) == TOOL_SHA256, "Unexpected Rubber Band executable"
    source_manifest = SOURCE / "manifest.json"
    manifest = json.loads(source_manifest.read_text(encoding="utf-8"))
    assert len(manifest["calls"]) == 90
    assert {c["number"] for c in manifest["calls"]} == set(range(1, 91))
    protected = [SOURCE / c["file"] for c in manifest["calls"]]
    protected += [source_manifest, ROOT / "assets/voice/manifest.json", ROOT / "src/voiceBank.ts", ROOT / "shared/voiceTiming.json"]
    protected += list((ROOT / "assets/voice/en-female").glob("*.wav"))
    before = {p.relative_to(ROOT).as_posix(): sha(p) for p in protected}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    calls = []
    for call in manifest["calls"]:
        source = SOURCE / call["file"]
        assert sha(source) == call["sha256"], f"Source does not match manifest: {source}"
        original = read_wav(source)
        result = np.zeros_like(original)
        # Process each spoken phrase separately, preserving the exact pause
        # between the digits and full number instead of spreading audio into it.
        for index, part in enumerate(call["segments"]):
            start = part["startSample"]
            end = start + part["samples"]
            result[start:end] = shift_phrase(original[start:end], f"{call['number']}-{index}")
        path = OUTPUT / call["file"]
        current, result = finish_call(call, result)
        write_wav(path, result)
        current.update(sourceSha256=call["sha256"], sha256=sha(path))
        calls.append(current)
        print(f"{call['number']}: {current['durationMs']:.0f} ms, peak {current['peak']:.3f}", flush=True)
    assert all(sha(ROOT / p) == digest for p, digest in before.items()), "A protected source file changed"
    output_manifest = dict(pack=OUTPUT.name, experimental=True, sourcePack=SOURCE.name,
                           sourceManifestSha256=sha(source_manifest), sourceModel=manifest["model"],
                           speaker=manifest["speaker"], license=manifest["license"],
                           pitchShiftSemitones=SEMITONES, frequencyRatio=2 ** (SEMITONES / 12),
                           preserveFormants=True, speakingRateRatio=1, preservePhrasePauses=True,
                           trimOuterQuiet=True,
                           processingTool="Rubber Band 4.0.0 R2", processingToolSha256=TOOL_SHA256,
                           protectedFiles=before, calls=calls)
    (OUTPUT / "manifest.json").write_text(json.dumps(output_manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Created {len(calls)} lower-pitch calls; source packs and runtime files unchanged.", flush=True)


if __name__ == "__main__":
    main()
