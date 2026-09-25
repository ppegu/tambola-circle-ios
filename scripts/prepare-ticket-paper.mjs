// Pre-render our code-defined paper texture once, instead of masking it every frame.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const dir = new URL('../assets/game-v3/native/', import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, h, radius, step] of [['ticket-paper', 140, 10, 9], ['paper', 150, 5, 12], ['paper-large', 450, 18, 30]]) {
  const w = 340;
  const holes = Array.from({ length: Math.floor((h - 16) / step) }, (_, i) => `<circle cx="0" cy="${10 + i * step}" r="2" fill="black"/><circle cx="${w}" cy="${10 + i * step}" r="2" fill="black"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 3}" height="${h * 3}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fff8e4"/><stop offset=".52" stop-color="#fcecc9"/><stop offset="1" stop-color="#f6e2bb"/></linearGradient><pattern id="grain" width="13" height="11" patternUnits="userSpaceOnUse"><path d="M1 2h1 M8 6h.6 M4 10h.7" stroke="#9c682c" stroke-width=".4" opacity=".13"/></pattern><mask id="edge"><rect width="${w}" height="${h}" rx="${radius}" fill="white"/>${holes}</mask></defs><g mask="url(#edge)"><rect x=".7" y=".7" width="${w - 1.4}" height="${h - 1.4}" rx="${radius}" fill="url(#paper)" stroke="#f9e0ac" stroke-width="1.4"/><rect width="${w}" height="${h}" fill="url(#grain)"/></g></svg>`;
  writeFileSync(new URL(`${name}.png`, dir), new Resvg(svg).render().asPng());
}
console.log('Prepared three native paper textures.');
