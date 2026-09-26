/** Wire contract shared by the Android gate, operator API and public release pages. */
export const MAX_OFFLINE_MS = 24 * 60 * 60 * 1000;
export const MAX_APK_BYTES = 350 * 1024 * 1024;
export const ACCESS_DECISIONS = [
  "allow",
  "optional_update",
  "required_update",
  "release_blocked",
  "device_blocked",
  "app_locked",
] as const;
export type AccessKind = (typeof ACCESS_DECISIONS)[number];
export type ReleaseStatus =
  "draft" | "active" | "deprecated" | "archived" | "revoked";
export type ReleaseDescriptor = {
  id: string;
  packageId: string;
  versionCode: number;
  versionName: string;
  bytes: number;
  sha256: string;
  signerSha256: string;
  minSdk: number;
  abis: string[];
  url: string;
  notes: string[];
  publishedAt: number;
};
export type AccessDecision = {
  schemaVersion: 1;
  revision: number;
  issuedAt: number;
  expiresAt: number;
  deviceUuid: string;
  packageId: string;
  installedBuild: number;
  decision: AccessKind;
  message: string;
  supportReference?: string;
  release?: ReleaseDescriptor;
};
/** Signature covers the exact UTF-8 payload, not a reserialized object. */
export type SignedAccess = {
  keyId: string;
  payload: string;
  signature: string;
};
export type ReleasePolicy = {
  revision: number;
  latestBuild: number | null;
  minimumBuild: number;
  locked: boolean;
  message: string;
  offlineHours: number;
  requireMetadata: boolean;
};
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const integer = (
  x: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): x is number =>
  Number.isSafeInteger(x) && (x as number) >= min && (x as number) <= max;
const bounded = (x: unknown, max: number): x is string =>
  typeof x === "string" &&
  x.length > 0 &&
  x.length <= max &&
  !/[\x00-\x08\x0b-\x1f]/.test(x);
export function validRelease(x: unknown): x is ReleaseDescriptor {
  if (!object(x)) return false;
  return (
    bounded(x.id, 100) &&
    /^[a-zA-Z0-9._-]+$/.test(x.id) &&
    bounded(x.packageId, 150) &&
    integer(x.versionCode, 1, 2147483647) &&
    bounded(x.versionName, 40) &&
    /^[0-9A-Za-z._-]+$/.test(x.versionName) &&
    integer(x.bytes, 1, MAX_APK_BYTES) &&
    typeof x.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(x.sha256) &&
    typeof x.signerSha256 === "string" &&
    /^[a-f0-9]{64}$/.test(x.signerSha256) &&
    integer(x.minSdk, 24, 100) &&
    Array.isArray(x.abis) &&
    x.abis.length > 0 &&
    x.abis.length <= 4 &&
    x.abis.every((a) =>
      ["arm64-v8a", "armeabi-v7a", "x86_64", "x86"].includes(a),
    ) &&
    bounded(x.url, 1024) &&
    (/^https:\/\/[^\s]+$/.test(x.url) ||
      (x.packageId.endsWith(".dev") &&
        /^http:\/\/127\.0\.0\.1(?::\d+)?\//.test(x.url))) &&
    Array.isArray(x.notes) &&
    x.notes.length <= 12 &&
    x.notes.every((n) => bounded(n, 240)) &&
    integer(x.publishedAt, 0)
  );
}
export function parseAccess(x: unknown): AccessDecision | null {
  if (
    !object(x) ||
    x.schemaVersion !== 1 ||
    !integer(x.revision, 0) ||
    !integer(x.issuedAt, 0) ||
    !integer(x.expiresAt, 0) ||
    x.expiresAt < x.issuedAt ||
    x.expiresAt - x.issuedAt > MAX_OFFLINE_MS ||
    !bounded(x.deviceUuid, 40) ||
    !/^[a-f0-9-]{36}$/.test(x.deviceUuid) ||
    !bounded(x.packageId, 150) ||
    !integer(x.installedBuild, 1) ||
    !ACCESS_DECISIONS.includes(x.decision as AccessKind) ||
    typeof x.message !== "string" ||
    x.message.length > 500 ||
    (x.supportReference !== undefined && !bounded(x.supportReference, 64)) ||
    (x.release !== undefined && !validRelease(x.release))
  )
    return null;
  if (
    (x.decision === "optional_update" || x.decision === "required_update") &&
    !x.release
  )
    return null;
  if (
    x.release &&
    ((x.release as ReleaseDescriptor).packageId !== x.packageId ||
      (x.release as ReleaseDescriptor).versionCode <= x.installedBuild)
  )
    return null;
  return x as AccessDecision;
}
export function isSignedAccess(x: unknown): x is SignedAccess {
  return (
    object(x) &&
    bounded(x.keyId, 64) &&
    bounded(x.payload, 12000) &&
    bounded(x.signature, 1024) &&
    /^[A-Za-z0-9+/=]+$/.test(x.signature)
  );
}
export const denied = (decision: AccessKind) =>
  !["allow", "optional_update"].includes(decision);
export function chooseAccess(input: {
  blocked: boolean;
  policy: ReleasePolicy;
  installedBuild: number;
  installedStatus?: ReleaseStatus;
  release?: ReleaseDescriptor;
}): AccessKind {
  if (input.blocked) return "device_blocked";
  if (input.policy.locked) return "app_locked";
  if (
    input.installedStatus &&
    ["deprecated", "archived", "revoked"].includes(input.installedStatus)
  )
    return "release_blocked";
  if (input.installedBuild < input.policy.minimumBuild)
    return input.release ? "required_update" : "release_blocked";
  return input.release ? "optional_update" : "allow";
}
export type CachedAccess = {
  signed: SignedAccess;
  receivedWall: number;
  receivedElapsed: number;
  bootId: string;
  lastWall: number;
};
/** Known denies do not expire into an allow; ambiguous clock/boot state needs the server. */
export function usableLease(
  access: AccessDecision,
  cache: CachedAccess,
  now: { wall: number; elapsed: number; bootId: string },
): boolean {
  if (
    denied(access.decision) ||
    now.bootId !== cache.bootId ||
    now.elapsed < cache.receivedElapsed ||
    now.wall + 5000 < cache.lastWall
  )
    return false;
  const age = Math.max(
    now.elapsed - cache.receivedElapsed,
    now.wall - cache.receivedWall,
    0,
  );
  return age < Math.min(access.expiresAt - access.issuedAt, MAX_OFFLINE_MS);
}
