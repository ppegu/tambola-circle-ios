"""Make the cheerful female voice fuller by changing resonance, not pitch.

Requires praat-parselmouth==0.4.7 and NumPy in the existing D: voice environment.
The original cheerful pack is the source; the rejected pitch-shifted pack is not.
"""

import hashlib
import json
import wave
from pathlib import Path

import numpy as np
import parselmouth
from parselmouth.praat import call as praat

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/voice/en-female-cheerful-test"
OUTPUT = ROOT / "assets/voice/en-female-cheerful-full-test"
RATE = 22050
FORMANT_RATIO = 0.84
BODY_GAIN_DB = 3.5
HIGH_SHELF_DB = -1.5


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


def fuller_phrase(pcm):
    original = pcm.astype(float) / 32767
    pad = round(RATE * 0.15)
    padded = np.pad(original, (pad, pad))
    sound = parselmouth.Sound(padded, sampling_frequency=RATE)
    # Praat's name for its independent formant/pitch/duration controls.
    # Pitch median 0 retains the original; pitch range and duration stay at 1.
    changed = praat(sound, "Change gender", 80, 600, FORMANT_RATIO, 0, 1, 1).resample(RATE)
    result = changed.values[0]
    assert abs(len(result) - len(padded)) <= 1, "Unexpected duration change"
    result = np.pad(result, (0, max(0, len(padded) - len(result))))[:len(padded)]

    # Smooth, phase-preserving EQ adds low-mid body and gently softens the edge.
    # This changes spectral balance, not the frequencies of the harmonics.
    size = 1 << (len(result) - 1).bit_length()
    frequencies = np.fft.rfftfreq(size, 1 / RATE)
    body = BODY_GAIN_DB * np.exp(-0.5 * (np.log2(np.maximum(frequencies, 1) / 320) / 0.8) ** 2)
    shelf = HIGH_SHELF_DB / (1 + np.exp(-(frequencies - 4000) / 700))
    gain = 10 ** ((body + shelf) / 20)
    result = np.fft.irfft(np.fft.rfft(result, n=size) * gain, n=size)[:len(padded)]
    result = result[pad:pad + len(original)]
    target = np.sqrt(np.mean(original ** 2))
    rms = np.sqrt(np.mean(result ** 2))
    assert rms > 1e-6, "Silent transformed phrase"
    result *= target / rms
    knee, ceiling = .80, np.floor(.95 * 32767) / 32767
    peaks = np.abs(result) > knee
    result[peaks] = np.sign(result[peaks]) * (
        knee + (ceiling - knee) * np.tanh((np.abs(result[peaks]) - knee) / (ceiling - knee))
    )
    return np.rint(result * 32767).astype("<i2")


def finish_call(call, pcm):
    active = np.flatnonzero(np.abs(pcm.astype(float)) >= .005 * 32767)
    margin = round(RATE * .005)
    left = max(0, int(active[0]) - margin)
    right = min(len(pcm), int(active[-1]) + margin + 1)
    result = pcm[left:right].astype(float)
    fade = min(round(RATE * .003), len(result) // 2)
    result[:fade] *= np.linspace(0, 1, fade)
    result[-fade:] *= np.linspace(1, 0, fade)
    result = np.rint(result).astype("<i2")
    current = dict(call)
    current.update(sourceDurationMs=call["durationMs"], durationMs=round(len(result) / RATE * 1000, 3),
                   trimStartSamples=left, trimEndSamples=len(pcm) - right,
                   peak=round(float(np.max(np.abs(result.astype(float))) / 32767), 5),
                   rms=round(float(np.sqrt(np.mean((result.astype(float) / 32767) ** 2))), 5))
    current["segments"] = [dict(part, startSample=max(left, part["startSample"]) - left,
        samples=min(right, part["startSample"] + part["samples"]) - max(left, part["startSample"]))
        for part in call["segments"]]
    return current, result


def main():
    source_manifest = SOURCE / "manifest.json"
    manifest = json.loads(source_manifest.read_text(encoding="utf-8"))
    assert len(manifest["calls"]) == 90
    assert {c["number"] for c in manifest["calls"]} == set(range(1, 91))
    protected = [SOURCE / c["file"] for c in manifest["calls"]]
    for folder in ["en-female", "en-female-cheerful-low-test"]:
        protected += list((ROOT / "assets/voice" / folder).glob("*.wav"))
    protected += [source_manifest, ROOT / "assets/voice/manifest.json", ROOT / "src/voiceBank.ts", ROOT / "shared/voiceTiming.json"]
    before = {p.relative_to(ROOT).as_posix(): sha(p) for p in protected}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    calls = []
    for original_call in manifest["calls"]:
        source_path = SOURCE / original_call["file"]
        assert sha(source_path) == original_call["sha256"]
        original = read_wav(source_path)
        pcm = np.zeros_like(original)
        for part in original_call["segments"]:
            start, length = part["startSample"], part["samples"]
            pcm[start:start + length] = fuller_phrase(original[start:start + length])
        current, pcm = finish_call(original_call, pcm)
        target = OUTPUT / original_call["file"]
        write_wav(target, pcm)
        current.update(sourceSha256=original_call["sha256"], sha256=sha(target))
        calls.append(current)
        print(f"{current['number']}: {current['durationMs']:.0f} ms, fuller resonance, original pitch", flush=True)
    assert all(sha(ROOT / path) == digest for path, digest in before.items()), "A source file changed"
    data = dict(pack=OUTPUT.name, experimental=True, sourcePack=SOURCE.name,
                sourceManifestSha256=sha(source_manifest), sourceModel=manifest["model"],
                speaker=manifest["speaker"], license=manifest["license"],
                formantShiftRatio=FORMANT_RATIO, pitchMedian="unchanged", pitchRangeFactor=1,
                speakingRateRatio=1, preservePhrasePauses=True, bodyGainDb=BODY_GAIN_DB,
                bodyCenterHz=320, highShelfDb=HIGH_SHELF_DB, highShelfCenterHz=4000,
                processingTool=f"Praat {parselmouth.PRAAT_VERSION} / Parselmouth {parselmouth.__version__}",
                protectedFiles=before, calls=calls)
    (OUTPUT / "manifest.json").write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(calls)} fuller calls; original packs and runtime files unchanged.", flush=True)


if __name__ == "__main__":
    main()
