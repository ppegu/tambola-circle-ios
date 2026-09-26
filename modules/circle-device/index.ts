import { NativeModules } from "react-native";
import type { DeviceInfo } from "../../shared/device";

export type VoiceClipSource = { uri: string; durationMs: number };
export type VoiceFile = { number: number; bytes: number; sha256: string };
export type VoiceFileDownload = VoiceFile & {
  id: string;
  revision: string;
  url: string;
  token: string;
};
type CircleDevice = {
  addListener(name: string): void;
  removeListeners(count: number): void;
  haptic(): void;
  selectPhoneNumber(): Promise<string | null>;
  setGameUi(immersive: boolean, media: boolean): Promise<void>;
  randomHex(size: number): string;
  randomUUID(): string;
  getSecureItem(key: string): Promise<string | null>;
  setSecureItem(key: string, value: string): Promise<void>;
  deleteSecureItem(key: string): Promise<void>;
  getDeviceInfo(): Promise<DeviceInfo>;
  setClipboard(value: string): Promise<void>;
  setAudioActive(active: boolean): Promise<void>;
  setVoiceChatActive(active: boolean): Promise<void>;
  requestMicrophonePermission?(): Promise<boolean>;
  setVoiceVolume?(volume: number): Promise<void>;
  prepareClips?(sources: VoiceClipSource[]): Promise<void>;
  releaseClips?(): Promise<void>;
  playClip(id: string, uri: string): Promise<void>;
  stopClip(id: string): void;
  getVoicePackFiles?(
    id: string,
    revision: string,
    files: VoiceFile[],
  ): Promise<string[] | null>;
  downloadVoiceFile?(request: VoiceFileDownload): Promise<string>;
  cancelVoiceDownload?(token: string): Promise<void>;
  finishVoiceDownload?(token: string): Promise<void>;
  removeVoicePack?(id: string): Promise<void>;
  getVoiceStorageFreeBytes?(): Promise<number>;
};
function requireDevice(): CircleDevice {
  const native = NativeModules.CircleDevice as CircleDevice | undefined;
  if (!native)
    throw new Error(
      "CircleDevice is missing. Rebuild the native app after installing dependencies.",
    );
  return native;
}
export default requireDevice();
