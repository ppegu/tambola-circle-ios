import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "../native/crypto";
import * as SecureStore from "../native/secureStore";
import type { OnlineProfile } from "../../shared/online";
import { isDeviceUuid } from "../../shared/device";

const KEY = "tambola.circle.device.v1";
export type OnlineIdentity = {
  key: string;
  deviceUuid: string;
  profile: OnlineProfile | null;
};
export async function readOnlineIdentity(): Promise<OnlineIdentity | null> {
  const raw = await SecureStore.getItem(KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as OnlineIdentity;
    return /^d_[a-f0-9]{64}$/.test(data.key) ? data : null;
  } catch {
    return null;
  }
}
export async function saveOnlineIdentity(value: OnlineIdentity): Promise<void> {
  await SecureStore.setItem(KEY, JSON.stringify(value));
}
let creating: Promise<OnlineIdentity> | undefined;
export function ensureDeviceIdentity(): Promise<OnlineIdentity> {
  // Startup recording and online sign-in can mount together; never create two identities.
  if (creating) return creating;
  creating = (async () => {
    const saved = await readOnlineIdentity();
    if (saved && isDeviceUuid(saved.deviceUuid)) return saved;
    const value: OnlineIdentity = saved
      ? { ...saved, deviceUuid: Crypto.randomUUID() }
      : {
          key:
            "d_" +
            Array.from(Crypto.getRandomBytes(32), (n) =>
              n.toString(16).padStart(2, "0"),
            ).join(""),
          deviceUuid: Crypto.randomUUID(),
          profile: null,
        };
    await saveOnlineIdentity(value);
    return value;
  })().finally(() => {
    creating = undefined;
  });
  return creating;
}
export const savedTable = {
  get: () => AsyncStorage.getItem("tambola.circle.table"),
  set: (id: string | null) =>
    id
      ? AsyncStorage.setItem("tambola.circle.table", id)
      : AsyncStorage.removeItem("tambola.circle.table"),
};
export const savedInvite = {
  get: () => AsyncStorage.getItem("tambola.circle.invite"),
  set: (url: string | null) =>
    url
      ? AsyncStorage.setItem("tambola.circle.invite", url)
      : AsyncStorage.removeItem("tambola.circle.invite"),
};
