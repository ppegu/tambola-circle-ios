import { chooseAccess, denied, type AccessDecision, type ReleaseDescriptor, type ReleasePolicy, type ReleaseStatus, type SignedAccess } from '../../shared/appAccess';
import { parseDeviceInfo } from '../../shared/device';
import { sha256 } from './security';
import type { DeviceRow } from './device-records';
import { releaseForOrigin } from './release-origin';

export class AccessError extends Error {
  constructor(public status: number, message: string, public code: string, public access?: SignedAccess) { super(message); }
}
export type ReleaseRow = { package_id: string; version_code: number; descriptor: string; object_key: string; status: ReleaseStatus; effective_at: number; verified_at: number | null };
type PolicyRow = { revision: number; latest_build: number | null; minimum_build: number; locked: number; message: string; offline_hours: number; require_metadata: number };
export async function policyFor(env: Env, packageId: string): Promise<ReleasePolicy> {
  const row = await env.DB.prepare('SELECT * FROM app_policy WHERE package_id=?').bind(packageId).first<PolicyRow>();
  return row ? { revision: row.revision, latestBuild: row.latest_build, minimumBuild: row.minimum_build, locked: !!row.locked, message: row.message, offlineHours: row.offline_hours, requireMetadata: !!row.require_metadata }
    : { revision: 0, latestBuild: null, minimumBuild: 1, locked: false, message: '', offlineHours: 24, requireMetadata: false };
}
export async function latestRelease(env: Env, packageId = 'com.ppegu.tambola'): Promise<ReleaseRow | null> {
  return env.DB.prepare("SELECT r.* FROM app_releases r JOIN app_policy p ON p.package_id=r.package_id AND p.latest_build=r.version_code WHERE r.package_id=? AND r.status='active' AND r.verified_at IS NOT NULL AND r.effective_at<=?").bind(packageId, Date.now()).first<ReleaseRow>();
}
export async function deviceForKey(env: Env, key: string): Promise<DeviceRow | null> {
  if (!/^d_[a-f0-9]{64}$/.test(key)) return null;
  return env.DB.prepare('SELECT * FROM online_devices WHERE device_hash=?').bind(await sha256(key)).first<DeviceRow>();
}
export async function scopedHash(env: Env, platform: string, packageId: string | null, id: string | null): Promise<string | null> {
  if (platform !== 'android' || !id || !env.AUTH_SECRET) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.AUTH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${platform}:${packageId}:${id}`));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export async function evaluateDevice(env: Env, device: DeviceRow): Promise<AccessDecision | null> {
  if (device.platform !== 'android') return null;
  const info = parseDeviceInfo(JSON.parse(device.info_json));
  if (!info?.appId || !/^[1-9]\d{0,9}$/.test(info.appBuild ?? '')) throw new AccessError(403, 'Update the app to continue.', 'APP_METADATA_REQUIRED');
  const policy = await policyFor(env, info.appId), now = Date.now(), installedBuild = Number(info.appBuild);
  const block = await env.DB.prepare(`SELECT support_reference FROM device_restrictions WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?) AND
    ((target_kind='device' AND target=?) OR (target_kind='player' AND target=?) OR (target_kind='scoped_id' AND target=?)) LIMIT 1`)
    .bind(now, device.device_uuid, device.player_id ?? '', device.scoped_id_hash ?? '').first<{ support_reference: string }>();
  const installed = await env.DB.prepare('SELECT status,effective_at FROM app_releases WHERE package_id=? AND version_code=?').bind(info.appId, installedBuild).first<{ status: ReleaseStatus; effective_at: number }>();
  const latest = await latestRelease(env, info.appId);
  const descriptor = latest ? JSON.parse(latest.descriptor) as ReleaseDescriptor : undefined;
  const compatible = descriptor && descriptor.versionCode > installedBuild && descriptor.minSdk <= (info.sdkInt ?? 24) &&
    (!info.abis?.length || descriptor.abis.some(a => info.abis!.includes(a)));
  const release = compatible ? descriptor : undefined;
  const decision = chooseAccess({ blocked: !!block, policy, installedBuild, installedStatus: installed && installed.effective_at <= now ? installed.status : undefined, release });
  return { schemaVersion: 1, revision: policy.revision, issuedAt: now, expiresAt: now + Math.min(24, Math.max(0, policy.offlineHours)) * 3600_000,
    deviceUuid: device.device_uuid, packageId: info.appId, installedBuild, decision,
    message: decision === 'app_locked' ? policy.message || 'Tambola Circle is temporarily unavailable. Please try again later.' : '',
    ...(block ? { supportReference: block.support_reference } : {}), ...(release ? { release } : {}) };
}
export async function signAccess(env: Env, decision: AccessDecision, origin?: string): Promise<SignedAccess> {
  if (!env.UPDATE_SIGNING_KEY || !env.UPDATE_KEY_ID) throw new AccessError(503, 'App access is temporarily unavailable. Please try again.', 'ACCESS_UNAVAILABLE');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(env.UPDATE_SIGNING_KEY), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const payload = JSON.stringify(decision.release ? { ...decision, release: releaseForOrigin(decision.release, origin) } : decision);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(payload));
  return { keyId: env.UPDATE_KEY_ID, payload, signature: btoa(String.fromCharCode(...new Uint8Array(signature))) };
}
export async function enforceDevice(env: Env, device: DeviceRow | null): Promise<void> {
  if (!device) {
    if ((await policyFor(env, 'com.ppegu.tambola')).requireMetadata) throw new AccessError(403, 'Record this device before continuing.', 'APP_METADATA_REQUIRED');
    return;
  }
  const access = await evaluateDevice(env, device);
  if (!access || !denied(access.decision)) return;
  const code = { device_blocked: 'DEVICE_BLOCKED', app_locked: 'APP_LOCKED', release_blocked: 'RELEASE_DISABLED', required_update: 'APP_UPDATE_REQUIRED', allow: '', optional_update: '' }[access.decision];
  throw new AccessError(access.decision === 'app_locked' ? 503 : 403, access.message || 'App access requires your attention.', code, await signAccess(env, access));
}
export async function enforcePlayer(env: Env, playerId: string) {
  const device = await env.DB.prepare('SELECT d.* FROM online_devices d JOIN online_players p ON p.device_hash=d.device_hash WHERE p.id=?').bind(playerId).first<DeviceRow>();
  await enforceDevice(env, device);
}
export async function enforceLegacyRequest(env: Env, request: Request) {
  const key = request.headers.get('X-Device-Key');
  if (key) {
    const device = await deviceForKey(env, key);
    if (!device) throw new AccessError(403, 'Record this device before continuing.', 'APP_METADATA_REQUIRED');
    await enforceDevice(env, device);
  } else if ((await policyFor(env, 'com.ppegu.tambola')).requireMetadata) {
    throw new AccessError(403, 'Update the app to continue.', 'APP_METADATA_REQUIRED');
  }
}
