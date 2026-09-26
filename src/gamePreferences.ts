import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CircleDevice from "../modules/circle-device";
export type GamePreferences = {
  markColor: string;
  haptics: boolean;
  stars: boolean;
  reducedMotion: boolean;
  largeNumbers: boolean;
  voiceVolume: number;
};
export const gamePreferencesStore = createStore<GamePreferences>(() => ({
  markColor: "#e62639",
  haptics: true,
  stars: true,
  reducedMotion: false,
  largeNumbers: false,
  voiceVolume: 1,
}));
let edited: Partial<GamePreferences> = {};
const key = "tambola.circle.game-preferences.v3";
let write = Promise.resolve();
void AsyncStorage.getItem(key)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<GamePreferences>;
    const value = { ...gamePreferencesStore.getState() };
    for (const k of [
      "haptics",
      "stars",
      "reducedMotion",
      "largeNumbers",
    ] as const)
      if (typeof saved[k] === "boolean") value[k] = saved[k];
    if (
      ["#e62639", "#9a35de", "#167ce0", "#009da5", "#159b68"].includes(
        saved.markColor ?? "",
      )
    )
      value.markColor =
        saved.markColor === "#159b68" ? "#009da5" : saved.markColor!;
    if (
      typeof saved.voiceVolume === "number" &&
      Number.isFinite(saved.voiceVolume)
    )
      value.voiceVolume = Math.max(0, Math.min(1, saved.voiceVolume));
    gamePreferencesStore.setState({ ...value, ...edited });
  })
  .catch(() => undefined);
export function setGamePreferences(patch: Partial<GamePreferences>) {
  edited = { ...edited, ...patch };
  gamePreferencesStore.setState(patch);
  const json = JSON.stringify(gamePreferencesStore.getState());
  write = write
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key, json));
}
export function useGamePreferences<T = GamePreferences>(
  selector: (state: GamePreferences) => T = ((state) => state) as (
    state: GamePreferences,
  ) => T,
) {
  return useStore(gamePreferencesStore, selector);
}
export function tapFeedback() {
  if (gamePreferencesStore.getState().haptics) CircleDevice.haptic();
}
