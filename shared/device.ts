export type MobileSource = "device_selected" | "manual_ios";
export type DeviceInfo = {
  platform: "android" | "ios";
  platformScopedId: string | null;
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string | null;
  osName: string | null;
  osVersion: string | null;
  appId: string | null;
  appVersion: string | null;
  appBuild: string | null;
  isPhysicalDevice: boolean;
  sdkInt?: number;
  abis?: string[];
};
export const isDeviceUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    value,
  );
export function normalizeMobile(value: string): string | null {
  const normalized = value.trim().replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}
/** Only a bounded allow-list is stored; device metadata is self-reported, never authentication. */
export function parseDeviceInfo(value: unknown): DeviceInfo | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    (v.platform !== "android" && v.platform !== "ios") ||
    typeof v.isPhysicalDevice !== "boolean"
  )
    return null;
  const fields = [
    "platformScopedId",
    "brand",
    "manufacturer",
    "modelName",
    "modelId",
    "osName",
    "osVersion",
    "appId",
    "appVersion",
    "appBuild",
  ] as const;
  for (const key of fields)
    if (
      v[key] !== null &&
      (typeof v[key] !== "string" ||
        (v[key] as string).length > 160 ||
        /[\x00-\x1f]/.test(v[key] as string))
    )
      return null;
  const info = {
    platform: v.platform,
    isPhysicalDevice: v.isPhysicalDevice,
  } as DeviceInfo;
  for (const key of fields) info[key] = v[key] as string | null;
  if (v.sdkInt !== undefined) {
    if (!Number.isInteger(v.sdkInt) || (v.sdkInt as number) < 1 || (v.sdkInt as number) > 100) return null;
    info.sdkInt = v.sdkInt as number;
  }
  if (v.abis !== undefined) {
    if (!Array.isArray(v.abis) || v.abis.length > 8 || !v.abis.every(a => typeof a === 'string' && /^[a-zA-Z0-9_-]{1,30}$/.test(a))) return null;
    info.abis = v.abis;
  }
  return info;
}
