import { Platform } from "react-native";
import CircleDevice from "../../modules/circle-device";

export async function selectDeviceNumber(): Promise<string | null> {
  if (Platform.OS !== "android" || !CircleDevice) return null;
  const selected = await CircleDevice.selectPhoneNumber();
  if (!selected) return null;
  const number = selected.replace(/[\s()-]/g, "");
  // No country guessing or editable fallback when the device does not return E.164.
  return /^\+[1-9]\d{7,14}$/.test(number) ? number : null;
}
export async function setGameUi(
  immersive: boolean,
  media: boolean,
): Promise<void> {
  await CircleDevice?.setGameUi(immersive, media);
}
