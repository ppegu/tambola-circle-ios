import {
  validRelease,
  type ReleaseDescriptor,
  type ReleaseStatus,
} from "../../shared/appAccess";
import { AccessError, policyFor, type ReleaseRow } from "./app-access";
import { equalHex, sha256 } from "./security";

async function input(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    throw new AccessError(415, "Use application/json.", "INVALID_REQUEST");
  const reader = request.body?.getReader();
  if (!reader)
    throw new AccessError(400, "A body is required.", "INVALID_REQUEST");
  let text = "",
    size = 0;
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > 16000) {
        await reader.cancel();
        throw new AccessError(413, "Request too large.", "INVALID_REQUEST");
      }
      text += decoder.decode(item.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === "object" && !Array.isArray(value))
      return value as Record<string, unknown>;
  } catch {
    /* bounded invalid input */
  }
  throw new AccessError(400, "Invalid JSON.", "INVALID_REQUEST");
}
const invalid = (message: string): never => {
  throw new AccessError(400, message, "INVALID_REQUEST");
};
function packageId(value: unknown) {
  return typeof value === "string" &&
    /^com\.ppegu\.tambola(?:\.dev)?$/.test(value)
    ? value
    : invalid("Invalid Android package.");
}
const finiteInt = (value: unknown, min: number, max: number) =>
  Number.isSafeInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
const audit = (
  env: Env,
  action: string,
  target: string,
  before: unknown,
  after: unknown,
) =>
  env.DB.prepare(
    "INSERT INTO admin_audit_log(id,actor,action,target,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?)",
  ).bind(
    crypto.randomUUID(),
    "release-operator",
    action,
    target,
    JSON.stringify(before),
    JSON.stringify(after),
    Date.now(),
  );
