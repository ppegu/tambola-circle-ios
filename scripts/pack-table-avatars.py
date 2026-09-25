"""Package generated artwork as small bundled native assets; retain originals on D:."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json, shutil, hashlib

root = Path(__file__).resolve().parent.parent
rows = json.loads((root / 'artifacts/table-avatar-source-map.json').read_text())
out = root / 'assets/table-avatars'
out.mkdir(exist_ok=True)
originals = root / 'artifacts/table-avatar-originals'
originals.mkdir(exist_ok=True)
board = Image.new('RGB', (1000, 880), '#24063c')
draw = ImageDraw.Draw(board)
for i, row in enumerate(rows):
    source = Path(row['path'])
    shutil.copyfile(source, originals / (row['id'] + '.png'))
    picture = ImageOps.fit(Image.open(source).convert('RGB'), (256, 256), method=Image.Resampling.LANCZOS)
    picture.save(out / (row['id'] + '.png'), optimize=True)
    board.paste(picture.resize((184, 184), Image.Resampling.LANCZOS), ((i % 5) * 200 + 8, (i // 5) * 220 + 8))
    draw.text(((i % 5) * 200 + 8, (i // 5) * 220 + 196), row['id'], fill='#ffe39b')
    row['file'] = row['id'] + '.png'
    row['sha256'] = hashlib.sha256((out / row['file']).read_bytes()).hexdigest()
    row.pop('path')
board.save(root / 'design-v4/table-avatars.png')
(out / 'manifest.json').write_text(json.dumps({
    'generator': 'Built-in image_gen', 'size': 256,
    'promptTemplate': 'Single square polished friendly 3D cartoon circular portrait badge of {subject}. Glossy deep purple enamel background, narrow bevelled golden rim, warm studio light, expressive faces, jewel tones. Centered close busts, readable at 64px. Circle fits fully in square, outside circle deep purple #31065b. No text, numbers, watermark or extra panels. Final mobile game asset.',
    'avatars': rows,
}, indent=2))
print('20 bundled avatars:', sum(p.stat().st_size for p in out.glob('*.png')), 'bytes')
