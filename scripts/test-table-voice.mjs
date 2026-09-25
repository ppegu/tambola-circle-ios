// Local-only authorization/configuration smoke test; no production identities or media.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:8791';
let checks = 0;
async function post(path, key, body, status = 200) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`); checks++; return data;
}
async function player(name, mobile) {
  const key = 'd_' + randomBytes(32).toString('hex');
  return { key, ...(await post('/v2/device', null, { deviceKey: key, name, mobile, source: 'device_selected', consent: true }, 201)).profile };
}
const host = await player('Voice QA Host', '+15550005001'), guest = await player('Voice QA Guest', '+15550005002');
let s = (await post('/v2/tables', host.key, { createId: randomUUID(), name: 'Voice QA', visibility: 'private' }, 201)).snapshot;
const path = `/v2/tables/${s.id}/voice`, join = { op: 'join', clientId: randomUUID() };
await post(path, null, join, 401);
await post(path, guest.key, join, 403);
await post(path, host.key, { ...join, op: 'anything' }, 400);
await post(path, host.key, { ...join, clientId: 'invalid' }, 400);
await post(path, host.key, { ...join, padding: 'x'.repeat(56000) }, 413);
assert.deepEqual(await post(path, host.key, join), { available: false });
await post('/v2/join', guest.key, { code: s.code });
assert.deepEqual(await post(path, guest.key, join), { available: false });
s = (await post(`/v2/tables/${s.id}/commands`, host.key, { id: randomUUID(), roundId: s.roundId, authorityEpoch: s.authorityEpoch, type: 'KICK', payload: { memberId: guest.id } })).snapshot;
await post(path, guest.key, join, 403);
console.log(`PASS: ${checks} table voice API checks (auth, membership, removed member, request validation, bounded body, unavailable configuration).`);
