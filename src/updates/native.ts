import { NativeModules } from "react-native";
export type UpdateTransfer = {
  status:
    | "idle"
    | "downloading"
    | "paused"
    | "verifying"
    | "ready"
    | "installing"
    | "error";
  error: string;
  downloaded: number;
  total: number;
  releaseId: string | null;
  canInstall: boolean;
};
export type UpdateClock = { wall: number; elapsed: number; bootId: string };
type Updater = {
  verifyAccess(
    payload: string,
    signature: string,
    publicKey: string,
  ): Promise<boolean>;
  clock(): Promise<UpdateClock>;
  getState(): Promise<UpdateTransfer>;
  download(json: string, origin: string): Promise<void>;
  pause(): Promise<void>;
  openInstallSettings(): Promise<void>;
  install(): Promise<void>;
  clearCompleted(): Promise<void>;
};
export function updater(): Updater {
  const module = NativeModules.CircleUpdater as Updater | undefined;
  if (!module)
    throw new Error("Android updater is unavailable. Rebuild the app.");
  return module;
}
