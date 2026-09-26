import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "./native/secureStore";
import {
  DEFAULT_PREFERENCES,
  isPreferences,
  type Preferences,
  type Profile,
} from "../shared/preferences";
import { isHistory } from "./game";

export type LocalState = {
  preferences: Preferences;
  history: number[];
  dirty: boolean;
  cloudVersion: number;
};
export type Identity = { token: string; profile: Profile | null };
export const EMPTY_STATE: LocalState = {
  preferences: DEFAULT_PREFERENCES,
  history: [],
  dirty: false,
  cloudVersion: 0,
};
// Stable storage identifiers preserve saved games and sign-ins across branding changes.
const LOCAL_KEY = "tambola-circle.local.v1";
const IDENTITY_KEY = "tambola-circle.identity.v1";
let localWrites = Promise.resolve();
let identityWrites = Promise.resolve();

export async function readLocal(): Promise<LocalState> {
  const raw = await AsyncStorage.getItem(LOCAL_KEY);
  if (!raw) return { ...EMPTY_STATE };
  try {
    const data = JSON.parse(raw);
    const preferences =
      data.preferences && typeof data.preferences === "object"
        ? { voice: "classic", callPause: 1, ...data.preferences }
        : null;
    return {
      preferences: isPreferences(preferences)
        ? preferences
        : DEFAULT_PREFERENCES,
      history: isHistory(data.history) ? data.history : [],
      dirty: data.dirty === true,
      cloudVersion:
        Number.isSafeInteger(data.cloudVersion) && data.cloudVersion >= 0
          ? data.cloudVersion
          : 0,
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}
export function saveLocal(data: LocalState): Promise<void> {
  localWrites = localWrites
    .catch(() => {})
    .then(() => AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(data)));
  return localWrites;
}
export async function readIdentity(): Promise<Identity | null> {
  const raw = await SecureStore.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (
      typeof data.token !== "string" ||
      !/^[gs]_[a-f0-9]{64}$/.test(data.token)
    )
      return null;
    if (
      data.profile !== null &&
      (!data.profile ||
        typeof data.profile.id !== "string" ||
        !["user", "guest"].includes(data.profile.kind))
    )
      return null;
    return data as Identity;
  } catch {
    return null;
  }
}
export function saveIdentity(identity: Identity | null): Promise<void> {
  identityWrites = identityWrites
    .catch(() => {})
    .then(async () => {
      if (identity)
        await SecureStore.setItem(IDENTITY_KEY, JSON.stringify(identity));
      else await SecureStore.deleteItem(IDENTITY_KEY);
    });
  return identityWrites;
}
