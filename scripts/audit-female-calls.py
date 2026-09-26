"""Local recognition sanity check; not a replacement for human listening."""
import json
import wave
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parent.parent
model = WhisperModel('base.en', device='cpu', compute_type='int8', cpu_threads=2,
    download_root=str(root / '.tools/whisper-models'), local_files_only=True)
results = []
for start in range(1, 91, 9):
    numbers = list(range(start, min(91, start + 9)))
    chunks = []
    for n in numbers:
        with wave.open(str(root / f'assets/voice/en-female/{n}.wav'), 'rb') as audio:
            rate = audio.getframerate()
            pcm = np.frombuffer(audio.readframes(audio.getnframes()), dtype='<i2').astype(np.float32) / 32768
        chunks.extend([np.interp(np.arange(0, len(pcm), rate / 16000), np.arange(len(pcm)), pcm).astype(np.float32), np.zeros(3200, dtype=np.float32)])
    segments, _ = model.transcribe(np.concatenate(chunks), language='en', beam_size=5,
        temperature=0, vad_filter=False, condition_on_previous_text=False)
    item = dict(numbers=numbers, transcript=' '.join(s.text.strip() for s in segments))
    results.append(item)
    print(json.dumps(item), flush=True)
(root / 'artifacts/voice-recognition-1.2.1.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
