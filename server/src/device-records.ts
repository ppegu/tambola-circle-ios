import { isDeviceUuid, parseDeviceInfo } from "../../shared/device";
import { RoomError } from "./room-engine";
import { sha256 } from "./security";
import { scopedHash } from './app-access';

export type DeviceRow = {
  device_uuid: string;
  device_hash: string;
  platform: "android" | "ios";
  info_json: string;
  first_seen_at: number;
  last_seen_at: number;
  player_id: string | null;
  scoped_id_hash: string | null;
  access_capability: number;
};
export async function recordDevice(
  env: Env,
  key: string,
  payload: Record<string, unknown>,
) {
  if (!/^d_[a-f0-9]{64}$/.test(key))
    throw new RoomError(401, "A device credential is required.");
  const info = parseDeviceInfo(payload.info);
  if (!isDeviceUuid(payload.deviceUuid) || !info)
    throw new RoomError(400, "Invalid device information.");
  const uuid = payload.deviceUuid.toLowerCase(),
    hash = await sha256(key),
    now = Date.now();
  const existing = await env.DB.prepare(
    "SELECT * FROM online_devices WHERE device_uuid=? OR device_hash=?",
  )
    .bind(uuid, hash)
    .all<DeviceRow>();
  if (
    existing.results.some(
      (row) =>
        row.device_uuid !== uuid ||
        row.device_hash !== hash ||
        row.platform !== info.platform,
    )
  )
    throw new RoomError(409, "This device identity does not match.");
  // The conditional update also protects against concurrent registrations of a UUID.
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO online_devices(device_uuid,device_hash,platform,info_json,first_seen_at,last_seen_at,player_id) VALUES(?,?,?,?,?,?,(SELECT id FROM online_players WHERE device_hash=?))",
    ).bind(uuid, hash, info.platform, JSON.stringify(info), now, now, hash),
    env.DB.prepare(
      "UPDATE online_devices SET info_json=?,last_seen_at=?,player_id=(SELECT id FROM online_players WHERE device_hash=?) WHERE device_uuid=? AND device_hash=? AND platform=?",
    ).bind(JSON.stringify(info), now, hash, uuid, hash, info.platform),
  ]);
  const row = await env.DB.prepare(
    "SELECT * FROM online_devices WHERE device_hash=?",
  )
    .bind(hash)
    .first<DeviceRow>();
  if (!row || row.device_uuid !== uuid || row.platform !== info.platform)
    throw new RoomError(409, "This device identity does not match.");
  const scoped = await scopedHash(env, info.platform, info.appId, info.platformScopedId);
  const capability = payload.accessCapability === 1 ? 1 : 0;
  if (scoped !== row.scoped_id_hash || capability > row.access_capability) {
    await env.DB.prepare('UPDATE online_devices SET scoped_id_hash=?,access_capability=MAX(access_capability,?) WHERE device_uuid=?').bind(scoped, capability, uuid).run();
  }
  return {
    deviceUuid: row.device_uuid,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    registered: !!row.player_id,
  };
}
