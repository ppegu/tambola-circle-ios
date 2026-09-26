"""Generate complete Aria/default and optional female number-call packs on D:.

Uses the same service voice IDs and unshifted pitch as the approved auditions.
Raw responses are cached for resumable generation; no credentials are required.
"""
import asyncio
import hashlib
import json
import shutil
from pathlib import Path

import edge_tts
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "artifacts/caller-packs"
PUBLIC = ROOT / "voice-packs/public"
spec = spec_from_file_location("auditions", ROOT / "scripts/generate-five-voice-samples.py")
auditions = module_from_spec(spec)
spec.loader.exec_module(auditions)
VOICES = [("aria", "Aria", "US English", "en-US-AriaNeural"),
          ("neerja", "Neerja", "Indian English", "en-IN-NeerjaExpressiveNeural"),
          ("ava", "Ava", "US English", "en-US-AvaNeural"),
          ("emma", "Emma", "US English", "en-US-EmmaNeural"),
          ("sonia", "Sonia", "British English", "en-GB-SoniaNeural")]
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "zero ten twenty thirty forty fifty sixty seventy eighty ninety".split()


def words(n):
    return ONES[n] if n < 20 else TENS[n // 10] + (" " + ONES[n % 10] if n % 10 else "")


def text_for(n):
    if n < 10:
        return f"Single number {words(n)}."
    return f"{ONES[n // 10].capitalize()}, {ONES[n % 10]}. {words(n).capitalize()}."


async def main():
    WORK.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    limit = asyncio.Semaphore(3)
    catalog = []
    for id, name, accent, voice in VOICES:
        folder = WORK / id
        folder.mkdir(exist_ok=True)
        done = 0

        async def generate(n):
            nonlocal done
            text = text_for(n)
            source = folder / f"{n}.mp3"
            stamp = folder / f"{n}.source.json"
            settings = {"text": text, "voice": voice, "rate": "-8%", "pitch": "+0Hz"}
            async with limit:
                cached = source.exists() and stamp.exists() and json.loads(stamp.read_text()) == settings
                if not cached:
                    for attempt in range(4):
                        try:
                            await asyncio.wait_for(edge_tts.Communicate(text, voice, rate="-8%", pitch="+0Hz").save(str(source)), 55)
                            stamp.write_text(json.dumps(settings), encoding="utf-8")
                            break
                        except Exception:
                            if attempt == 3:
                                raise RuntimeError(f"Speech service failed for {id}/{n}") from None
                            await asyncio.sleep(2 ** (attempt + 1))
                wav = folder / f"{n}.wav"
                stats = auditions.prepare_audio(source, wav)
                if not 500 < stats["durationMs"] < 7500:
                    raise RuntimeError(f"Unexpected duration for {id}/{n}: {stats['durationMs']}")
                done += 1
                if done % 10 == 0:
                    print(f"{name}: {done}/90", flush=True)
                return {"number": n, "bytes": wav.stat().st_size, "sha256": stats["sha256"],
                        "durationMs": stats["durationMs"], "text": text}

        files = await asyncio.gather(*(generate(n) for n in range(1, 91)))
        revision = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()[:16]
        dest = ROOT / "assets/voice/aria" if id == "aria" else PUBLIC / "packs" / id / revision
        dest.mkdir(parents=True, exist_ok=True)
        for item in files:
            shutil.copy2(folder / f"{item['number']}.wav", dest / f"{item['number']}.wav")
        pack = {"id": id, "name": name, "accent": accent, "serviceVoice": voice,
                "revision": revision, "bundled": id == "aria", "totalBytes": sum(f["bytes"] for f in files),
                "files": files}
        catalog.append(pack)
        (dest / "manifest.json").write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")
        print(f"{name} complete: {pack['totalBytes']} bytes, revision {revision}", flush=True)
    result = {"schema": 1, "defaultVoice": "aria", "provider": "Microsoft Edge online speech service",
              "rate": "-8%", "pitch": "+0Hz", "packs": catalog}
    (ROOT / "shared/voicePacks.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    (PUBLIC / "catalog.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    # Shared server timing must also accommodate every optional offline pack.
    legacy = json.loads((ROOT / "assets/voice/manifest.json").read_text(encoding="utf-8"))
    timings = {str(n): max([c["durationMs"] for c in legacy if c["number"] == n] +
                           [p["files"][n - 1]["durationMs"] for p in catalog]) for n in range(1, 91)}
    (ROOT / "shared/voiceTiming.json").write_text(json.dumps(timings, indent=2) + "\n", encoding="utf-8")
    print("All five complete packs are ready.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
