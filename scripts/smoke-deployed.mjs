// Smoke-test this project's deployed API with disposable, synthetic credentials.
// Never prints a password, token, or recovery code; removes its test profile.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
const base =
  process.env.APP_PUBLIC_API_URL ||
  "https://tambola-circle.ffegu0617.workers.dev";
const username = "smoke_" + randomBytes(6).toString("hex");
const password = randomBytes(32).toString("hex");
const guestKey = "g_" + randomBytes(32).toString("hex");
const preferences = {
  auto: false,
  speed: 5,
  sound: true,
  voice: "female",
  callPause: 1.5,
};
let token = "";
async function api(path, options = {}) {
  const response = await fetch(base + path, {
    method: options.method ?? "GET",
    signal: AbortSignal.timeout(20000),
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
try {
  assert.equal((await api("/health")).ok, true);
  const guest = await api("/v1/guest", {
    method: "POST",
    body: { guestKey, preferences },
  });
  token = guest.token;
  assert.deepEqual(guest.preferences, preferences);
  const user = await api("/v1/auth/register", {
    method: "POST",
    token,
    body: { username, password, preferences },
  });
  token = user.token;
  assert.equal(user.profile.kind, "user");
  const login = await api("/v1/auth/login", {
    method: "POST",
    body: { username, password },
  });
  token = login.token;
  assert.deepEqual(login.preferences, preferences);
  const changed = await api("/v1/preferences", {
    method: "PUT",
    token,
    body: {
      preferences: { ...preferences, speed: 7, callPause: 2 },
      version: login.version,
    },
  });
  assert.equal(changed.preferences.speed, 7);
  assert.equal(changed.preferences.voice, "female");
  assert.equal((await api("/v1/me", { token })).preferences.callPause, 2);
  console.log(
    "PASS: deployed health, D1 guest persistence, registration, login, voice and call-pause preference sync.",
  );
} finally {
  if (token) {
    await api("/v1/me", { method: "DELETE", token, body: { password } });
    console.log("Disposable smoke-test profile removed.");
  }
}
