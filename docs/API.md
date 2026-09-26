# API contract

All responses use JSON and `Cache-Control: no-store`. POST/PUT/DELETE bodies use `Content-Type: application/json`, with a 4 KiB maximum. Errors are `{ "error": "Human readable message" }`; version conflicts also include current cloud state. Authentication uses `Authorization: Bearer <token>`.

Preferences have exactly five fields: `{ "auto": true, "speed": 4, "sound": true, "voice": "classic", "callPause": 1 }`. Speed is 3, 4, 5, 6, or 7; voice is `classic` (male) or `female`; `callPause` is 0.5, 1, 1.5, or 2 seconds. Migration 0002 adds the classic voice; migration 0003 adds the one-second pause to existing profiles without changing other settings. Older local preferences also receive this default. Apply migrations before deploying the updated Worker and app.

Cloud state is `{ profile: { id, kind, username }, preferences, version }`. `kind` is `guest` or `user`; `username` is null for guests. Auth responses also contain `token`; registration and recovery contain a new `recoveryCode` displayed once.

| Method | Route               | Authentication / body                                       | Result                                                        |
| ------ | ------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/health`           | None                                                        | `{ok: true, service: "trust-tambola"}`                        |
| POST   | `/v1/guest`         | `{guestKey, preferences?}`                                  | Idempotent guest creation / restore + cloud state + token     |
| POST   | `/v1/auth/register` | Optional guest bearer; `{username, password, preferences?}` | 201; upgrades guest if present; recovery code                 |
| POST   | `/v1/auth/login`    | `{username, password}`                                      | Cloud state + fresh 30-day session                            |
| POST   | `/v1/auth/recover`  | `{username, password: newPassword, recoveryCode}`           | Rotated recovery code + fresh session; revokes prior sessions |
| GET    | `/v1/me`            | Bearer                                                      | Current profile and preferences                               |
| PUT    | `/v1/preferences`   | Bearer; `{preferences, version}`                            | Updated state with incremented version; 409 if stale          |
| POST   | `/v1/logout`        | Bearer                                                      | Revokes the supplied account session                          |
| DELETE | `/v1/me`            | Bearer; users also supply `{password}`                      | Deletes profile and all sessions                              |

Guest keys are `g_` plus 64 lowercase hexadecimal characters generated with a cryptographic RNG. Account session tokens use the `s_` prefix with the same entropy. The server persists only SHA-256 hashes of those secrets and recovery codes. A guest secret is a credential, not a public device identifier; never send it to analytics or logs.

Passwords use per-user random salts and PBKDF2-HMAC-SHA256 (100,000 iterations, the Workers Web Crypto limit) on a server-secret HMAC of the password. The pepper lives in `AUTH_SECRET`, outside D1. This is a deliberate Workers runtime tradeoff; if your deployment requires a higher-cost password KDF or managed identity provider, replace this authentication layer before launch. Browser auth uses explicit bearer headers, with no ambient cookies, and origin allowlisting.

Rate limits apply per hashed identity/username and a broader hashed network source for unauthenticated abuse protection. Raw IP addresses are not persisted by this app. Cloudflare may maintain its own infrastructure logs. Rate-limit counters are regional/eventually consistent, as documented by Cloudflare; they are not a global account-lockout mechanism. Request bodies, tokens, and credentials are never application-logged. The scheduled job deletes expired sessions daily; expired sessions are rejected even before cleanup. D1 foreign keys cascade account deletion to sessions. Cloudflare backups follow the account’s D1 retention behavior.

Games never leave the device. Preferences are updated with a monotonically increasing server version. Clients fetch current state, write dirty local preferences against that version, and may retry one conflict against the returned version. Logging into an existing account loads its saved preferences. Registering preserves this device’s guest preferences.

The legacy v1 API has no payments or chat endpoints. The native online v2 API additionally supports the table voice contract below.

## Native table voice (v2)

`POST /v2/tables/:tableId/voice` requires the registered device bearer token and current non-left/non-removed table membership. Body limit is 56,000 bytes for this route only; SDP is audio-only and at most48,000 characters. Bodies carry `{op, clientId}`; `clientId` is a fresh UUID per foreground table session.

Operations: `join` returns availability, short-lived ICE credentials and an opaque publication roster; `status` renews the lease and returns the roster; `publish` accepts `{mid,sessionDescription}` (offer) and returns an answer and opaque `connectionId`; `ready` publishes that connection only after the client connected; `receive` selects all other authorized ready publishers server-side and returns an offer; `answer` accepts `{connectionId,sessionDescription}`; `mute` retires this phone's publisher; `leave` retires both connections and membership. `available:false` means deployment configuration is disabled/missing. No provider app secret or remote SFU session identifier is returned as a selectable API parameter. SDP necessarily contains transport details.

Mic defaults muted. Speaker mute is local (voice plus caller announcements), independent of mic.16 admitted voice members,45-second leases,5-second client polling. Existing API rate limits apply. See [voice implementation](voice-chat-v4/PLAN.md) for setup, cleanup and costs.
