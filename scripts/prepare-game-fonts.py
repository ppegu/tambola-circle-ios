"""Create native static instances from the official Fredoka variable font.

Usage: python scripts/prepare-game-fonts.py path/to/Fredoka-variable.ttf
Requires fontTools; install tools into a D: workspace virtualenv/target.
Source: https://github.com/google/fonts/tree/main/ofl/fredoka
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

output = Path(__file__).resolve().parents[1] / 'assets/native/fonts'
output.mkdir(parents=True, exist_ok=True)
for style, weight in [('Medium', 500), ('Bold', 700)]:
    font = instantiateVariableFont(TTFont(sys.argv[1]), {'wght': weight, 'wdth': 100}, inplace=True)
    family = f'Fredoka-{style}'
    # Each native family is a concrete weight: avoid platform-synthesized bold.
    for platform, encoding, language in [(3, 1, 0x409), (1, 0, 0)]:
        for name_id, value in [(1, family), (2, 'Regular'), (4, family), (6, family), (16, family), (17, 'Regular')]:
            font['name'].setName(value, name_id, platform, encoding, language)
    font.save(output / f'{family}.ttf')
    print(output / f'{family}.ttf')
