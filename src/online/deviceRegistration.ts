import AsyncStorage from "@react-native-async-storage/async-storage";
import CircleDevice from "../../modules/circle-device";
import { AppState } from "react-native";
import type { DeviceInfo } from "../../shared/device";
import { request } from "../api";
import { ensureDeviceIdentity, type OnlineIdentity } from "./storage";
import type { SignedAccess } from "../../shared/appAccess";
import { configureDeviceKey } from "../updates/events";

const SNAPSHOT = "tambola.circle.device.snapshot.v1";
let recording:
  Promise<{ identity: OnlineIdentity; access?: SignedAccess }> | undefined;
export async function collectDeviceInfo(): Promise<DeviceInfo> {
  return CircleDevice.getDeviceInfo();
}
export function recordDeviceOpen(): Promise<OnlineIdentity> {
  return recordDeviceAccess().then((result) => result.identity);
}
export function recordDeviceAccess(): Promise<{
  identity: OnlineIdentity;
  access?: SignedAccess;
}> {
  if (recording) return recording;
  recording = (async () => {
    const identity = await ensureDeviceIdentity();
    configureDeviceKey(identity.key);
    const info = await collectDeviceInfo();
    const capturedAt = Date.now();
    const payload = {
      deviceUuid: identity.deviceUuid,
      info,
      ...(info.platform === "android" ? { accessCapability: 1 } : {}),
    };
    // Persist immediately, including when the first app launch has no network.
    await AsyncStorage.setItem(
      SNAPSHOT,
      JSON.stringify({ ...payload, capturedAt, syncedAt: null }),
    );
    const response = await request<{ access?: SignedAccess }>(
      "/v2/devices/open",
      {
        method: "POST",
        token: identity.key,
        body: payload,
      },
    );
    await AsyncStorage.setItem(
      SNAPSHOT,
      JSON.stringify({ ...payload, capturedAt, syncedAt: Date.now() }),
    );
    return { identity, access: response.access };
  })().finally(() => {
    recording = undefined;
  });
  return recording;
}
/** Recording never blocks the offline caller. A failed sync retries while the app is active. */
export function startDeviceRecording(): () => void {
  let stopped = false,
    retry: ReturnType<typeof setTimeout> | undefined;
  const sync = () => {
    clearTimeout(retry);
    if (stopped || ["background", "inactive"].includes(AppState.currentState))
      return;
    void recordDeviceOpen().catch(() => {
      if (!stopped) retry = setTimeout(sync, 30_000);
    });
  };
  sync();
  const listener = AppState.addEventListener("change", (state) => {
    if (state === "active") sync();
    else clearTimeout(retry);
  });
  return () => {
    stopped = true;
    clearTimeout(retry);
    listener.remove();
  };
}
