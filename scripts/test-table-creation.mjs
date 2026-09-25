import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:8791';
let checks = 0;
async function api(path, key, body, status = 200) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`); checks++; return data;
}
const key = 'd_' + randomBytes(32).toString('hex');
const { profile } = await api('/v2/device', undefined, { deviceKey: key, name: 'QA Creation', mobile: '+15550005501', avatarId: 8, source: 'device_selected', consent: true }, 201);
const config = { readySeconds: 120, reviewSeconds: 120, callSeconds: 3, halfCoins: 60, fullCoins: 110 };
const manualRequest = { name: 'QA Manual', visibility: 'private', createId: randomUUID(), config };
const manual = (await api('/v2/tables', key, manualRequest, 201)).snapshot;
assert.equal(manual.scheduledAt, null); assert.equal(manual.members[profile.id].spectator, true); checks += 2;
const request = { ...manualRequest, name: 'QA Scheduled', createId: randomUUID(), options: { hostPlaying: true, startInSeconds: 300 } };
const before = Date.now(), scheduled = (await api('/v2/tables', key, request, 201)).snapshot;
assert.ok(scheduled.scheduledAt >= before + 300000 && scheduled.scheduledAt <= Date.now() + 300000); checks++;
assert.equal(scheduled.members[profile.id].spectator, false); assert.equal(scheduled.members[profile.id].ready, false); assert.deepEqual(scheduled.members[profile.id].panels, []); checks += 3;
const retry = (await api('/v2/tables', key, { ...request, options: { hostPlaying: false, startInSeconds: 600 } }, 201)).snapshot;
assert.equal(retry.id, scheduled.id); assert.equal(retry.scheduledAt, scheduled.scheduledAt); assert.equal(retry.members[profile.id].spectator, false); checks += 3;
const history = await api(`/v2/tables/${scheduled.id}/history`, key);
assert.equal(history.events.filter(event => event.type === 'TABLE_CREATED').length, 1); assert.equal(history.events.filter(event => event.type === 'START_SCHEDULED').length, 1); checks += 2;
for (const options of [{ startInSeconds: 119 }, { startInSeconds: 604801 }, { startInSeconds: '300' }, { hostPlaying: 'yes' }, { coHostId: profile.id }, []]) await api('/v2/tables', key, { ...request, createId: randomUUID(), options }, 400);
assert.equal((await api('/v2/tables', key)).tables.length, 2); checks++;
const wallet = (await api('/v2/wallet', key)).wallet;
assert.equal(wallet.held, 0); assert.ok(wallet.transactions.every(transaction => !transaction.kind.includes('reserve'))); checks += 2;
// Keep test rooms out of ongoing lists; no player coins were reserved.
for (const snapshot of [manual, scheduled]) await api(`/v2/tables/${snapshot.id}/commands`, key, { id: randomUUID(), type: 'END', roundId: snapshot.roundId, authorityEpoch: snapshot.authorityEpoch, payload: {} });
console.log(`Table creation passed: ${checks} checks.`);
