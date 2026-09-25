// Local integration only: exercises real D1/R2, signatures, HTTP gates and socket revocation.
import assert from 'node:assert/strict';
import { createHash, createPublicKey, randomBytes, randomUUID, verify } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const base = 'http://127.0.0.1:8792', pkg = 'com.ppegu.tambola.dev';
const privateMaterial = JSON.parse(readFileSync('.credentials/update-signing.json', 'utf8'));
const publicKey = createPublicKey({ key: Buffer.from(privateMaterial.publicKey, 'base64'), format: 'der', type: 'spki' });
const directory = resolve('artifacts/updates'); mkdirSync(directory, { recursive: true });
let checks = 0, sequence = 0;
const sockets = [];
async function api(path, body, token, expected = 200) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Connection: 'close', 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.1.' + Math.floor(sequence / 250) + '.' + (++sequence % 250 + 1), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, expected, path + ': ' + JSON.stringify(data)); checks++; return data;
}
const admin = (action, body, expected = 200) => api('/v2/admin/app/' + action, body, privateMaterial.adminToken, expected);
function decision(signed, kind) { assert.ok(verify('RSA-SHA256', Buffer.from(signed.payload), publicKey, Buffer.from(signed.signature, 'base64'))); const value = JSON.parse(signed.payload); assert.equal(value.decision, kind); checks += 2; return value; }
const info = { platform: 'android', platformScopedId: 'local-updater-test-' + randomUUID(), brand: 'Test', manufacturer: 'Test', modelName: 'Local QA', modelId: null, osName: 'Android', osVersion: '13', appId: pkg, appVersion: '1.4.0-dev', appBuild: '9', isPhysicalDevice: false, sdkInt: 33, abis: ['arm64-v8a'] };
const identity = { key: 'd_' + randomBytes(32).toString('hex'), deviceUuid: randomUUID() };
const open = (patch = {}) => api('/v2/devices/open', { deviceUuid: identity.deviceUuid, info: { ...info, ...patch }, accessCapability: 1 }, identity.key);
const bytes = Buffer.from('Local integration fixture, not an installable APK.\n'.repeat(12000)), hash = createHash('sha256').update(bytes).digest('hex');
writeFileSync(resolve(directory, 'fixture.apk'), bytes);
const stamp = Date.now(), low = 100000 + Math.floor(stamp / 1000) % 1000000, high = low + 1;
info.appBuild = String(low);
async function register(code) {
  const objectKey = 'android/' + pkg + '/' + code + '/' + hash + '.apk';
  const command = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'r2', 'object', 'put', 'tambola-circle-releases/' + objectKey, '--file', resolve(directory, 'fixture.apk'), '--local', '--persist-to', '.tools/update-test-state', '--config', 'server/wrangler.jsonc'], { encoding: 'utf8', env: process.env });
  writeFileSync(resolve(directory, 'fixture-upload-' + code + '.log'), command.stdout + command.stderr);
  assert.equal(command.status, 0, 'Local R2 upload failed; see fixture upload log.');
  const release = { id: 'qa-' + code, packageId: pkg, versionCode: code, versionName: '1.4.0-qa.' + code, bytes: bytes.length, sha256: hash, signerSha256: 'b'.repeat(64), minSdk: 24, abis: ['arm64-v8a'], url: base + '/download/android/files/' + pkg + '/' + code + '/' + hash + '.apk', notes: ['Smoother games', 'Important fixes'], publishedAt: stamp };
  await admin('releases', { release }, 201); return release;
}
async function setPolicy(patch = {}) {
  const current = (await admin('status')).policies.find(p => p.package_id === pkg);
  return admin('policy', { packageId: pkg, expectedRevision: current.revision, latestBuild: current.latest_build, minimumBuild: current.minimum_build, locked: !!current.locked, message: current.message, offlineHours: current.offline_hours, requireMetadata: !!current.require_metadata, reason: 'Local update integration verification', ...patch });
}
async function socket(tableId) {
  const { ticket } = await api('/v2/tables/' + tableId + '/socket', {}, identity.key);
  const ws = new WebSocket(base.replace('http:', 'ws:') + '/v2/tables/' + tableId + '/ws?ticket=' + ticket);
  const messages = []; ws.addEventListener('message', event => messages.push(JSON.parse(event.data)));
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); setTimeout(() => reject(new Error('WebSocket timeout')), 15000).unref(); });
  sockets.push(ws); return { ws, messages };
}
async function closed(ws, timeout = 45000) { if (ws.readyState >= 2) return; await new Promise((resolve, reject) => { ws.addEventListener('close', resolve, { once: true }); setTimeout(() => reject(new Error('Blocked passive socket was not closed')), timeout).unref(); }); }
try {
  await api('/v2/admin/app/status', undefined, 'invalid', 403);
  const old = await register(low), release = await register(high);
  const duplicate = { ...release, versionCode: high + 1, versionName: release.versionName + '.new', url: release.url.replace('/' + high + '/', '/' + (high + 1) + '/') };
  await admin('releases', { release: duplicate }, 409);
  await admin('releases', { release: { ...duplicate, id: duplicate.id + '-new', versionName: release.versionName } }, 409);
  await setPolicy({ latestBuild: high, minimumBuild: 1, locked: false, offlineHours: 24 });
  decision((await open()).access, 'optional_update');
  const { profile } = await api('/v2/device', { deviceKey: identity.key, deviceUuid: identity.deviceUuid, name: 'Updater QA', mobile: '+919876543210', source: 'device_selected', consent: true }, null, 201);
  const { snapshot } = await api('/v2/tables', { visibility: 'private', createId: randomUUID(), name: 'Updater integration' }, identity.key, 201);
  const live = await socket(snapshot.id);
  const block = await admin('block', { kind: 'device', target: identity.deviceUuid, reason: 'Local integration device guard', matchReinstalls: true }, 201);
  await closed(live.ws, 10000); assert.ok(live.messages.some(m => m.type === 'access')); checks++;
  decision((await api('/v2/wallet', undefined, identity.key, 403)).access, 'device_blocked');
  decision((await open({ appBuild: String(high) })).access, 'device_blocked');
  // A new installation identity retains the signer-scoped Android ID restriction.
  const reinstall = { deviceUuid: randomUUID(), key: 'd_' + randomBytes(32).toString('hex') };
  decision((await api('/v2/devices/open', { deviceUuid: reinstall.deviceUuid, info, accessCapability: 1 }, reinstall.key)).access, 'device_blocked');
  await admin('unblock', { id: block.id, reason: 'Local guard recovery' }); decision((await open()).access, 'optional_update');
  await setPolicy({ minimumBuild: high });
  decision((await open()).access, 'required_update');
  const incompatible = decision((await open({ abis: ['x86'] })).access, 'release_blocked');
  assert.equal(incompatible.release, undefined); checks++;
  await open();
  await api('/v2/tables/' + snapshot.id + '/socket', {}, identity.key, 403);
  // Required floors never point at an absent replacement, even under stale writes.
  const status = await admin('status'), p = status.policies.find(p => p.package_id === pkg);
  await admin('policy', { packageId: pkg, expectedRevision: p.revision - 1, latestBuild: high, minimumBuild: high, locked: false, message: '', offlineHours: 24, requireMetadata: false, reason: 'Stale save test' }, 409);
  await admin('release-status', { packageId: pkg, versionCode: high, status: 'archived', reason: 'Cannot retire replacement' }, 400);
  const full = await fetch(release.url); assert.equal(full.status, 200); assert.equal(createHash('sha256').update(Buffer.from(await full.arrayBuffer())).digest('hex'), hash); checks += 2;
  const part = await fetch(release.url, { headers: { Range: 'bytes=100-199', 'If-Range': '"' + hash + '"' } }); assert.equal(part.status, 206); assert.equal(part.headers.get('content-range'), 'bytes 100-199/' + bytes.length); assert.deepEqual(Buffer.from(await part.arrayBuffer()), bytes.subarray(100, 200)); checks += 3;
  assert.equal((await fetch(release.url, { headers: { Range: 'bytes=999999999-' } })).status, 416); checks++;
  assert.equal((await fetch(release.url, { headers: { Range: 'bytes=100-', 'If-Range': '"old"' } })).status, 200); checks++;
  await admin('release-status', { packageId: pkg, versionCode: low, status: 'deprecated', effectiveAt: Date.now() + 60000, reason: 'Scheduled deprecation' });
  decision((await open()).access, 'required_update');
  await admin('release-status', { packageId: pkg, versionCode: low, status: 'archived', reason: 'Immediate deprecation' });
  decision((await open()).access, 'release_blocked');
  assert.equal((await fetch(old.url)).status, 410); checks++;
  await admin('release-status', { packageId: pkg, versionCode: low, status: 'active', reason: 'Restore test release' });
  await setPolicy({ minimumBuild: 1 });
  await open();
  const passive = await socket(snapshot.id);
  const outstanding = await api('/v2/tables/' + snapshot.id + '/socket', {}, identity.key);
  await setPolicy({ locked: true, message: 'Local maintenance verification' });
  decision((await api('/v2/tables/' + snapshot.id + '/ws?ticket=' + outstanding.ticket, undefined, undefined, 503)).access, 'app_locked');
  await closed(passive.ws); assert.ok(passive.messages.some(m => m.type === 'access')); checks++;
  await setPolicy({ locked: false });
  decision((await open({ appBuild: String(high) })).access, 'allow');
  await api('/v2/wallet', undefined, identity.key);
  const accountBlock = await admin('block', { kind: 'player', target: profile.id, reason: 'Local account guard' }, 201);
  decision((await api('/v2/wallet', undefined, identity.key, 403)).access, 'device_blocked');
  await admin('unblock', { id: accountBlock.id, reason: 'Restore local test account' });
  decision((await open({ appBuild: String(high) })).access, 'allow');
  const help = await fetch(base + '/help/install-android'); assert.equal(help.status, 200); const html = await help.text(); assert.ok(html.includes('Do not uninstall')); assert.ok(help.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")); checks += 3;
  const report = { passed: true, checks, at: new Date().toISOString(), scenarios: ['RSA signatures', 'optional/mandatory/release gates', 'block survives update/reinstall', 'account block', 'incompatible replacement', 'unique release identity', 'unblock', 'registration/API/socket access', 'passive socket maintenance revocation', 'single-use tickets', 'immutable APK and range resume', 'scheduled retirement', 'stale operator writes', 'public install help'], testPlayerId: profile.id };
  writeFileSync(resolve(directory, 'integration-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('PASS: ' + checks + ' update integration assertions. Report: artifacts/updates/integration-report.json');
} finally {
  for (const ws of sockets) ws.close();
  // These changes target only this local .dev policy, never production.
  await setPolicy({ locked: false, minimumBuild: 1 }).catch(() => {});
}
