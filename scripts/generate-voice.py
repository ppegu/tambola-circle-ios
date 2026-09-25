"""Female number calls with deliberate word spacing and consistent loudness.
One unhurried synthesis speed; never rush the voice to fit a call interval.
No neural runtime ships in the app.
"""
import hashlib
import io
import json
from pathlib import Path
import sys
import os
import urllib.request
import wave
import numpy as np
import onnxruntime
from piper import PiperVoice, SynthesisConfig
from piper.config import PiperConfig

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / '.tools' / 'piper-models'
MODEL_DIR.mkdir(parents=True, exist_ok=True)
models = json.loads((ROOT / 'scripts/voice-models.json').read_text(encoding='utf-8-sig'))
phrases = json.load(sys.stdin)
models = [m for m in models if m['key'] == 'female']
manifest = []

# This model's default phonemizer renders "One." as weakly stressed wɒn.
# Force the clear, stressed /wʌn/ vowel while retaining the same female voice.
PRONUNCIATION_OVERRIDES = {'one': '[[wˈʌn.]]', 'four': '[[fˈɔːɹ.]]'}
# Restore the model's normal acoustic variation for the words whose fricatives
# sounded buzzy at zero noise. Duration variation stays disabled for even pace.
NATURAL_WORDS = {'single', 'six', 'seven', 'four'}

def trimmed(samples, rate):
    audible = np.flatnonzero(np.abs(samples) >= 32)
    if not len(audible):
        raise ValueError("Silent synthesis")
    return samples[audible[0]:audible[-1] + 1].copy()

for model in models:
    name = model['model']
    for filename in [name + '.onnx', name + '.onnx.json']:
        target = MODEL_DIR / filename
        expected = model['sha256'][filename]
        if not target.exists() or hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            print('Downloading pinned model: ' + filename, flush=True)
            with urllib.request.urlopen(model['base_url'] + filename, timeout=120) as response, target.open('wb') as output:
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
        if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
            raise ValueError('Voice model checksum mismatch: ' + filename)
    session_options = onnxruntime.SessionOptions()
    session_options.intra_op_num_threads = 2
    session_options.inter_op_num_threads = 1
    def make_voice(seed=None):
        if seed is not None:
            onnxruntime.set_seed(seed)
        return PiperVoice(config=PiperConfig.from_dict(json.loads((MODEL_DIR / (name + '.onnx.json')).read_text(encoding='utf-8'))),
            session=onnxruntime.InferenceSession(str(MODEL_DIR / (name + '.onnx')), sess_options=session_options, providers=['CPUExecutionProvider']))
    voice = make_voice()
    folder = 'en-female'
    out_dir = ROOT / 'assets/voice' / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    def synthesize(text, scale):
        natural = text in NATURAL_WORDS
        # A fixed per-word seed AND a fresh session reset ONNX random operators;
        # regeneration stays byte-identical, independent of other word calls.
        seed = int.from_bytes(hashlib.sha256(text.encode()).digest()[:4], 'little') & 0x7fffffff
        speaker = make_voice(seed) if natural else voice
        config = SynthesisConfig(length_scale=scale, noise_scale=0.667 if natural else 0.0, noise_w_scale=0.0, normalize_audio=True)
        stream = io.BytesIO()
        with wave.open(stream, 'wb') as wav_file:
            speaker.synthesize_wav(PRONUNCIATION_OVERRIDES.get(text, text.capitalize() + '.'), wav_file, syn_config=config)
        stream.seek(0)
        with wave.open(stream, 'rb') as wav_file:
            rate = wav_file.getframerate()
            samples = np.frombuffer(wav_file.readframes(wav_file.getnframes()), dtype='<i2').astype(np.float64)
        samples = trimmed(samples, rate)
        rms = np.sqrt(np.mean(samples * samples))
        # Aim for clear, even spoken-word loudness. Soft-limit occasional peaks
        # instead of reducing an entire word because of one plosive.
        samples *= 0.24 * 32767 / max(1, rms)
        ceiling = 0.95 * 32767
        samples = ceiling * np.tanh(samples / ceiling)
        fade = min(round(rate * 0.003), len(samples) // 2)
        samples[:fade] *= np.linspace(0, 1, fade)
        samples[-fade:] *= np.linspace(1, 0, fade)
        if text == 'one':
            # Match "two" after limiting/fades; never exceed the safe peak.
            rms = np.sqrt(np.mean(samples * samples))
            samples *= min(0.215 * 32767 / rms, ceiling / np.max(np.abs(samples)))
        return rate, samples.astype('<i2')

    # Reuse exactly the same spoken word everywhere: "one" has the same pace
    # and volume in 1, 12, 21, and every other call. All gaps are intentional.
    texts = sorted({word for p in phrases for k in ('digits', 'full') if p[k] for word in p[k].split()})
    scale = 1.20
    word_gap_ms = 180
    clips = {}
    for i, text in enumerate(texts):
        clips[text] = synthesize(text, scale)
        print(f'Female word {i + 1}/{len(texts)}: {text} at shared speed {scale:.2f}', flush=True)

    def compose(words):
        rate = clips[words[0]][0]
        pieces, segments, offset = [], [], 0
        for index, word in enumerate(words):
            if index:
                gap = np.zeros(round(rate * word_gap_ms / 1000), dtype='<i2')
                pieces.append(gap)
                offset += len(gap)
            samples = clips[word][1]
            segments.append(dict(word=word, startSample=offset, samples=len(samples)))
            pieces.append(samples)
            offset += len(samples)
        return rate, np.concatenate(pieces), segments

    for phrase in phrases:
        rate, full, full_segments = compose(phrase['full'].split())
        digits, digit_segments = np.zeros(0, dtype='<i2'), []
        if phrase['digits']:
            _, digits, digit_segments = compose(phrase['digits'].split())
        gap = np.zeros(round(rate * 0.5) if len(digits) else 0, dtype='<i2')
        pcm = np.concatenate([digits, gap, full])
        segments = digit_segments + [dict(segment, startSample=segment['startSample'] + len(digits) + len(gap)) for segment in full_segments]
        if pcm.nbytes >= 1024 * 1024:
            raise ValueError('Voice exceeds SoundPool sample capacity')
        filename = str(phrase['number']) + '.wav'
        output = out_dir / filename
        with wave.open(str(output), 'wb') as wav_file:
            wav_file.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
            wav_file.writeframes(pcm.tobytes())
        manifest.append(dict(voice='female', number=phrase['number'], part='full',
            text=(phrase['digits'] + '. ' if phrase['digits'] else '') + phrase['full'] + '.',
            digits=phrase['digits'], full=phrase['full'], file=f'{folder}/{filename}', model=name,
            cadenceVersion=8, digitSamples=len(digits), fullSamples=len(full), lengthScale=scale,
            wordGapMs=word_gap_ms, segments=segments,
            gapMs=500 if len(digits) else 0, durationMs=len(pcm) / rate * 1000, sampleRate=rate,
            sha256=hashlib.sha256(output.read_bytes()).hexdigest()))
        print(f"Female caller {phrase['number']}/90", flush=True)
(ROOT / 'assets/voice/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
(ROOT / 'shared/voiceTiming.json').write_text(json.dumps({str(c['number']): int(np.ceil(c['durationMs'])) for c in manifest}, indent=2) + '\n', encoding='utf-8')
print(f'Generated {len(manifest)} offline speech clips with deterministic cadence.', flush=True)
