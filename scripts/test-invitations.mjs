// Isolated local Worker only. No real users, phone numbers, invitations or photos.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const base = "http://127.0.0.1:8794";
let checks = 0;
async function api(path, user, body, expected = 200) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Authorization: "Bearer " + user.key } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, expected, `${path}: ${JSON.stringify(result)}`);
  checks++;
  return result;
}
async function open(name, mobile) {
  const user = {
    key: "d_" + randomBytes(32).toString("hex"),
    uuid: randomUUID(),
    name,
    mobile,
  };
  await api("/v2/devices/open", user, {
    deviceUuid: user.uuid,
    info: {
      platform: "android",
      platformScopedId: randomUUID(),
      brand: "QA",
      manufacturer: "QA",
      modelName: "Isolated social test",
      modelId: null,
      osName: "Android",
      osVersion: "11",
      appId: "com.ppegu.tambola.dev",
      appVersion: "1.5.2",
      appBuild: "12",
      isPhysicalDevice: false,
      sdkInt: 30,
      abis: ["arm64-v8a"],
    },
  });
  return user;
}
async function register(user, photo) {
  user.profile = (
    await api(
      "/v2/device",
      null,
      {
        deviceKey: user.key,
        deviceUuid: user.uuid,
        name: user.name,
        mobile: user.mobile,
        source: "device_selected",
        consent: true,
        avatarId: 1,
        avatarPhoto: photo,
      },
      201,
    )
  ).profile;
  return user;
}
const mobileSeed = Math.floor(Math.random() * 9000000) + 1000000;
const mobile = (n) => "+1555" + String(mobileSeed + n);
const captain = await open("QA Captain", mobile(0));
const bytes = readFileSync(
  new URL("../tests/fixtures/avatar.jpg", import.meta.url),
);
async function upload(user, data, type, status) {
  const res = await fetch(base + "/v2/avatars", {
    method: "POST",
    headers: { Authorization: "Bearer " + user.key, "Content-Type": type },
    body: data,
  });
  const result = await res.json();
  assert.equal(res.status, status, JSON.stringify(result));
  checks++;
  return result.photo;
}
const photo = await upload(captain, bytes, "image/jpeg", 201);
await register(captain, photo);
assert.equal(captain.profile.avatarPhoto, photo);
checks++;
const download = await fetch(base + "/v2/avatars/" + photo + ".jpg");
assert.equal(download.status, 200);
assert.match(download.headers.get("Cache-Control"), /immutable/);
checks++;
assert.equal(
  createHash("sha256")
    .update(Buffer.from(await download.arrayBuffer()))
    .digest("hex"),
  createHash("sha256").update(bytes).digest("hex"),
);
checks += 2;
const invited = await register(await open("QA Invited", mobile(1)));
const acceptor = await register(await open("QA Acceptor", mobile(2)));
const other = await register(await open("QA Other", mobile(3)));
await upload(captain, Buffer.from("<svg/>"), "image/svg+xml", 415);
await upload(captain, Buffer.alloc(262145), "image/jpeg", 413);
await api("/v2/me/avatar", other, { avatarId: 0, avatarPhoto: photo }, 400);
await api("/v2/me/avatar", captain, { avatarId: 3, avatarPhoto: null });
assert.equal((await api("/v2/me", captain)).profile.avatarPhoto, undefined);
checks++;
await api("/v2/me/avatar", captain, { avatarId: 1, avatarPhoto: photo });
let s = (
  await api(
    "/v2/tables",
    captain,
    {
      visibility: "private",
      name: "QA Invitations",
      createId: randomUUID(),
      options: { tableAvatarId: 0, tableAvatarPhoto: photo },
    },
    201,
  )
).snapshot;
assert.equal(s.tableAvatarPhoto, photo);
checks++;
const prefix = "/v2/tables/" + s.id;
await api(
  prefix + "/invite-search",
  null,
  { mobile: invited.mobile.slice(-10) },
  401,
);
await api(
  prefix + "/invite-search",
  other,
  { mobile: invited.mobile.slice(-10) },
  403,
);
await api(prefix + "/invite-search", captain, { mobile: "55500" }, 400);
const found = await api(prefix + "/invite-search", captain, {
  mobile: invited.mobile.slice(-10),
});
assert.deepEqual(
  found.players.map((p) => p.id),
  [invited.profile.id],
);
assert.equal(found.players[0].mobile, undefined);
checks += 2;
const send = (recipient) =>
  api(
    prefix + "/invitations",
    captain,
    { playerId: recipient.profile.id },
    201,
  );
const denyInvite = await send(invited);
assert.equal((await send(invited)).id, denyInvite.id);
checks++;
await api(
  "/v2/invitations/" + denyInvite.id + "/respond",
  other,
  { response: "accept" },
  404,
);
let inbox = (await api("/v2/invitations", invited)).invitations;
assert.equal(inbox[0].sender.name, "QA Captain");
assert.equal(inbox[0].tableAvatarPhoto, photo);
checks += 2;
assert.equal((await api("/v2/invitations", other)).invitations.length, 0);
checks++;
const responsePath = (id) => "/v2/invitations/" + id + "/respond";
await api(responsePath(denyInvite.id), invited, { response: "decline" });
await api(responsePath(denyInvite.id), invited, { response: "decline" });
await api(responsePath(denyInvite.id), invited, { response: "accept" }, 409);
await api(prefix, invited, undefined, 403);
await api(
  prefix + "/invitations",
  captain,
  { playerId: invited.profile.id },
  409,
);
const acceptInvite = await send(acceptor);
const accepted = await Promise.all([
  api(responsePath(acceptInvite.id), acceptor, { response: "accept" }),
  api(responsePath(acceptInvite.id), acceptor, { response: "accept" }),
]);
assert.ok(accepted.every((r) => r.snapshot.members[acceptor.profile.id]));
assert.equal(
  (await api("/v2/tables", acceptor)).tables.filter((t) => t.id === s.id)
    .length,
  1,
);
checks += 2;
await api(
  responsePath(acceptInvite.id),
  acceptor,
  { response: "decline" },
  409,
);
const revoked = await send(other);
s = (await api(prefix, captain)).snapshot;
const command = async (type, payload) =>
  (
    await api(prefix + "/commands", captain, {
      id: randomUUID(),
      roundId: s.roundId,
      authorityEpoch: s.authorityEpoch,
      type,
      payload,
    })
  ).snapshot;
s = await command("ROTATE_INVITE", {});
await api(responsePath(revoked.id), other, { response: "accept" }, 410);
const preview = await api("/v2/preview", captain, { code: s.code });
assert.equal(preview.tableAvatarPhoto, photo);
assert.equal(preview.hostAvatarPhoto, photo);
checks += 2;
s = await command("TABLE_AVATAR", { tableAvatarId: 2, tableAvatarPhoto: null });
assert.equal(s.tableAvatarPhoto, undefined);
checks++;
mkdirSync("artifacts/social-qa", { recursive: true });
writeFileSync(
  "artifacts/social-qa/report.json",
  JSON.stringify(
    { checks, passed: true, at: new Date().toISOString() },
    null,
    2,
  ),
);
console.log(`Passed ${checks} isolated invitation, avatar and access checks.`);
