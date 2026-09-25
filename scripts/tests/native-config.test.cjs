const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const publicConfig = require('../public-config.cjs');
test('Metro ignores transient build folders with both crawler and Windows watcher paths', () => {
  const patterns = require('../../metro.config').resolver.blockList;
  const ignored = value => patterns.some(pattern => pattern.test(value));
  const root = path.resolve(__dirname, '../..');
  for (const folder of ['artifacts', '.tools', 'server/.wrangler', 'server/legacy-proxy/.wrangler', 'android/app/build']) {
    for (const value of [folder + '/tmp/bundle', path.join(root, folder, 'tmp/bundle')]) {
      assert.ok(ignored(value.replaceAll('\\', '/')), value);
      assert.ok(ignored(value.replaceAll('/', '\\')), value);
    }
  }
  assert.equal(ignored(path.join(root, 'src/online/TableScreen.tsx')), false);
  assert.equal(ignored(path.join(root, 'shared/online.ts')), false);
});
test('only public app configuration is exposed, with process > local > base precedence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'circle-config-'));
  try {
    fs.writeFileSync(path.join(dir, '.env'), 'APP_PUBLIC_API_URL=https://base.example\nAUTH_SECRET=never-bundle-me\nAPP_PUBLIC_SHARE_URL=https://share.example\n');
    fs.writeFileSync(path.join(dir, '.env.local'), 'APP_PUBLIC_API_URL=https://local.example\n');
    assert.equal(publicConfig(dir, {}).__CIRCLE_PUBLIC_API_URL__, 'https://local.example');
    assert.deepEqual(publicConfig(dir, { APP_PUBLIC_API_URL: 'https://ci.example', AUTH_SECRET: 'private' }), {
      __CIRCLE_PUBLIC_API_URL__: 'https://ci.example', __CIRCLE_PUBLIC_SHARE_URL__: 'https://share.example',
    });
    assert.equal(publicConfig(dir, { APP_PUBLIC_API_URL: '' }).__CIRCLE_PUBLIC_API_URL__, '');
  } finally {
    // Delete only the two fixture files created above, then their empty directory.
    fs.unlinkSync(path.join(dir, '.env')); fs.unlinkSync(path.join(dir, '.env.local')); fs.rmdirSync(dir);
  }
});
test('Babel emits configured native URLs without public placeholders or private environment values', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', 'process.stdout.write(require("@babel/core").transformFileSync("src/config.ts").code)'], {
    cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', env: { ...process.env, APP_PUBLIC_API_URL: 'https://native.example', APP_PUBLIC_SHARE_URL: '', AUTH_SECRET: 'do-not-embed' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /https:\/\/native.example/);
  assert.doesNotMatch(result.stdout, /__CIRCLE_PUBLIC_|do-not-embed/);
});
