"""Local-only review of complete caller packs without publishing them."""
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "assets/voice"), **kwargs)

    def translate_path(self, path):
        name = unquote(urlsplit(path).path)
        if name == "/caller-packs/catalog.json":
            return str(ROOT / "shared/voicePacks.json")
        match = re.fullmatch(r"/caller-packs/(aria|neerja|ava|emma|sonia)/([1-9]|[1-8][0-9]|90)\.wav", name)
        if match:
            id, number = match.groups()
            if id == "aria":
                return str(ROOT / "assets/voice/aria" / f"{number}.wav")
            catalog = json.loads((ROOT / "shared/voicePacks.json").read_text(encoding="utf-8"))
            pack = next(p for p in catalog["packs"] if p["id"] == id)
            return str(ROOT / "voice-packs/public/packs" / id / pack["revision"] / f"{number}.wav")
        # Only expose the existing voice review directory and the explicit routes above.
        return super().translate_path(path)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 8795), Handler)
    print("Voice review at http://127.0.0.1:8795/female-voice-samples/review.html", flush=True)
    server.serve_forever()
