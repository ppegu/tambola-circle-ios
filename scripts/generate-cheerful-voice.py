"""Generate an isolated, expressive female number pack for listening tests.

Run with .tools/voice-venv/Scripts/python.exe after use-d-drive.ps1.
The approved pack, runtime registry and server timings are never written.
"""

import argparse
import hashlib
import io
import json
import wave
from pathlib import Path

import numpy as np
import onnxruntime as ort
from piper import PiperVoice, SynthesisConfig
from piper.config import PiperConfig

ROOT = Path(__file__).resolve().parent.parent
MODEL_NAME = "en_GB-semaine-medium"
MODEL = ROOT / ".tools/piper-models" / (MODEL_NAME + ".onnx")
MODEL_SHA256 = "d6dab6f3b92db43ea3f78c7f20dc8eadb47a1f15d8a1c9d451cf3ccd201a2f66"
CONFIG_SHA256 = "6425dcb878684043b77d772b173ae006d86a583b110303edda48b8438ecee5ee"
REVISION = "c10ece1aade47bb51c153c893d14e5bf8e5b7117"
OUTPUT = ROOT / "assets/voice/en-female-cheerful-test"
RATE = 22050
LENGTH_SCALE = 1.12
GAP_MS = 500
SEED = 20260923
ARTICULATION_OVERRIDES = {"Three, zero!": "Three. Zero!"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def protected_hashes():
    paths = list((ROOT / "assets/voice/en-female").glob("*.wav"))
    paths += [ROOT / p for p in (
        "assets/voice/manifest.json", "shared/voiceTiming.json", "src/voiceBank.ts"
    )]
    return {p.relative_to(ROOT).as_posix(): sha(p) for p in paths}


def write_wav(path, samples):
    with wave.open(str(path), "wb") as out:
        out.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        out.writeframes(samples.astype("<i2").tobytes())


def make_voice(config):
    # Reuse the loaded model. A fixed seed and canonical call order make a full
    # pack reproducible without paying model-loading cost for every phrase.
    ort.set_seed(SEED)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    return PiperVoice(
        session=ort.InferenceSession(str(MODEL), sess_options=options, providers=["CPUExecutionProvider"]),
        config=config,
    )


def synthesize(text, voice):
    stream = io.BytesIO()
    with wave.open(stream, "wb") as out:
        voice.synthesize_wav(text, out, syn_config=SynthesisConfig(
            speaker_id=3, length_scale=LENGTH_SCALE,
            noise_scale=0.667, noise_w_scale=0.0, normalize_audio=True,
        ))
    stream.seek(0)
    with wave.open(stream, "rb") as wav:
        assert wav.getframerate() == RATE and wav.getnchannels() == 1
        samples = np.frombuffer(wav.readframes(wav.getnframes()), dtype="<i2").astype(float)
    active = np.flatnonzero(np.abs(samples) >= 64)
    if not active.size:
        raise ValueError(f"Silent synthesis: {text}")
    # Keep 5 ms to protect quiet consonant onsets, with no long outer silence.
    margin = round(RATE * 0.005)
    samples = samples[max(0, active[0] - margin):min(len(samples), active[-1] + margin + 1)]
    rms = float(np.sqrt(np.mean(samples * samples)))
    samples *= 0.24 * 32767 / max(1, rms)
    ceiling = 0.95 * 32767
    samples = ceiling * np.tanh(samples / ceiling)
    # Some utterances retain a low-level breath/noise tail after gain. Trim
    # again at the final listening level so it cannot leave a long quiet end.
    active = np.flatnonzero(np.abs(samples) >= 0.005 * 32767)
    samples = samples[max(0, active[0] - margin):min(len(samples), active[-1] + margin + 1)]
    fade = min(round(RATE * 0.003), len(samples) // 2)
    samples[:fade] *= np.linspace(0, 1, fade)
    samples[-fade:] *= np.linspace(1, 0, fade)
    return samples.astype("<i2")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--numbers", nargs="*", type=int, help="Generate selected preview calls only")
    args = parser.parse_args()
    assert MODEL.is_file(), f"Download the model described in {OUTPUT / 'README.md'} first"
    assert sha(MODEL) == MODEL_SHA256, "Unexpected model hash"
    config_path = MODEL.with_suffix(".onnx.json")
    assert sha(config_path) == CONFIG_SHA256, "Unexpected model configuration hash"
    model_config = PiperConfig.from_dict(json.loads(config_path.read_text(encoding="utf-8")))
    assert model_config.speaker_id_map["poppy"] == 3
    source = json.loads((ROOT / "assets/voice/manifest.json").read_text(encoding="utf-8"))
    assert len(source) == 90 and {r["number"] for r in source} == set(range(1, 91))
    numbers = set(args.numbers or range(1, 91))
    assert numbers <= set(range(1, 91)), "Numbers must be 1 through 90"
    before = protected_hashes()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    records = []
    cache = {}
    articulation_cache = {}
    articulation_voice = make_voice(model_config)
    voice = make_voice(model_config)
    for call in sorted(source, key=lambda item: item["number"]):
        n = call["number"]
        if n > max(numbers):
            break
        # Phrase synthesis preserves the speaker's expressive intonation.
        # Commas separate digits and the three single-number words clearly.
        full = call["full"].capitalize() + "!"
        if n < 10:
            full = ", ".join(call["full"].split()).capitalize() + "!"
        phrases = ([", ".join(call["digits"].split()).capitalize() + "!"] if call["digits"] else []) + [full]
        pieces = []
        segments = []
        cursor = 0
        for phrase in phrases:
            if pieces:
                gap = np.zeros(round(RATE * GAP_MS / 1000), dtype="<i2")
                pieces.append(gap)
                cursor += len(gap)
            if phrase not in cache:
                cache[phrase] = synthesize(phrase, voice)
            samples = cache[phrase]
            spoken = ARTICULATION_OVERRIDES.get(phrase, phrase)
            if spoken != phrase:
                # Preserve the main voice's random sequence, while an isolated
                # session adds a clearer boundary for this ambiguous digit pair.
                if spoken not in articulation_cache:
                    articulation_cache[spoken] = synthesize(spoken, articulation_voice)
                samples = articulation_cache[spoken]
            segments.append({"text": spoken, "startSample": cursor, "samples": len(samples)})
            pieces.append(samples)
            cursor += len(samples)
        pcm = np.concatenate(pieces)
        # Even subset previews synthesize earlier calls in canonical order, so
        # their random operators reach the same state as a complete pack run.
        if n not in numbers:
            continue
        path = OUTPUT / f"{n}.wav"
        write_wav(path, pcm)
        record = dict(number=n, text=call["text"], synthesisText=" ".join(s["text"] for s in segments),
                      digits=call["digits"], full=call["full"], file=path.name,
                      durationMs=round(len(pcm) / RATE * 1000, 3), sampleRate=RATE,
                      segments=segments, gapMs=GAP_MS if n >= 10 else 0,
                      peak=round(float(np.max(np.abs(pcm.astype(float))) / 32767), 5),
                      rms=round(float(np.sqrt(np.mean((pcm.astype(float) / 32767) ** 2))), 5),
                      sha256=sha(path))
        records.append(record)
        print(f"{n}: {record['durationMs']:.0f} ms, peak {record['peak']:.3f}: {record['synthesisText']}", flush=True)
    assert protected_hashes() == before, "The approved voice or runtime files changed during generation"
    manifest = dict(pack="en-female-cheerful-test", experimental=True, model=MODEL_NAME,
                    modelRevision=REVISION, modelSha256=MODEL_SHA256,
                    configSha256=sha(config_path), speaker="poppy", speakerId=3,
                    lengthScale=LENGTH_SCALE, noiseScale=0.667, noiseWScale=0.0,
                    seed=SEED, generationOrder="ascending number; digits then full phrase",
                    articulationOverrides=ARTICULATION_OVERRIDES,
                    license="CC-BY-NC-SA-4.0", approvedFiles=before, calls=records)
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(records)} calls in {OUTPUT}; approved files unchanged.", flush=True)


if __name__ == "__main__":
    main()
