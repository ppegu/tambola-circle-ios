// Local-only API test. Synthetic identities; never uses the phone's SIM number.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:8791';
let checks = 0;
async function api(path, key, body, status = 200) {
  const res = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json(); assert.equal(res.status, status, `${path}: ${JSON.stringify(data)}`); checks++; return data;
}
async function user(name, number) {
  const key = 'd_' + randomBytes(32).toString('hex');
  return { key, ...(await api('/v2/device', null, { deviceKey: key, name, mobile: '+15550002' + number, source: 'device_selected', consent: true }, 201)).profile };
}
const host = await user('List QA Host', '001'), guest = await user('List QA Guest', '002'), outsider = await user('List QA Visitor', '003');
assert.deepEqual((await api('/v2/tables', host.key)).tables, []);
assert.deepEqual((await api('/v2/table-history', host.key)).games, []);
await api('/v2/table-history', undefined, undefined, 401);
let s = (await api('/v2/tables', host.key, { name: 'List verification', visibility: 'private', createId: randomUUID(), config: { readySeconds: 120, reviewSeconds: 120, callSeconds: 10, halfCoins: 50, fullCoins: 100 } }, 201)).snapshot;
const tableId = s.id;
async function command(player, type, payload = {}) {
  s = (await api(`/v2/tables/${tableId}/commands`, player.key, { type, payload, id: randomUUID(), roundId: s.roundId, authorityEpoch: s.authorityEpoch })).snapshot;
}
async function eventually(read, test) {
  for (let i = 0; i < 30; i++) { const value = await read(); if (test(value)) return value; await new Promise(r => setTimeout(r, 200)); }
  assert.fail('Archive did not become available');
}
await api('/v2/join', guest.key, { code: s.code });
const tables = await eventually(() => api('/v2/tables', host.key), x => x.tables[0]?.playerCount === 2);
assert.deepEqual(tables.tables[0].players.map(p => p.name), [host.name, guest.name]);
assert.ok(!JSON.stringify(tables).includes('mobile')); assert.ok(!JSON.stringify(tables).includes(s.invite));
for (const p of [host, guest]) {
  await command(p, 'SELECT', { kind: 'half' }); await command(p, 'CONFIRM_STRIP', { stripVersion: s.members[p.id].stripVersion }); await command(p, 'READY', { ready: true });
}
await command(host, 'START'); assert.equal(s.phase, 'live');
await command(guest, 'MARK', { panel: 0, cell: s.members[guest.id].panels[0].flat().findIndex(n => n !== null), marked: true, version: 0 });
await command(host, 'END');
const history = await eventually(() => api('/v2/table-history', host.key), x => x.games.length === 1);
assert.equal(history.games[0].round, 1); assert.equal(history.games[0].playerCount, 2); assert.equal(history.games[0].completed, false);
const detail = await api(`/v2/table-history/${tableId}/1`, guest.key);
assert.equal(detail.game.name, 'List verification'); assert.equal(detail.tickets.length, 2); assert.equal(detail.tickets[0].panels.length, 3);
assert.ok(Object.values(detail.tickets.find(p => p.id === guest.id).marks).some(Boolean));
for (const forbidden of ['mobile', 'invite', 'deviceKey', 'code']) assert.ok(!Object.hasOwn(detail, forbidden));
assert.ok(!JSON.stringify(detail).includes(host.mobile)); assert.ok(!JSON.stringify(detail).includes(s.invite));
await api(`/v2/table-history/${tableId}/1`, outsider.key, undefined, 404);
// Joining an already finished table must not turn its old round into this
// newcomer’s history when the room archives another snapshot.
await api('/v2/join', outsider.key, { code: s.code });
await new Promise(r => setTimeout(r, 400));
assert.deepEqual((await api('/v2/table-history', outsider.key)).games, []);
await api(`/v2/table-history/${tableId}/1`, outsider.key, undefined, 404);
await command(host, 'NEXT_ROUND'); assert.equal(s.round, 2);
await eventually(() => api('/v2/tables', host.key), x => x.tables[0]?.round === 2 && x.tables[0]?.phase === 'lobby');
assert.equal((await api('/v2/table-history', host.key)).games[0].round, 1);
await api('/v2/join', outsider.key, { code: s.code });
assert.deepEqual((await api('/v2/table-history', outsider.key)).games, []);
await api(`/v2/table-history/${tableId}/1`, outsider.key, undefined, 404);
await command(guest, 'LEAVE');
assert.equal((await api('/v2/table-history', guest.key)).games[0].round, 1);
s = (await api(`/v2/tables/${tableId}`, host.key)).snapshot;
await command(host, 'KICK', { memberId: guest.id });
await eventually(() => api('/v2/table-history', guest.key), x => !x.games.length);
await api(`/v2/table-history/${tableId}/1`, guest.key, undefined, 404);
await command(host, 'END');
console.log(`PASS: ${checks} API checks. Empty lists, membership counts, saved tickets/marks, past rounds after restart, outsider/late-join/kicked access, and private-data exclusion.`);
