// Local-only real API peers for the connected Android design review.
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:8791', code = process.argv[2];
const scheduledPlayer = process.argv.includes('--scheduled-player');
if (!/^\d{6}$/.test(code ?? '')) throw new Error('Provide the local QA table code.');
const fixture = JSON.parse(await readFile('.tools/join-screen-fixture.json', 'utf8'));
const peers = [fixture.host, fixture.guest, fixture.watcher, fixture.visitor];
async function api(path, player, body) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${player.key}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(`${path}: ${result.error ?? response.status}`); return result;
}
let tableId;
async function command(player, type, payload = {}) {
  const { snapshot } = await api(`/v2/tables/${tableId}`, player);
  return api(`/v2/tables/${tableId}/commands`, player, { id: randomUUID(), roundId: snapshot.roundId, authorityEpoch: snapshot.authorityEpoch, type, payload });
}
for (const player of peers) { const { snapshot } = await api('/v2/join', player, { code }); tableId = snapshot.id; }
if (scheduledPlayer && tableId !== fixture.tableId) throw new Error('Scheduled player QA requires the original scripted host table.');
for (const [index, player] of peers.entries()) {
  await api('/v2/wallet', player);
  if (index === 1 || (index === 0 && !scheduledPlayer)) {
    const { snapshot } = await api(`/v2/tables/${tableId}`, player);
    if (!snapshot.members[player.id].ready) {
      const result = await command(player, 'SELECT', { kind: index === 0 ? 'full' : 'half' });
      await command(player, 'CONFIRM_STRIP', { stripVersion: result.snapshot.members[player.id].stripVersion });
      await command(player, 'READY', { ready: true });
    }
  } else if (index === 2 || (index === 0 && scheduledPlayer)) await command(player, 'WATCH');
}
if (scheduledPlayer) { await command(peers[0], 'COHOST', { memberId: peers[1].id }); await command(peers[0], 'SCHEDULE', { at: Date.now() + 30 * 60000 }); }
await writeFile(scheduledPlayer ? '.tools/player-lobby-qa.json' : '.tools/host-lobby-qa.json', JSON.stringify({ tableId, code, peers }, null, 2));
const sockets = [];
for (const player of peers) {
  const { ticket } = await api(`/v2/tables/${tableId}/socket`, player, {});
  const socket = new WebSocket(`ws://127.0.0.1:8791/v2/tables/${tableId}/ws?ticket=${ticket}`);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', () => reject(new Error('QA peer connection failed')), { once: true }); });
  sockets.push(socket);
}
const heartbeat = setInterval(() => { for (const socket of sockets) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' })); }, 10000);
console.log(scheduledPlayer ? 'Local scheduled player QA table prepared. Peer presence is running.' : 'Local QA roster ready: two ready players, one choosing, one watching. Peer presence is running.');
function stop() { clearInterval(heartbeat); for (const socket of sockets) socket.close(); }
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });
