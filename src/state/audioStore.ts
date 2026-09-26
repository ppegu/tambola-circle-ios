import { createStore } from "zustand/vanilla";
export const audioStore = createStore(() => ({
  preparing: true,
  error: "",
  speak: (_number: number, _force?: boolean) => {},
  stop: () => {},
  isSpeaking: (): boolean => false,
}));
