import { DEFAULT_PREFERENCES, isPreferences } from "../../shared/preferences";
import { equalHex, passwordHash, randomToken, sha256 } from "./security";
import { onlineRoute } from "./online-api";
import { RoomError } from "./room-engine";
import { AccessError, enforceLegacyRequest, signAccess } from "./app-access";
import { updateAdmin } from "./update-admin";
import { downloadRoute } from "./download-pages";
export { TableRoom } from "./table-room";
export { VoiceRoom } from "./voice-room";

type ProfileRow = {
  id: string;
  kind: "guest" | "user";
  username: string | null;
  preferences: string;
  version: number;
  password_salt: string | null;
  password_hash: string | null;
  recovery_hash: string | null;
};
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: object,
  ) {
    super(message);
  }
}
const json = (value: unknown, status = 200) => Response.json(value, { status });
const state = (p: ProfileRow) => ({
  profile: { id: p.id, kind: p.kind, username: p.username },
  preferences: JSON.parse(p.preferences),
  version: p.version,
});

async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new ApiError(415, "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A JSON body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new ApiError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const body: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}

async function rateLimit(env: Env, key: string, auth = false) {
  const limiter = auth ? env.AUTH_LIMITER : env.API_LIMITER;
  if (!(await limiter.limit({ key: await sha256(key) })).success)
    throw new ApiError(429, "Too many attempts. Please wait a minute.");
}

function bearer(request: Request): string {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[gs]_[a-f0-9]{64}$/.test(token))
    throw new ApiError(401, "Please sign in again.");
  return token;
}

async function authenticate(request: Request, env: Env): Promise<ProfileRow> {
  const token = bearer(request);
  const hash = await sha256(token);
  const profile = token.startsWith("g_")
    ? await env.DB.prepare(
        "SELECT * FROM profiles WHERE guest_hash = ? AND kind = ?",
      )
        .bind(hash, "guest")
        .first<ProfileRow>()
    : await env.DB.prepare(
        "SELECT p.* FROM profiles p JOIN sessions s ON p.id = s.profile_id WHERE s.token_hash = ? AND s.expires_at > ?",
      )
        .bind(hash, Date.now())
        .first<ProfileRow>();
  if (!profile) throw new ApiError(401, "Please sign in again.");
  await rateLimit(env, profile.id);
  return profile;
}

function credentials(body: Record<string, unknown>) {
  if (
    typeof body.username !== "string" ||
    !/^[a-zA-Z0-9_]{3,24}$/.test(body.username)
  )
    throw new ApiError(
      400,
      "Use a username of 3–24 letters, numbers, or underscores.",
    );
  if (
    typeof body.password !== "string" ||
    body.password.length < 12 ||
    body.password.length > 128
  )
    throw new ApiError(400, "Use a password of 12–128 characters.");
  return { username: body.username.toLowerCase(), password: body.password };
}

function authSecret(env: Env) {
  if (
    !env.AUTH_SECRET ||
    env.AUTH_SECRET.length < 32 ||
    env.AUTH_SECRET.startsWith("replace-")
  )
    throw new ApiError(
      503,
      "Account service is not configured yet. Guest play remains available.",
    );
  return env.AUTH_SECRET;
}

async function createSession(env: Env, id: string) {
  const token = randomToken("s_");
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, profile_id, expires_at) VALUES (?, ?, ?)",
  )
    .bind(await sha256(token), id, Date.now() + 30 * 86400_000)
    .run();
  return token;
}

