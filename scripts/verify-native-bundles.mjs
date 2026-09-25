import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { join } from 'node:path';
function walk(root) { return readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(root, entry.name)) : [join(root, entry.name)]); }
const expected = JSON.parse(readFileSync('shared/voicePacks.json', 'utf8')).packs
  .flatMap(pack => pack.bundled ? pack.files : pack.files.filter(clip => clip.number === 47))
  .map(clip => clip.sha256).sort();
for (const platform of ['android', 'ios']) {
  const root = `artifacts/bundles/${platform}`;
  const bundle = readFileSync(`${root}/index.${platform}.bundle`, 'utf8');
  assert(bundle.length > 1000, `${platform} bundle is missing`);
  assert(!bundle.includes('__CIRCLE_PUBLIC_API_URL__') && !bundle.includes('__CIRCLE_PUBLIC_SHARE_URL__'), 'Public configuration was not compiled');
  const actual = walk(root).filter(file => file.endsWith('.wav')).map(file => createHash('sha256').update(readFileSync(file)).digest('hex')).sort();
  assert.deepEqual(actual, expected, `${platform} voices are missing, duplicated or changed`);
  console.log(`${platform}: standalone JS, 90 Aria calls and four offline voice previews verified (${actual.length} clips)`);
}