async function revokeSockets(env: Env, playerId?: string) {
  if (!playerId) return; // App-wide changes are revalidated by every active room alarm within 30s.
  await env.DB.prepare("DELETE FROM online_socket_tickets WHERE player_id=?")
    .bind(playerId)
    .run();
  const rooms = await env.DB.prepare(
    "SELECT table_id FROM online_memberships WHERE player_id=? AND removed=0",
  )
    .bind(playerId)
    .all<{ table_id: string }>();
  await Promise.allSettled(
    rooms.results.map((r) =>
      env.TABLES.getByName(r.table_id).revalidateAccess(),
    ),
  );
}
export async function updateAdmin(
  request: Request,
  env: Env,
): Promise<Response> {
  const token =
    request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (
    !(
      await env.AUTH_LIMITER.limit({
        key:
          "update-admin:" +
          (request.headers.get("CF-Connecting-IP") ?? "local"),
      })
    ).success
  )
    throw new AccessError(429, "Try again later.", "RATE_LIMITED");
  if (
    !env.UPDATE_ADMIN_TOKEN ||
    token.length > 256 ||
    !equalHex(await sha256(token), await sha256(env.UPDATE_ADMIN_TOKEN))
  )
    throw new AccessError(403, "Admin access required.", "FORBIDDEN");
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/v2/admin/app/status") {
    const releases = await env.DB.prepare(
      "SELECT package_id,version_code,status,verified_at,effective_at FROM app_releases ORDER BY created_at DESC LIMIT 100",
    ).all();
    const policies = await env.DB.prepare("SELECT * FROM app_policy").all();
    return Response.json({
      releases: releases.results,
      policies: policies.results,
    });
  }
  if (request.method === "GET" && path === "/v2/admin/app/devices") {
    const query = new URL(request.url).searchParams.get("id");
    if (!query || !/^[a-f0-9-]{36}$/.test(query))
      invalid("Provide a device or player UUID as id.");
    const rows = await env.DB.prepare(
      "SELECT device_uuid,player_id,first_seen_at,last_seen_at,access_capability,json_extract(info_json,'$.appBuild') AS installedBuild,json_extract(info_json,'$.appVersion') AS version FROM online_devices WHERE platform='android' AND (device_uuid=? OR player_id=?) LIMIT 100",
    )
      .bind(query, query)
      .all();
    return Response.json({ devices: rows.results });
  }
  if (request.method === "GET" && path === "/v2/admin/app/audit") {
    const rows = await env.DB.prepare(
      "SELECT id,actor,action,target,before_json,after_json,created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 100",
    ).all();
    return Response.json({ entries: rows.results });
  }
  if (request.method !== "POST")
    throw new AccessError(405, "Use POST.", "METHOD_NOT_ALLOWED");
  const b = await input(request),
    now = Date.now();
  if (
    path !== "/v2/admin/app/releases" &&
    (typeof b.reason !== "string" ||
      b.reason.trim().length < 3 ||
      b.reason.length > 500)
  )
    invalid("An operator reason is required.");
  if (path === "/v2/admin/app/releases") {
    if (!validRelease(b.release)) invalid("Invalid release descriptor.");
    const release = b.release as ReleaseDescriptor,
      pkg = packageId(release.packageId);
    const key = `android/${pkg}/${release.versionCode}/${release.sha256}.apk`;
    if (
      release.url !==
      `${new URL(request.url).origin}/download/android/files/${pkg}/${release.versionCode}/${release.sha256}.apk`
    )
      invalid("Release URL must be the immutable APK route on this server.");
    const existing = await env.DB.prepare(
      "SELECT 1 FROM app_releases WHERE (package_id=? AND (version_code=? OR json_extract(descriptor,'$.versionName')=?)) OR json_extract(descriptor,'$.id')=?",
    )
      .bind(pkg, release.versionCode, release.versionName, release.id)
      .first();
    if (existing)
      throw new AccessError(
        409,
        "This build, version name or release ID already exists. Publish a unique release.",
        "RELEASE_EXISTS",
      );
    const object = await env.RELEASES.get(key);
    if (!object || object.size !== release.bytes)
      invalid("Upload the exact APK to R2 before registering it.");
    // R2 verifies SHA-256 while receiving the stream. Avoid hashing a large APK on
    // the Worker's 10ms free CPU budget, and never buffer the artifact in memory.
    const storedHash = object!.checksums.sha256;
    const actual = storedHash
      ? Array.from(new Uint8Array(storedHash), (v) =>
          v.toString(16).padStart(2, "0"),
        ).join("")
      : "";
    if (actual !== release.sha256) {
      try {
        const verified = await env.RELEASES.put(key, object!.body, {
          sha256: release.sha256,
          onlyIf: { etagMatches: object!.etag },
          httpMetadata: {
            contentType: "application/vnd.android.package-archive",
          },
        });
        if (!verified)
          invalid("The uploaded artifact changed. Upload and verify it again.");
      } catch {
        invalid("Hosted APK checksum mismatch or unavailable artifact.");
      }
    } else await object!.body.cancel();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO app_releases(package_id,version_code,descriptor,object_key,status,verified_at,created_at) VALUES(?,?,?,?,'draft',?,?)",
      ).bind(pkg, release.versionCode, JSON.stringify(release), key, now, now),
      env.DB.prepare(
        "INSERT OR IGNORE INTO app_policy(package_id,updated_at) VALUES(?,?)",
      ).bind(pkg, now),
      audit(env, "release.register", release.id, null, release),
    ]);
    return Response.json(
      { registered: true, status: "draft" },
      { status: 201 },
    );
  }
  if (path === "/v2/admin/app/policy") {
    const pkg = packageId(b.packageId),
      before = await policyFor(env, pkg);
    if (
      !finiteInt(b.expectedRevision, 0, 2147483647) ||
      b.expectedRevision !== before.revision
    )
      throw new AccessError(
        409,
        "Policy changed. Reload before saving.",
        "REVISION_CONFLICT",
      );
    if (
      !finiteInt(b.minimumBuild, 1, 2147483647) ||
      !finiteInt(b.offlineHours, 0, 24) ||
      typeof b.locked !== "boolean" ||
      typeof b.requireMetadata !== "boolean" ||
      typeof b.message !== "string" ||
      b.message.length > 500 ||
      !(b.latestBuild === null || finiteInt(b.latestBuild, 1, 2147483647))
    )
      invalid("Invalid policy.");
    if (b.latestBuild !== null) {
      const release = await env.DB.prepare(
        "SELECT * FROM app_releases WHERE package_id=? AND version_code=?",
      )
        .bind(pkg, b.latestBuild)
        .first<ReleaseRow>();
      if (
        !release?.verified_at ||
        !["draft", "active"].includes(release.status)
      )
        invalid("Latest must be a verified draft or active release.");
      const object = await env.RELEASES.head(release!.object_key),
        descriptor = JSON.parse(release!.descriptor) as ReleaseDescriptor;
      if (!object || object.size !== descriptor.bytes)
        invalid("The replacement APK is unavailable.");
      if ((b.minimumBuild as number) > (b.latestBuild as number))
        invalid("Minimum build exceeds the replacement build.");
    } else if ((b.minimumBuild as number) > 1)
      invalid("A mandatory floor needs a verified replacement.");
    // D1 batch is one transaction: the replacement, floor and audit become visible together.
    const result = await env.DB.batch([
      env.DB.prepare(
        "UPDATE app_releases SET status='active',effective_at=0 WHERE package_id=? AND version_code=? AND status='draft' AND EXISTS(SELECT 1 FROM app_policy WHERE package_id=? AND revision=?)",
      ).bind(pkg, b.latestBuild, pkg, before.revision),
      env.DB.prepare(
        "UPDATE app_policy SET latest_build=?,minimum_build=?,locked=?,message=?,offline_hours=?,require_metadata=?,revision=revision+1,updated_at=? WHERE package_id=? AND revision=? RETURNING revision",
      ).bind(
        b.latestBuild,
        b.minimumBuild,
        b.locked ? 1 : 0,
        b.message,
        b.offlineHours,
        b.requireMetadata ? 1 : 0,
        now,
        pkg,
        before.revision,
      ),
      env.DB.prepare(
        "INSERT INTO admin_audit_log(id,actor,action,target,before_json,after_json,created_at) SELECT ?,'release-operator','policy.update',?,?,?,? WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        pkg,
        JSON.stringify(before),
        JSON.stringify(b),
        now,
      ),
    ]);
    const updated = result[1]!.results[0] as { revision: number } | undefined;
    if (!updated)
      throw new AccessError(
        409,
        "Policy changed. Reload before saving.",
        "REVISION_CONFLICT",
      );
    return Response.json({ revision: updated.revision });
  }
  if (path === "/v2/admin/app/release-status") {
    const pkg = packageId(b.packageId);
    if (
      !finiteInt(b.versionCode, 1, 2147483647) ||
      !["active", "deprecated", "archived", "revoked"].includes(
        String(b.status),
      ) ||
      !finiteInt(b.effectiveAt ?? now, 0, Number.MAX_SAFE_INTEGER)
    )
      invalid("Invalid release status.");
    const before = await env.DB.prepare(
      "SELECT * FROM app_releases WHERE package_id=? AND version_code=?",
    )
      .bind(pkg, b.versionCode)
      .first<ReleaseRow>();
    if (!before) throw new AccessError(404, "Release not found.", "NOT_FOUND");
    const policy = await policyFor(env, pkg);
    if (policy.latestBuild === b.versionCode && b.status !== "active")
      invalid("Activate a replacement before retiring the latest release.");
    const changes = await env.DB.batch([
      env.DB.prepare(
        "UPDATE app_releases SET status=?,effective_at=? WHERE package_id=? AND version_code=? AND EXISTS(SELECT 1 FROM app_policy WHERE package_id=? AND revision=? AND (?='active' OR latest_build IS NULL OR latest_build!=?))",
      ).bind(
        b.status as ReleaseStatus,
        b.effectiveAt ?? now,
        pkg,
        b.versionCode,
        pkg,
        policy.revision,
        b.status,
        b.versionCode,
      ),
      env.DB.prepare(
        "UPDATE app_policy SET revision=revision+1,updated_at=? WHERE package_id=? AND revision=? AND changes()=1",
      ).bind(now, pkg, policy.revision),
      env.DB.prepare(
        "INSERT INTO admin_audit_log(id,actor,action,target,before_json,after_json,created_at) SELECT ?,'release-operator','release.status',?,?,?,? WHERE changes()=1",
      ).bind(
        crypto.randomUUID(),
        pkg + ":" + b.versionCode,
        JSON.stringify({ status: before.status }),
        JSON.stringify(b),
        now,
      ),
    ]);
    if (!changes[0]!.meta.changes)
      throw new AccessError(
        409,
        "Policy changed. Reload before saving.",
        "REVISION_CONFLICT",
      );
    return Response.json({ updated: true });
  }
  if (path === "/v2/admin/app/block") {
    if (
      !["device", "player"].includes(String(b.kind)) ||
      typeof b.target !== "string" ||
      !/^[a-f0-9-]{36}$/.test(b.target) ||
      typeof b.reason !== "string" ||
      b.reason.trim().length < 3 ||
      b.reason.length > 500 ||
      !(
        b.expiresAt == null ||
        finiteInt(b.expiresAt, now + 1000, Number.MAX_SAFE_INTEGER)
      )
    )
      invalid("Provide a device/player ID, reason and valid expiry.");
    const device = await env.DB.prepare(
      `SELECT * FROM online_devices WHERE ${b.kind === "device" ? "device_uuid" : "player_id"}=? AND platform='android'`,
    )
      .bind(b.target)
      .first<{
        device_uuid: string;
        player_id: string | null;
        scoped_id_hash: string | null;
      }>();
    if (!device)
      throw new AccessError(404, "Android device not found.", "NOT_FOUND");
    const id = crypto.randomUUID(),
      reference = "TC-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const statements = [
      env.DB.prepare(
        "INSERT INTO device_restrictions(id,target_kind,target,reason,support_reference,created_at,expires_at,actor) VALUES(?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        b.kind,
        b.target,
        b.reason,
        reference,
        now,
        b.expiresAt ?? null,
        "release-operator",
      ),
    ];
    if (b.matchReinstalls === true && device.scoped_id_hash)
      statements.push(
        env.DB.prepare(
          "INSERT INTO device_restrictions(id,target_kind,target,reason,support_reference,created_at,expires_at,actor) VALUES(?,'scoped_id',?,?,?,?,?,?)",
        ).bind(
          id + "-scoped",
          device.scoped_id_hash,
          b.reason,
          reference,
          now,
          b.expiresAt ?? null,
          "release-operator",
        ),
      );
    statements.push(
      env.DB.prepare(
        "UPDATE app_policy SET revision=revision+1,updated_at=?",
      ).bind(now),
      audit(env, "device.block", b.target as string, null, {
        id,
        kind: b.kind,
        reason: b.reason,
        expiresAt: b.expiresAt ?? null,
      }),
    );
    await env.DB.batch(statements);
    await revokeSockets(env, device.player_id ?? undefined);
    return Response.json({ id, supportReference: reference }, { status: 201 });
  }
  if (path === "/v2/admin/app/unblock") {
    if (typeof b.id !== "string" || !/^[a-f0-9-]{36}$/.test(b.id))
      invalid("Invalid restriction ID.");
    const before = await env.DB.prepare(
      "SELECT id,target_kind,target FROM device_restrictions WHERE id=? AND revoked_at IS NULL",
    )
      .bind(b.id)
      .first();
    if (!before)
      throw new AccessError(404, "Active restriction not found.", "NOT_FOUND");
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE device_restrictions SET revoked_at=? WHERE id=? OR id=?",
      ).bind(now, b.id, b.id + "-scoped"),
      env.DB.prepare(
        "UPDATE app_policy SET revision=revision+1,updated_at=?",
      ).bind(now),
      audit(env, "device.unblock", b.id as string, before, {
        revokedAt: now,
        reason: b.reason,
      }),
    ]);
    return Response.json({ unblocked: true });
  }
  throw new AccessError(404, "Not found.", "NOT_FOUND");
}
