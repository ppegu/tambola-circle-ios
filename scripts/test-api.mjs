// Runs against a LOCAL Wrangler instance. Never points at a deployed service.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const port =
  process.argv.find((v) => v.startsWith("--port="))?.slice(7) ?? "8787";
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535)
  throw new Error("Invalid local test port");
const base = "http://127.0.0.1:" + port;
const guestKey = () => "g_" + randomBytes(32).toString("hex");
const username = "test_" + randomBytes(5).toString("hex");
const password = "Original-test-password-45!";
const newPassword = "Recovered-test-password-78!";
const defaults = {
  auto: true,
  speed: 4,
  sound: true,
  voice: "classic",
  callPause: 1,
};
let checks = 0;
async function api(
  path,
  { method = "GET", token, body, status = 200, headers = {} } = {},
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  checks++;
  return data;
}
await api("/health");
await api("/v1/me", { status: 401 });
await api("/health", {
  headers: { Origin: "https://untrusted.example" },
  status: 403,
});
const token = guestKey();
const guest = await api("/v1/guest", {
  method: "POST",
  body: { guestKey: token, preferences: defaults },
});
const guestAgain = await api("/v1/guest", {
  method: "POST",
  body: { guestKey: token },
});
assert.equal(guest.profile.id, guestAgain.profile.id);
await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: { ...defaults, speed: 1 }, version: 0 },
  status: 400,
});
const prefs = {
  auto: false,
  speed: 7,
  sound: false,
  voice: "female",
  callPause: 1.5,
};
const updated = await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: prefs, version: 0 },
});
assert.equal(updated.preferences.voice, "female");
assert.equal(updated.preferences.callPause, 1.5);
await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: { ...prefs, callPause: 9 }, version: 1 },
  status: 400,
});
await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: { ...prefs, voice: "unknown" }, version: 1 },
  status: 400,
});
assert.equal(updated.version, 1);
const conflict = await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: defaults, version: 0 },
  status: 409,
});
assert.deepEqual(conflict.preferences, prefs);
await api("/v1/preferences", {
  method: "PUT",
  token,
  body: { preferences: prefs, version: 1, padding: "x".repeat(5000) },
  status: 413,
});
const otherToken = guestKey();
const other = await api("/v1/guest", {
  method: "POST",
  body: { guestKey: otherToken },
});
assert.notEqual(other.profile.id, guest.profile.id);
assert.deepEqual(
  (await api("/v1/me", { token: otherToken })).preferences,
  defaults,
);
const account = await api("/v1/auth/register", {
  method: "POST",
  token,
  body: { username, password, preferences: prefs },
  status: 201,
});
assert.equal(account.profile.id, guest.profile.id);
assert.equal(account.profile.kind, "user");
assert.ok(account.recoveryCode.length === 64);
await api("/v1/me", { token, status: 401 });
await api("/v1/auth/login", {
  method: "POST",
  body: { username, password: "Incorrect-password-000" },
  status: 401,
});
const login = await api("/v1/auth/login", {
  method: "POST",
  body: { username: username.toUpperCase(), password },
});
assert.deepEqual(login.preferences, prefs);
await api("/v1/logout", { method: "POST", token: account.token });
await api("/v1/me", { token: account.token, status: 401 });
await api("/v1/me", { token: login.token });
const recovered = await api("/v1/auth/recover", {
  method: "POST",
  body: { username, password: newPassword, recoveryCode: account.recoveryCode },
});
assert.notEqual(recovered.recoveryCode, account.recoveryCode);
await api("/v1/me", { token: login.token, status: 401 });
await api("/v1/auth/recover", {
  method: "POST",
  body: { username, password: newPassword, recoveryCode: account.recoveryCode },
  status: 401,
});
const finalLogin = await api("/v1/auth/login", {
  method: "POST",
  body: { username, password: newPassword },
});
await api("/v1/me", {
  method: "DELETE",
  token: finalLogin.token,
  body: { password: "wrong" },
  status: 401,
});
await api("/v1/me", {
  method: "DELETE",
  token: finalLogin.token,
  body: { password: newPassword },
});
await api("/v1/me", { token: recovered.token, status: 401 });
await api("/v1/me", { method: "DELETE", token: otherToken, body: {} });
await api("/v1/me", { token: otherToken, status: 401 });
const preflight = await fetch(base + "/v1/preferences", {
  method: "OPTIONS",
  headers: { Origin: "http://localhost:8081" },
});
assert.equal(preflight.status, 204);
assert.equal(
  preflight.headers.get("access-control-allow-origin"),
  "http://localhost:8081",
);
console.log(
  `PASS: ${checks + 1} API checks: guest isolation, validation, conflicts, bounded bodies, CORS, registration, login, logout, recovery, and deletion.`,
);
