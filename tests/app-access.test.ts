import { describe, expect, it } from "vitest";
import {
  chooseAccess,
  parseAccess,
  usableLease,
  validRelease,
  type AccessDecision,
  type CachedAccess,
  type ReleaseDescriptor,
  type ReleasePolicy,
} from "../shared/appAccess";
const release: ReleaseDescriptor = {
  id: "android-10",
  packageId: "com.ppegu.tambola",
  versionCode: 10,
  versionName: "1.4.1",
  bytes: 1000,
  sha256: "a".repeat(64),
  signerSha256: "b".repeat(64),
  minSdk: 24,
  abis: ["arm64-v8a"],
  url: "https://example.test/file.apk",
  notes: ["Smoother games"],
  publishedAt: 1,
};
const policy: ReleasePolicy = {
  revision: 2,
  latestBuild: 10,
  minimumBuild: 1,
  locked: false,
  message: "",
  offlineHours: 24,
  requireMetadata: false,
};
const access: AccessDecision = {
  schemaVersion: 1,
  revision: 2,
  issuedAt: 1000,
  expiresAt: 86401000,
  deviceUuid: "12345678-1234-4123-8123-123456789012",
  packageId: release.packageId,
  installedBuild: 9,
  decision: "optional_update",
  message: "",
  release,
};
const cached: CachedAccess = {
  signed: { keyId: "key", payload: "", signature: "" },
  receivedWall: 5000,
  receivedElapsed: 100,
  bootId: "5",
  lastWall: 5000,
};
describe("release and access contract", () => {
  it("keeps restriction priority independent of having a new APK", () => {
    expect(
      chooseAccess({
        blocked: true,
        policy: { ...policy, locked: true },
        installedBuild: 9,
        release,
      }),
    ).toBe("device_blocked");
    expect(
      chooseAccess({
        blocked: false,
        policy: { ...policy, locked: true },
        installedBuild: 9,
        installedStatus: "revoked",
        release,
      }),
    ).toBe("app_locked");
    for (const installedStatus of [
      "deprecated",
      "archived",
      "revoked",
    ] as const)
      expect(
        chooseAccess({
          blocked: false,
          policy,
          installedBuild: 9,
          installedStatus,
          release,
        }),
      ).toBe("release_blocked");
    expect(
      chooseAccess({
        blocked: false,
        policy: { ...policy, minimumBuild: 10 },
        installedBuild: 9,
        release,
      }),
    ).toBe("required_update");
    expect(
      chooseAccess({
        blocked: false,
        policy: { ...policy, minimumBuild: 10 },
        installedBuild: 9,
      }),
    ).toBe("release_blocked");
    expect(
      chooseAccess({ blocked: false, policy, installedBuild: 9, release }),
    ).toBe("optional_update");
    expect(chooseAccess({ blocked: false, policy, installedBuild: 10 })).toBe(
      "allow",
    );
  });
  it("rejects malformed, oversized and downgrade descriptors", () => {
    expect(parseAccess(access)).toEqual(access);
    for (const patch of [
      { bytes: 400 * 1048576 },
      { versionCode: 0 },
      { minSdk: 23 },
      { abis: ["unknown"] },
      { sha256: "x".repeat(64) },
      { url: "http://example.test/a.apk" },
      { versionName: "<script>" },
    ])
      expect(validRelease({ ...release, ...patch })).toBe(false);
    expect(
      parseAccess({ ...access, release: { ...release, versionCode: 9 } }),
    ).toBeNull();
    expect(
      parseAccess({ ...access, release: { ...release, packageId: "other" } }),
    ).toBeNull();
    expect(parseAccess({ ...access, release: undefined })).toBeNull();
    expect(
      parseAccess({ ...access, expiresAt: access.expiresAt + 1 }),
    ).toBeNull();
  });
  it("permits HTTP only for loopback debug packages", () => {
    expect(
      validRelease({
        ...release,
        packageId: release.packageId + ".dev",
        url: "http://127.0.0.1:8792/file.apk",
      }),
    ).toBe(true);
    expect(
      validRelease({ ...release, url: "http://127.0.0.1:8792/file.apk" }),
    ).toBe(false);
  });
});
describe("bounded offline lease", () => {
  it("expires using monotonic time even when the wall clock is rolled back", () => {
    expect(
      usableLease(access, cached, { wall: 5001, elapsed: 101, bootId: "5" }),
    ).toBe(true);
    expect(
      usableLease(access, cached, {
        wall: 5001,
        elapsed: 86400100,
        bootId: "5",
      }),
    ).toBe(false);
    expect(
      usableLease(
        access,
        { ...cached, lastWall: 100000 },
        { wall: 5001, elapsed: 101, bootId: "5" },
      ),
    ).toBe(false);
  });
  it("requires a refresh after reboot or corrupt monotonic time", () => {
    expect(
      usableLease(access, cached, { wall: 5001, elapsed: 101, bootId: "6" }),
    ).toBe(false);
    expect(
      usableLease(access, cached, { wall: 5001, elapsed: 99, bootId: "5" }),
    ).toBe(false);
  });
  it("never treats an expired denial as permission to play", () => {
    for (const decision of [
      "device_blocked",
      "app_locked",
      "required_update",
      "release_blocked",
    ] as const)
      expect(
        usableLease({ ...access, decision }, cached, {
          wall: 5001,
          elapsed: 101,
          bootId: "5",
        }),
      ).toBe(false);
  });
});
