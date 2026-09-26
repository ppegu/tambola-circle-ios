// Local-only integration contract. Start Wrangler on 8791 with an isolated DB.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
const base = "http://127.0.0.1:8791";
let checks = 0,
  s;
const sockets = [];
async function api(path, token, body, status = 200) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(data)}`);
  checks++;
  return data;
}
const players = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function refresh(player = players[0]) {
  s = (await api("/v2/tables/" + s.id, player.key)).snapshot;
  return s;
}
async function command(
  player,
  type,
  payload = {},
  status = 200,
  id = randomUUID(),
) {
  const data = await api(
    "/v2/tables/" + s.id + "/commands",
    player.key,
    { id, roundId: s.roundId, authorityEpoch: s.authorityEpoch, type, payload },
    status,
  );
  if (data.snapshot) s = data.snapshot;
  return data;
}
async function connect(player) {
  const { ticket } = await api(
    "/v2/tables/" + s.id + "/socket",
    player.key,
    {},
  );
  const ws = new WebSocket(
    base.replace("http:", "ws:") +
      "/v2/tables/" +
      s.id +
      "/ws?ticket=" +
      ticket,
  );
  const seen = [];
  ws.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "snapshot") seen.push(data.snapshot);
  });
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
    setTimeout(() => reject(new Error("Socket open timeout")), 10000).unref();
  });
  const timer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: "ping" }));
  }, 5000);
  timer.unref();
  sockets.push({ ws, timer, seen });
  await api(
    "/v2/tables/" + s.id + "/ws?ticket=" + ticket,
    null,
    undefined,
    401,
  );
  return sockets.at(-1);
}
async function nativeOriginCheck(player) {
  const { ticket } = await api(
    "/v2/tables/" + s.id + "/socket",
    player.key,
    {},
  );
  async function upgrade(origin, expected) {
    await new Promise((resolve, reject) => {
      const request = httpRequest(
        base + "/v2/tables/" + s.id + "/ws?ticket=" + ticket,
        {
          headers: {
            Origin: origin,
            Connection: "Upgrade",
            Upgrade: "websocket",
            "Sec-WebSocket-Version": "13",
            "Sec-WebSocket-Key": randomBytes(16).toString("base64"),
          },
        },
      );
      request.once("upgrade", (response, socket) => {
        socket.destroy();
        try {
          assert.equal(response.statusCode, expected);
          checks++;
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      request.once("response", (response) => {
        response.resume();
        try {
          assert.equal(response.statusCode, expected);
          checks++;
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      request.once("error", reject);
      request.setTimeout(10000, () =>
        request.destroy(new Error("Upgrade timeout")),
      );
      request.end();
    });
  }
  await upgrade("https://untrusted.example", 403);
  await upgrade(base, 101); // React Native Android sends the server origin by default.
}
async function waitFor(predicate, timeout = 20000, player = players[0]) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    await refresh(player);
    if (predicate(s)) return;
    await pause(700);
  }
  assert.fail("Timed out waiting for table transition: " + s.phase);
}
try {
  await api("/health");
  await api("/v2/tables", undefined, undefined, 401);
  for (const name of [
    "Local Alice",
    "Local Ben",
    "Local Cara",
    "Local Outsider",
  ]) {
    const key = "d_" + randomBytes(32).toString("hex");
    const { profile } = await api(
      "/v2/device",
      null,
      {
        deviceKey: key,
        name,
        mobile: "+1555000110" + players.length,
        source: "device_selected",
        consent: true,
      },
      201,
    );
    players.push({ ...profile, key });
  }
  const [a, b, c, outsider] = players;
  assert.notEqual(a.id, b.id);
  assert.equal(a.verificationStatus, "unverified");
  let wallet = (await api("/v2/wallet", a.key)).wallet;
  assert.equal(wallet.balance, 1200);
  assert.equal(wallet.testMode, true);
  const purchaseId = randomUUID();
  await api("/v2/wallet/test-purchase", a.key, { id: purchaseId, amount: 500 });
  wallet = (
    await api("/v2/wallet/test-purchase", a.key, {
      id: purchaseId,
      amount: 500,
    })
  ).wallet;
  assert.equal(wallet.balance, 1700);
  await api("/v2/coin-plans", undefined, undefined, 401);
  const catalog = await api("/v2/coin-plans", a.key);
  assert.ok(catalog.plans.length);
  assert.equal(catalog.testMode, true);
  const plan = catalog.plans[0],
    planId = randomUUID();
  const purchased = await api("/v2/wallet/test-purchase", outsider.key, {
    id: planId,
    planId: plan.id,
    amount: 999999,
  });
  assert.equal(purchased.creditedCoins, plan.coins);
  assert.equal(purchased.wallet.balance, 1200 + plan.coins);
  const retries = await Promise.all(
    Array.from({ length: 3 }, () =>
      api("/v2/wallet/test-purchase", outsider.key, {
        id: planId,
        planId: plan.id,
      }),
    ),
  );
  for (const retry of retries)
    assert.equal(retry.wallet.balance, 1200 + plan.coins);
  await api(
    "/v2/wallet/test-purchase",
    outsider.key,
    { id: planId, planId: catalog.plans[1].id },
    409,
  );
  await api(
    "/v2/wallet/test-purchase",
    outsider.key,
    { id: randomUUID(), planId: "not-available" },
    400,
  );
  await api(
    "/v2/wallet/test-purchase",
    a.key,
    { id: randomUUID(), amount: -10 },
    400,
  );
  await api("/v2/tables", a.key, { visibility: "public" }, 400);
  const create = {
    visibility: "private",
    createId: randomUUID(),
    name: "V3 Integration Circle",
    config: {
      readySeconds: 120,
      reviewSeconds: 120,
      callSeconds: 3,
      halfCoins: 50,
      fullCoins: 100,
    },
  };
  s = (await api("/v2/tables", a.key, create, 201)).snapshot;
  const created = s.id,
    originalInvite = s.invite;
  assert.equal(
    (await api("/v2/tables", a.key, create, 201)).snapshot.id,
    created,
  );
  await api("/v2/tables/" + created, outsider.key, undefined, 403);
  s = (await api("/v2/join", b.key, { code: s.code })).snapshot;
  s = (await api("/v2/join", c.key, { tableId: s.id, invite: s.invite }))
    .snapshot;
  const aSocket = await connect(a),
    bSocket = await connect(b);
  await connect(c);
  await nativeOriginCheck(a);
  await command(b, "SELECT", { kind: "full" });
  assert.equal(
    (await api("/v2/tables/" + s.id, b.key)).snapshot.members[b.id].panels
      .length,
    6,
  );
  const hidden = await api("/v2/tables/" + s.id + "/history", a.key);
  assert.equal(hidden.state.members[b.id].panels.length, 0);
  for (const p of [b, c]) {
    if (p === c) await command(p, "SELECT", { kind: "half" });
    await command(p, "CONFIRM_STRIP", {
      stripVersion: s.members[p.id].stripVersion,
    });
    const id = randomUUID();
    await command(p, "READY", { ready: true }, 200, id);
    await command(p, "READY", { ready: true }, 200, id);
  }
  assert.equal(s.phase, "lobby");
  assert.equal(s.members[a.id].spectator, true);
  wallet = (await api("/v2/wallet", b.key)).wallet;
  assert.equal(wallet.balance, 1100);
  assert.equal(wallet.held, 100);
  await command(b, "START", {}, 403);
  await command(a, "START");
  assert.equal(s.phase, "live");
  assert.deepEqual(s.roster, [b.id, c.id]);
  assert.equal(s.calls.length, 0);
  assert.ok(s.startsAt > s.serverNow);
  await command(b, "PAUSE", { paused: true }, 403);
  await command(a, "PAUSE", { paused: true });
  const remaining = s.pause.remainingMs;
  await pause(1000);
  await refresh();
  assert.equal(s.calls.length, 0);
  assert.equal(s.pause.remainingMs, remaining);
  await command(b, "PACE", { seconds: 4 }, 403);
  await command(a, "PACE", { seconds: 11 }, 400);
  await command(a, "PACE", { seconds: 7 });
  assert.equal(s.config.callSeconds, 7);
  assert.equal(s.pause.remainingMs, remaining);
  assert.equal(s.nextCallAt, null);
  await command(a, "PAUSE", { paused: false });
  await waitFor((state) => state.calls.length === 1, 8000);
  await command(a, "PACE", { seconds: 4 });
  assert.equal(s.config.callSeconds, 4);
  assert.equal(s.nextConfig.callSeconds, 4);
  await pause(300);
  assert.ok(bSocket.seen.some((state) => state.config.callSeconds === 4));
  wallet = (await api("/v2/wallet", b.key)).wallet;
  assert.equal(wallet.balance, 1100);
  assert.equal(wallet.held, 0);
  const cell = s.members[b.id].panels[0].flat().findIndex((n) => n !== null),
    markId = randomUUID();
  await command(
    b,
    "MARK",
    { panel: 0, cell, marked: true, version: 0 },
    200,
    markId,
  );
  await command(
    b,
    "MARK",
    { panel: 0, cell, marked: true, version: 0 },
    200,
    markId,
  );
  assert.equal(s.members[b.id].markVersions["0:" + cell], 1);
  await command(b, "MARK", { panel: 0, cell, marked: false, version: 0 }, 409);
  await pause(300);
  assert.ok(aSocket.seen.some((v) => v.members[b.id].marks["0:" + cell]));
  await command(b, "CLAIM", { panel: 0 });
  const calls = [...s.calls];
  await pause(900);
  await refresh();
  assert.equal(s.phase, "claim");
  assert.deepEqual(s.calls, calls);
  assert.ok(s.claim.checked > 0);
  await command(c, "VOTE", { vote: "approve" }, 400);
  await waitFor((state) => state.phase === "live", 7000);
  assert.ok(s.verificationFailure.missing.length > 0);
  assert.equal(s.members[b.id].spectator, true);
  const evidence = s.members[b.id].disqualification;
  await command(b, "WATCH", { watching: false }, 409);
  await command(b, "MARK", { panel: 0, cell, marked: false, version: 1 }, 409);
  await command(b, "CLAIM", { panel: 1 }, 409);
  assert.deepEqual(
    (await api("/v2/tables/" + s.id + "/rejoin", b.key, {})).snapshot.members[
      b.id
    ].disqualification,
    evidence,
  );
  await command(a, "COHOST", { memberId: b.id });
  aSocket.ws.close();
  clearInterval(aSocket.timer);
  await waitFor((state) => state.hostId === b.id, 23000, b);
  assert.equal(s.ownerId, a.id);
  await api("/v2/tables/" + s.id + "/rejoin", a.key, {});
  await command(a, "RECLAIM");
  await command(a, "TRANSFER", { memberId: b.id });
  await command(a, "RECLAIM", {}, 403);
  await command(b, "ROTATE_INVITE");
  await api(
    "/v2/join",
    outsider.key,
    { tableId: s.id, invite: originalInvite },
    403,
  );
  const endId = randomUUID();
  await command(b, "END", {}, 200, endId);
  await command(b, "END", {}, 200, endId);
  assert.equal(s.phase, "finished");
  wallet = (await api("/v2/wallet", b.key)).wallet;
  assert.equal(wallet.balance, 1200);
  const round = s.round;
  await command(c, "NEXT_ROUND");
  for (const p of [b, c]) {
    await command(p, "SELECT", { kind: "half" });
    await command(p, "CONFIRM_STRIP", {
      stripVersion: s.members[p.id].stripVersion,
    });
    await command(p, "READY", { ready: true });
  }
  await command(b, "SCHEDULE", { at: Date.now() + 11000 });
  await waitFor((state) => state.phase === "live", 16000, b);
  assert.equal(s.calls.length, 0);
  assert.ok(s.startsAt);
  await waitFor((state) => state.calls.length === 1, 8000, b);
  await command(b, "END");
  await command(b, "NEXT_ROUND");
  await command(c, "SELECT", { kind: "half" });
  await command(c, "CONFIRM_STRIP", {
    stripVersion: s.members[c.id].stripVersion,
  });
  await command(c, "READY", { ready: true });
  await command(b, "SCHEDULE", { at: Date.now() + 11000 });
  await waitFor((state) => state.phase === "finished", 16000, b);
  assert.equal(s.result.reason, "not_enough_ready_players");
  const log = await api(
    "/v2/tables/" + s.id + "/history?round=" + round,
    b.key,
  );
  assert.ok(log.events.some((e) => e.type === "MARK_CHANGED"));
  assert.ok(log.events.some((e) => e.type === "CLAIM_REJECTED"));
  assert.equal(log.state.members[a.id].mobile, "");
  assert.equal(
    (await api("/v2/tables/" + s.id + "/rejoin", b.key, {})).snapshot.phase,
    "finished",
  );
  assert.ok((await api("/v2/tables", b.key)).tables.some((t) => t.id === s.id));
  await command(b, "KICK", { memberId: c.id });
  await api("/v2/join", c.key, { code: s.code }, 403);
  for (const { seen } of sockets)
    for (let i = 1; i < seen.length; i++)
      assert.ok(seen[i].seq >= seen[i - 1].seq);
  console.log(
    `PASS: ${checks} API checks, free test purchases, exactly-once reservations/refunds, live marks, automatic verification, scheduled starts/cancellation, co-host takeover, transfer, persisted history and reconnect.`,
  );
} finally {
  for (const { ws, timer } of sockets) {
    clearInterval(timer);
    ws.close();
  }
}
