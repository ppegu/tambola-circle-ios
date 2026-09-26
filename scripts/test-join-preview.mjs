import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:8791";
let checks = 0;
async function api(path, key, body, status = 200) {
  const res = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  assert.equal(res.status, status, `${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
async function player(name, avatarId, number) {
  const key = "d_" + randomBytes(32).toString("hex");
  return {
    key,
    ...(
      await api(
        "/v2/device",
        undefined,
        {
          deviceKey: key,
          name,
          mobile: "+15550004" + number,
          avatarId,
          consent: true,
          source: "device_selected",
        },
        201,
      )
    ).profile,
  };
}
const host = await player("QA Asha", 0, "001"),
  guest = await player("QA Ravi", 4, "002"),
  watcher = await player("QA Nani", 3, "003"),
  visitor = await player("QA Visitor", 14, "004");
let s = (
  await api(
    "/v2/tables",
    host.key,
    {
      name: "Friday circle",
      visibility: "private",
      createId: randomUUID(),
      config: {
        readySeconds: 120,
        reviewSeconds: 120,
        callSeconds: 5,
        halfCoins: 60,
        fullCoins: 110,
      },
    },
    201,
  )
).snapshot;
for (const p of [guest, watcher])
  s = (await api("/v2/join", p.key, { code: s.code })).snapshot;
async function command(player, type, payload = {}) {
  s = (
    await api(`/v2/tables/${s.id}/commands`, player.key, {
      id: randomUUID(),
      roundId: s.roundId,
      authorityEpoch: s.authorityEpoch,
      type,
      payload,
    })
  ).snapshot;
}
await command(watcher, "WATCH");
const preview = await api("/v2/preview", visitor.key, { code: s.code });
assert.equal(preview.name, "Friday circle");
assert.equal(preview.host, host.name);
assert.equal(preview.hostAvatarId, 0);
checks += 3;
assert.equal(preview.playerCount, 1);
assert.equal(preview.watchingCount, 2);
assert.equal(preview.count, 3);
checks += 3;
assert.deepEqual(
  preview.players.map((p) => p.avatarId),
  [4, 3],
);
assert.equal(preview.config.halfCoins, 60);
assert.equal(preview.config.fullCoins, 110);
checks += 3;
assert.deepEqual((await api("/v2/tables", visitor.key)).tables, []);
checks++;
for (const value of [
  host.mobile,
  guest.mobile,
  s.invite,
  "deviceKey",
  "panels",
  "marks",
]) {
  assert.ok(!JSON.stringify(preview).includes(value));
  checks++;
}
await api("/v2/preview", undefined, { code: s.code }, 401);
await api("/v2/preview", visitor.key, { code: "000000" }, 404);
await api("/v2/preview", visitor.key, { code: "abc" }, 404);
await api(
  "/v2/preview",
  visitor.key,
  { tableId: s.id, invite: "f".repeat(64) },
  403,
);
const link = { tableId: s.id, invite: s.invite };
const invited = await api("/v2/preview", visitor.key, link);
assert.deepEqual(invited, preview);
checks++;
await command(host, "ROTATE_INVITE");
await api("/v2/preview", visitor.key, link, 403);
const currentLink = { tableId: s.id, invite: s.invite };
const refreshed = await api("/v2/preview", visitor.key, currentLink);
assert.equal(refreshed.id, s.id);
checks++;
s = (await api("/v2/join", visitor.key, currentLink)).snapshot;
assert.ok(s.members[visitor.id]);
checks++;
const fixture = {
  host,
  guest,
  watcher,
  visitor,
  tableId: s.id,
  code: s.code,
  invite: s.invite,
};
await command(visitor, "LEAVE");
// Leave a real local QA table for native code-entry and invite tests.
await writeFile(
  ".tools/join-screen-fixture.json",
  JSON.stringify(fixture, null, 2),
);
console.log(
  `Join preview passed: ${checks} checks. Android QA table code: ${fixture.code}.`,
);
