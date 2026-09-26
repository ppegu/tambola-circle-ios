import AsyncStorage from "@react-native-async-storage/async-storage";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import {
  isLanguage,
  translate,
  translateKnown,
  type Language,
  type MessageKey,
  type Values,
} from "./core";
export { languageNames, languages } from "./core";
export type { Language } from "./core";

const storageKey = "tambola.circle.language.v1";
export const languageStore = createStore<{
  language: Language;
  selected: boolean;
  hydrated: boolean;
}>(() => ({ language: "en", selected: false, hydrated: false }));
let hydration: Promise<void> | undefined;
let revision = 0;
let pendingWrite = Promise.resolve();
export function initializeLanguage() {
  return (hydration ??= (async () => {
    const started = revision;
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (started === revision && isLanguage(saved))
        languageStore.setState({ language: saved, selected: true });
    } catch {
      /* A failed read leaves the picker available with English as its default. */
    } finally {
      languageStore.setState({ hydrated: true });
    }
  })());
}
export async function selectLanguage(language: Language) {
  if (!isLanguage(language)) throw new Error("Unsupported language");
  ++revision;
  const write = pendingWrite
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(storageKey, language));
  pendingWrite = write;
  await write;
  languageStore.setState({ language, selected: true, hydrated: true });
}
export function useLanguage() {
  return useStore(languageStore, (state) => state.language);
}
/** Subscribe in each translated component, including memoized ticket/header components. */
export function useTranslation() {
  useLanguage();
  return t;
}
export function t(key: MessageKey, values?: Values) {
  return translate(languageStore.getState().language, key, values);
}
export function localizeKnownCopy(copy: string) {
  return translateKnown(languageStore.getState().language, copy);
}
