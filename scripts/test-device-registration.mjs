import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

const base = process.env.API_URL ?? "http://127.0.0.1:8791";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error(
    "Device integration fixtures must run against a local test server.",
  );
let checks = 0;
async function api(path, key, body, expected = 200) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.77",
      ...(key ? { Authorization: "Bearer " + key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  checks++;
  return data;
}
const device = (platform) => ({
  key: "d_" + randomBytes(32).toString("hex"),
  uuid: randomUUID(),
  info: {
    platform,
    platformScopedId: platform === "ios" ? randomUUID() : "abcdef0123456789",
    brand: platform === "ios" ? "Apple" : "Test",
    manufacturer: "Test",
    modelName: "Integration fixture",
    modelId: null,
    osName: platform,
    osVersion: "test",
    appId: "com.ppegu.tambola",
    appVersion: "1.1.2",
    appBuild: "5",
    isPhysicalDevice: false,
  },
});
const ios = device("ios"),
  android = device("android"),
  attacker = device("ios");
const open = (d, overrides = {}, key = d.key, status = 200) =>
  api(
    "/v2/devices/open",
    key,
    { deviceUuid: d.uuid, info: d.info, ...overrides },
    status,
  );
const register = (d, overrides = {}, status = 201) =>
  api(
    "/v2/device",
    undefined,
    {
      deviceKey: d.key,
      deviceUuid: d.uuid,
      name: "Device fixture",
      mobile: "+19995550123",
      source: d.info.platform === "ios" ? "manual_ios" : "device_selected",
      consent: true,
      ...overrides,
    },
    status,
  );
const initial = await open(ios);
assert.equal(initial.registered, false);
checks++;
await api("/v2/me", ios.key, undefined, 401);
await open(ios, {}, attacker.key, 409);
await open(ios, { deviceUuid: randomUUID() }, ios.key, 409);
await open(ios, { info: { ...ios.info, platform: "android" } }, ios.key, 409);
await open(
  ios,
  { info: { ...ios.info, modelName: "x".repeat(161) } },
  ios.key,
  400,
);
await open(ios, {}, "not-a-credential", 401);
await register(attacker, {}, 400);
const registered = await register(ios, { avatarId: 14 });
assert.equal(registered.profile.avatarId, 14);
checks++;
assert.equal(registered.profile.mobileSource, "manual_ios");
assert.equal(registered.profile.verificationStatus, "unverified");
checks += 2;
const repeat = await register(ios, { avatarId: 0 });
assert.equal(repeat.profile.avatarId, 14);
checks++;
assert.equal(repeat.profile.id, registered.profile.id);
checks++;
const reopened = await open(ios);
assert.equal(reopened.registered, true);
assert.equal(reopened.firstSeenAt, initial.firstSeenAt);
checks += 2;
const me = await api("/v2/me", ios.key);
assert.equal(me.profile.avatarId, 14);
checks++;
assert.equal(me.profile.mobileSource, "manual_ios");
checks++;
await api("/v2/me", ios.uuid, undefined, 401);
await open(android);
await register(android, { source: "manual_ios" }, 400);
const androidAccount = await register(android);
assert.equal(androidAccount.profile.mobileSource, "device_selected");
assert.notEqual(androidAccount.profile.id, registered.profile.id);
checks += 2;
const legacy = device("android");
await register(legacy, { deviceUuid: undefined });
const legacyOpen = await open(legacy);
assert.equal(legacyOpen.registered, true);
checks++;
// The gallery is server-validated, survives sign-in, and travels with real room records.
for (const avatarId of [-1, 15, 1.5, "2", null])
  await api("/v2/me/avatar", ios.key, { avatarId }, 400);
await api("/v2/me/avatar", "invalid", { avatarId: 2 }, 401);
for (let avatarId = 0; avatarId < 15; avatarId++) {
  const saved = await api("/v2/me/avatar", ios.key, { avatarId });
  assert.equal(saved.profile.avatarId, avatarId);
  checks++;
}
const afterAvatar = await api("/v2/me", ios.key);
assert.equal(afterAvatar.profile.avatarId, 14);
checks++;
assert.equal((await api("/v2/me", android.key)).profile.avatarId, undefined);
checks++;
const badAvatar = device("android");
await register(badAvatar, { deviceUuid: undefined, avatarId: 15 }, 400);
const created = await api(
  "/v2/tables",
  ios.key,
  { createId: randomUUID(), name: "Avatar QA", visibility: "private" },
  201,
);
const table = created.snapshot;
assert.equal(table.members[registered.profile.id].avatarId, 14);
checks++;
const joined = await api("/v2/join", android.key, { code: table.code });
assert.equal(joined.snapshot.members[registered.profile.id].avatarId, 14);
checks++;
await api("/v2/me/avatar", ios.key, { avatarId: 7 });
const resumed = await api(`/v2/tables/${table.id}/rejoin`, ios.key, {});
assert.equal(resumed.snapshot.members[registered.profile.id].avatarId, 7);
checks++;
const peerView = await api(`/v2/tables/${table.id}`, android.key);
assert.equal(peerView.snapshot.members[registered.profile.id].avatarId, 7);
checks++;
const lists = await api("/v2/tables", ios.key);
assert.equal(
  lists.tables
    .find((t) => t.id === table.id)
    .players.find((p) => p.id === registered.profile.id).avatarId,
  7,
);
checks++;
await writeFile(
  "artifacts/device-registration-local.json",
  JSON.stringify(
    {
      checks,
      iosUuid: ios.uuid,
      androidUuid: android.uuid,
      legacyUuid: legacy.uuid,
    },
    null,
    2,
  ),
);
console.log(`Device registration integration passed: ${checks} checks.`);