async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  const method = request.method;
  if (path === "/")
    return Response.redirect(
      new URL("/download/android", request.url).href,
      302,
    );
  if (path.startsWith("/v2/admin/app/")) return updateAdmin(request, env);
  if (
    path.startsWith("/download/") ||
    path.startsWith("/releases/android/") ||
    path === "/help/install-android" ||
    path.startsWith("/assets/updates/")
  )
    return downloadRoute(request, env);
  if (path.startsWith("/v1/")) await enforceLegacyRequest(env, request);
  if (path.startsWith("/v2/") || path.startsWith("/invite/"))
    return onlineRoute(request, env);
  if (path === "/health" && method === "GET")
    return json({ ok: true, service: "tambola-circle" });
  if (path === "/v1/guest" && method === "POST") {
    const body = await readBody(request);
    if (
      typeof body.guestKey !== "string" ||
      !/^g_[a-f0-9]{64}$/.test(body.guestKey)
    )
      throw new ApiError(400, "Invalid installation key.");
    await rateLimit(env, "guest:" + body.guestKey, true);
    // A broad anonymous creation limit discourages unbounded profile creation.
    await rateLimit(
      env,
      "guest-ip:" + (request.headers.get("CF-Connecting-IP") ?? "local"),
    );
    const hash = await sha256(body.guestKey);
    const prefs =
      body.preferences === undefined ? DEFAULT_PREFERENCES : body.preferences;
    if (!isPreferences(prefs)) throw new ApiError(400, "Invalid preferences.");
    await env.DB.prepare(
      "INSERT OR IGNORE INTO profiles (id, kind, guest_hash, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(
        crypto.randomUUID(),
        "guest",
        hash,
        JSON.stringify(prefs),
        Date.now(),
        Date.now(),
      )
      .run();
    const profile = await env.DB.prepare(
      "SELECT * FROM profiles WHERE guest_hash = ?",
    )
      .bind(hash)
      .first<ProfileRow>();
    if (!profile) throw new Error("Guest creation failed");
    return json({ ...state(profile), token: body.guestKey });
  }
  if (path.startsWith("/v1/auth/") && method === "POST") {
    const pepper = authSecret(env);
    const body = await readBody(request);
    const { username, password } = credentials(body);
    await rateLimit(env, "auth-user:" + username, true);
    await rateLimit(
      env,
      "auth-ip:" + (request.headers.get("CF-Connecting-IP") ?? "local"),
    );
    const existing = await env.DB.prepare(
      "SELECT * FROM profiles WHERE username = ?",
    )
      .bind(username)
      .first<ProfileRow>();

    if (path === "/v1/auth/register") {
      if (existing) throw new ApiError(409, "That username is already taken.");
      const prefs = body.preferences ?? DEFAULT_PREFERENCES;
      if (!isPreferences(prefs))
        throw new ApiError(400, "Invalid preferences.");
      const guest = request.headers.has("Authorization")
        ? await authenticate(request, env)
        : null;
      if (guest?.kind === "user")
        throw new ApiError(409, "Sign out before creating another account.");
      const id = guest?.id ?? crypto.randomUUID();
      const salt = randomToken();
      const hash = await passwordHash(password, salt, pepper);
      const recoveryCode = randomToken();
      const recoveryHash = await sha256(recoveryCode);
      try {
        if (guest) {
          const update = await env.DB.prepare(
            "UPDATE profiles SET kind = 'user', username = ?, guest_hash = NULL, password_salt = ?, password_hash = ?, recovery_hash = ?, preferences = ?, version = version + 1, updated_at = ? WHERE id = ? AND kind = 'guest'",
          )
            .bind(
              username,
              salt,
              hash,
              recoveryHash,
              JSON.stringify(prefs),
              Date.now(),
              id,
            )
            .run();
          if (update.meta.changes !== 1)
            throw new ApiError(
              409,
              "This guest has already been upgraded. Please sign in.",
            );
        } else {
          await env.DB.prepare(
            "INSERT INTO profiles (id, kind, username, password_salt, password_hash, recovery_hash, preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
            .bind(
              id,
              "user",
              username,
              salt,
              hash,
              recoveryHash,
              JSON.stringify(prefs),
              Date.now(),
              Date.now(),
            )
            .run();
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE"))
          throw new ApiError(409, "That username is already taken.");
        throw error;
      }
      const profile = await env.DB.prepare(
        "SELECT * FROM profiles WHERE id = ?",
      )
        .bind(id)
        .first<ProfileRow>();
      if (!profile) throw new Error("Account creation failed");
      return json(
        {
          ...state(profile),
          token: await createSession(env, id),
          recoveryCode,
        },
        201,
      );
    }
    if (path === "/v1/auth/login") {
      // Use the same expensive calculation even when the username does not exist.
      const hash = await passwordHash(
        password,
        existing?.password_salt ?? "missing-account-salt",
        pepper,
      );
      if (!existing?.password_hash || !equalHex(hash, existing.password_hash))
        throw new ApiError(401, "Username or password is incorrect.");
      return json({
        ...state(existing),
        token: await createSession(env, existing.id),
      });
    }
    if (path === "/v1/auth/recover") {
      const code =
        typeof body.recoveryCode === "string"
          ? body.recoveryCode.trim().toLowerCase()
          : "";
      const hash = await sha256(code);
      if (
        !/^[a-f0-9]{64}$/.test(code) ||
        !existing?.recovery_hash ||
        !equalHex(hash, existing.recovery_hash)
      )
        throw new ApiError(401, "Username or recovery code is incorrect.");
      const salt = randomToken();
      const recoveryCode = randomToken();
      const password = await passwordHash(
        body.password as string,
        salt,
        pepper,
      );
      const nextRecoveryHash = await sha256(recoveryCode);
      const updates = await env.DB.batch([
        env.DB.prepare(
          "UPDATE profiles SET password_hash = ?, password_salt = ?, recovery_hash = ? WHERE id = ? AND recovery_hash = ?",
        ).bind(password, salt, nextRecoveryHash, existing.id, hash),
        env.DB.prepare(
          "DELETE FROM sessions WHERE profile_id = ? AND EXISTS (SELECT 1 FROM profiles WHERE id = ? AND recovery_hash = ?)",
        ).bind(existing.id, existing.id, nextRecoveryHash),
      ]);
      if (updates[0].meta.changes !== 1)
        throw new ApiError(409, "Recovery code was already used.");
      return json({
        ...state(existing),
        token: await createSession(env, existing.id),
        recoveryCode,
      });
    }
    throw new ApiError(404, "Not found.");
  }

  if (
    path === "/v1/me" ||
    path === "/v1/preferences" ||
    path === "/v1/logout"
  ) {
    const profile = await authenticate(request, env);
    if (path === "/v1/me" && method === "GET") return json(state(profile));
    if (path === "/v1/preferences" && method === "PUT") {
      const body = await readBody(request);
      if (
        !isPreferences(body.preferences) ||
        !Number.isSafeInteger(body.version) ||
        (body.version as number) < 0
      )
        throw new ApiError(400, "Invalid preferences or version.");
      const update = await env.DB.prepare(
        "UPDATE profiles SET preferences = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ?",
      )
        .bind(
          JSON.stringify(body.preferences),
          Date.now(),
          profile.id,
          body.version,
        )
        .run();
      const fresh = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
        .bind(profile.id)
        .first<ProfileRow>();
      if (!fresh) throw new ApiError(401, "Please sign in again.");
      if (update.meta.changes !== 1)
        throw new ApiError(409, "Preferences have changed.", state(fresh));
      return json(state(fresh));
    }
    if (path === "/v1/logout" && method === "POST") {
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(await sha256(bearer(request)))
        .run();
      return json({ ok: true });
    }
    if (path === "/v1/me" && method === "DELETE") {
      if (profile.kind === "user") {
        const body = await readBody(request);
        if (typeof body.password !== "string" || body.password.length > 128)
          throw new ApiError(
            400,
            "Enter your password to delete your account.",
          );
        await rateLimit(env, "delete:" + profile.id, true);
        const hash = await passwordHash(
          body.password,
          profile.password_salt!,
          authSecret(env),
        );
        if (!equalHex(hash, profile.password_hash!))
          throw new ApiError(401, "Password is incorrect.");
      }
      await env.DB.prepare("DELETE FROM profiles WHERE id = ?")
        .bind(profile.id)
        .run();
      return json({ ok: true });
    }
    throw new ApiError(405, "Method not allowed.");
  }
  throw new ApiError(404, "Not found.");
}

export default {
  async fetch(request, env): Promise<Response> {
    if (String(env.MIGRATION_PAUSED) === "true")
      return Response.json(
        { error: "Temporarily unavailable. Please try again shortly." },
        {
          status: 503,
          headers: { "Retry-After": "30", "Cache-Control": "no-store" },
        },
      );
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    let response: Response;
    const nativeSocketOrigin = origin === new URL(request.url).origin;
    if (origin && !allowed.includes(origin) && !nativeSocketOrigin)
      response = json({ error: "Origin not allowed." }, 403);
    else if (request.method === "OPTIONS")
      response = new Response(null, { status: 204 });
    else {
      try {
        response = await route(request, env);
      } catch (error) {
        if (error instanceof AccessError)
          response = json(
            {
              error: error.message,
              code: error.code,
              ...(error.access
                ? {
                    access: await signAccess(
                      env,
                      JSON.parse(error.access.payload),
                      new URL(request.url).origin,
                    ),
                  }
                : {}),
            },
            error.status,
          );
        else if (error instanceof RoomError)
          response = json({ error: error.message }, error.status);
        else if (
          error instanceof Error &&
          /^RoomError[45]\d\d$/.test(error.name)
        )
          response = json(
            { error: error.message },
            Number(error.name.slice(9)),
          );
        else if (error instanceof ApiError)
          response = json(
            { error: error.message, ...error.details },
            error.status,
          );
        else {
          // Do not log credentials, request bodies, or database exceptions with bound values.
          console.error(
            JSON.stringify({
              event: "request_failed",
              path: new URL(request.url).pathname,
            }),
          );
          response = json(
            { error: "Service unavailable. Your local game is safe." },
            500,
          );
        }
      }
    }
    // A proxied upgrade response carries the accepted socket and immutable headers.
    if (response.status === 101) return response;
    // Redirects and asset responses may carry immutable headers.
    response = new Response(response.body, response);
    if (!response.headers.has("Cache-Control"))
      response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Vary", "Origin");
    if (response.status === 429) response.headers.set("Retry-After", "60");
    if (origin && allowed.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, X-Device-Key",
      );
    }
    return response;
  },
  async scheduled(_controller, env): Promise<void> {
    if (String(env.MIGRATION_PAUSED) === "true") return;
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(Date.now())
      .run();
    await env.DB.prepare(
      "DELETE FROM online_socket_tickets WHERE expires_at <= ?",
    )
      .bind(Date.now())
      .run();
  },
} satisfies ExportedHandler<Env>;
