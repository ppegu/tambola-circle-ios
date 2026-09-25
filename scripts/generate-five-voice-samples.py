"""Generate five distinct female voice audition clips, not full app packs.

Requires edge-tts==7.2.8, av and numpy in the existing D: voice environment.
Only the sample number-call text is sent to the speech service.
"""

import asyncio
import hashlib
import importlib.metadata
import json
import wave
from datetime import datetime, timezone
from pathlib import Path

import av
import edge_tts
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets/voice/female-voice-samples"
WORK = ROOT / "artifacts/voice-five-samples"
RATE = 22050
TEXT = "Single number one. Single number four. Single number six. Single number seven. Four, seven. Forty seven."
VOICES = [
    (1, "Neerja", "Indian English", "en-IN-NeerjaExpressiveNeural"),
    (2, "Ava", "US English", "en-US-AvaNeural"),
    (3, "Emma", "US English", "en-US-EmmaNeural"),
    (4, "Sonia", "British English", "en-GB-SoniaNeural"),
    (5, "Aria", "US English", "en-US-AriaNeural"),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare_audio(source, target):
    resampler = av.AudioResampler(format="s16", layout="mono", rate=RATE)
    chunks = []
    with av.open(str(source)) as container:
        for frame in container.decode(audio=0):
            chunks.extend(out.to_ndarray().reshape(-1) for out in resampler.resample(frame))
    chunks.extend(out.to_ndarray().reshape(-1) for out in resampler.resample(None))
    pcm = np.concatenate(chunks).astype(float)
    active = np.flatnonzero(np.abs(pcm) >= .003 * 32767)
    assert active.size, "Speech service returned silent audio"
    margin = round(RATE * .01)
    pcm = pcm[max(0, int(active[0]) - margin):min(len(pcm), int(active[-1]) + margin + 1)]
    pcm *= .18 * 32767 / np.sqrt(np.mean(pcm ** 2))
    knee, ceiling = .85 * 32767, np.floor(.95 * 32767)
    peaks = np.abs(pcm) > knee
    pcm[peaks] = np.sign(pcm[peaks]) * (
        knee + (ceiling - knee) * np.tanh((np.abs(pcm[peaks]) - knee) / (ceiling - knee))
    )
    fade = min(round(RATE * .003), len(pcm) // 2)
    pcm[:fade] *= np.linspace(0, 1, fade)
    pcm[-fade:] *= np.linspace(1, 0, fade)
    data = np.rint(pcm).astype("<i2")
    with wave.open(str(target), "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        out.writeframes(data.tobytes())
    return dict(durationMs=round(len(data) / RATE * 1000, 3), sampleRate=RATE,
                rms=round(float(np.sqrt(np.mean((data.astype(float) / 32767) ** 2))), 5),
                peak=round(float(np.max(np.abs(data.astype(float))) / 32767), 5), sha256=sha(target))


async def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    catalog_path = WORK / "available-voices.json"
    if not catalog_path.exists():
        available = await asyncio.wait_for(edge_tts.list_voices(), timeout=30)
        catalog_path.write_text(json.dumps(available, indent=2) + "\n", encoding="utf-8")
    catalog = {v["ShortName"]: v for v in json.loads(catalog_path.read_text(encoding="utf-8"))}
    assert all(catalog[v[3]]["Gender"] == "Female" for v in VOICES)
    protected = [p for p in (ROOT / "assets/voice").glob("*/*.wav") if p.parent != OUTPUT]
    protected += [ROOT / p for p in ("assets/voice/manifest.json", "src/voiceBank.ts", "shared/voiceTiming.json")]
    before = {p.relative_to(ROOT).as_posix(): sha(p) for p in protected}
    semaphore = asyncio.Semaphore(2)

    async def generate(spec):
        number, name, accent, voice = spec
        filename = f"{number:02d}-{name.lower()}.wav"
        raw = WORK / f"{number:02d}-{name.lower()}.mp3"
        async with semaphore:
            print(f"Generating {number}: {name} ({accent})...", flush=True)
            await asyncio.wait_for(edge_tts.Communicate(TEXT, voice, rate="-8%", pitch="+0Hz", volume="+0%").save(str(raw)), timeout=55)
        stats = prepare_audio(raw, OUTPUT / filename)
        print(f"Ready {number}: {name}, {stats['durationMs']/1000:.1f}s", flush=True)
        return dict(number=number, name=name, accent=accent, voice=voice, gender="Female",
                    file=filename, serviceMetadata=catalog[voice], sourceMp3Sha256=sha(raw), **stats)

    results = await asyncio.gather(*(generate(spec) for spec in VOICES), return_exceptions=True)
    failures = [type(r).__name__ for r in results if isinstance(r, Exception)]
    if failures:
        raise RuntimeError(f"Voice sample generation failed: {', '.join(failures)}")
    assert all(sha(ROOT / path) == digest for path, digest in before.items()), "An existing voice asset changed"
    manifest = dict(pack="female-voice-samples", purpose="Five distinct female voices for listening selection",
                    provider="Microsoft Edge online speech service", clientVersion=importlib.metadata.version("edge-tts"),
                    generatedAt=datetime.now(timezone.utc).isoformat(), text=TEXT, rate="-8%", pitch="+0Hz",
                    postProcessing="Outer silence trimmed, matched volume, brief edge fades; no pitch or formant shifting",
                    protectedFiles=before, voices=results)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Five distinct female samples generated; earlier packs and runtime files unchanged.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
