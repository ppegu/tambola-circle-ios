import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDeviceUuid,
  normalizeMobile,
  parseDeviceInfo,
} from "../shared/device";
const state = vi.hoisted(() => ({
  secure: null as string | null,
  cache: new Map<string, string>(),
  platform: { OS: "ios" },
  saves: 0,
  request: vi.fn(),
}));
vi.mock("react-native", () => ({
  Platform: state.platform,
  AppState: {
    currentState: "active",
    addEventListener: vi.fn(() => ({ remove() {} })),
  },
}));
vi.mock("../src/native/secureStore", () => ({
  getItem: vi.fn(async () => state.secure),
  setItem: vi.fn(async (_: string, value: string) => {
    state.secure = value;
    state.saves++;
  }),
}));
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    setItem: vi.fn(async (key: string, value: string) => {
      state.cache.set(key, value);
    }),
    getItem: vi.fn(async (key: string) => state.cache.get(key) ?? null),
    removeItem: vi.fn(),
  },
}));
vi.mock("../src/native/crypto", () => ({
  randomUUID: () => crypto.randomUUID(),
  getRandomBytes: (size: number) =>
    crypto.getRandomValues(new Uint8Array(size)),
}));
vi.mock("../modules/circle-device", () => ({ default: {
  getDeviceInfo: async () => ({ platform: state.platform.OS, platformScopedId: null,
    brand: "Apple", manufacturer: "Apple", modelName: "iPhone test", modelId: null,
    osName: "iOS", osVersion: "18.0", appId: "com.ppegu.tambola", appVersion: "1.1.2", appBuild: "5", isPhysicalDevice: true }),
} }));
vi.mock("../src/api", () => ({ request: state.request }));
beforeEach(() => {
  vi.resetModules();
  state.secure = null;
  state.cache.clear();
  state.saves = 0;
  state.platform.OS = "ios";
  state.request.mockReset().mockResolvedValue({});
});
describe("persistent device identity", () => {
  it("does not overwrite an identity when protected storage cannot be read", async () => {
    const secure = await import("../src/native/secureStore");
    vi.mocked(secure.getItem).mockRejectedValueOnce(new Error("key unavailable"));
    const { ensureDeviceIdentity } = await import("../src/online/storage");
    await expect(ensureDeviceIdentity()).rejects.toThrow("key unavailable");
    expect(state.saves).toBe(0);
  });

  it("creates one UUID and credential when startup and registration run together", async () => {
    const { ensureDeviceIdentity } = await import("../src/online/storage");
    const [a, b] = await Promise.all([
      ensureDeviceIdentity(),
      ensureDeviceIdentity(),
    ]);
    expect(a).toEqual(b);
    expect(isDeviceUuid(a.deviceUuid)).toBe(true);
    expect(state.saves).toBe(1);
    expect(await ensureDeviceIdentity()).toEqual(a);
  });
  it("upgrades an existing account without replacing its credential or profile", async () => {
    const saved = {
      key: "d_" + "a".repeat(64),
      profile: { id: "existing", name: "Player" },
    };
    state.secure = JSON.stringify(saved);
    const { ensureDeviceIdentity } = await import("../src/online/storage");
    const updated = await ensureDeviceIdentity();
    expect(updated).toMatchObject(saved);
    expect(isDeviceUuid(updated.deviceUuid)).toBe(true);
    expect(await ensureDeviceIdentity()).toEqual(updated);
  });
  it("records metadata locally before the network and reuses its UUID on retry", async () => {
    const { recordDeviceOpen } = await import(
      "../src/online/deviceRegistration"
    );
    state.request.mockImplementationOnce(async () => {
      expect(state.cache.has("tambola.circle.device.snapshot.v1")).toBe(true);
      throw new Error("offline");
    });
    await expect(recordDeviceOpen()).rejects.toThrow("offline");
    const pending = JSON.parse(
      state.cache.get("tambola.circle.device.snapshot.v1")!,
    );
    expect(pending.syncedAt).toBeNull();
    expect(pending.info.platformScopedId).toBeNull();
    await recordDeviceOpen();
    const synced = JSON.parse(
      state.cache.get("tambola.circle.device.snapshot.v1")!,
    );
    expect(synced.deviceUuid).toBe(pending.deviceUuid);
    expect(synced.syncedAt).toBeTypeOf("number");
    expect(state.request).toHaveBeenLastCalledWith(
      "/v2/devices/open",
      expect.objectContaining({
        token: expect.stringMatching(/^d_/),
        body: expect.objectContaining({ deviceUuid: pending.deviceUuid }),
      }),
    );
  });
});
describe("mobile and device metadata boundaries", () => {
  it("accepts formatted international numbers without guessing the country", () => {
    expect(normalizeMobile("+91 (98765) 43210")).toBe("+919876543210");
    for (const value of [
      "9876543210",
      "+0123456789",
      "+91bad43210",
      "+123",
      "+1234567890123456",
    ])
      expect(normalizeMobile(value)).toBeNull();
  });
  it("stores only allowed fields and rejects oversized or malformed information", async () => {
    const { collectDeviceInfo } = await import(
      "../src/online/deviceRegistration"
    );
    const info = await collectDeviceInfo();
    expect(parseDeviceInfo({ ...info, contacts: ["not stored"] })).toEqual(
      info,
    );
    expect(parseDeviceInfo({ ...info, modelName: "x".repeat(161) })).toBeNull();
    expect(parseDeviceInfo({ ...info, platform: "web" })).toBeNull();
    expect(parseDeviceInfo({ ...info, platform: ["ios"] })).toBeNull();
    expect(parseDeviceInfo({ ...info, isPhysicalDevice: "true" })).toBeNull();
    expect(parseDeviceInfo({ ...info, osVersion: "line\nbreak" })).toBeNull();
  });
});
