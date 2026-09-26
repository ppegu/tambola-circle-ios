import { NativeModules } from "react-native";
import { API_URL, ApiError } from "../api";
import { avatarBytes, isAvatarPhoto } from "../../shared/avatarPhoto";
import { recordDeviceOpen } from "./deviceRegistration";
import { accessHeaders, dispatchAccess } from "../updates/events";
import { t } from "../i18n";

export async function chooseAvatarPhoto(): Promise<string | null> {
  const native = NativeModules.CirclePhotos as
    { pick?: () => Promise<string | null> } | undefined;
  if (!native?.pick) throw new Error(t("Update the app to choose a photo."));
  return native.pick();
}
export async function uploadAvatarPhoto(base64: string): Promise<string> {
  const identity = await recordDeviceOpen();
  const bytes = avatarBytes(base64);
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(API_URL + "/v2/avatars", {
      method: "POST",
      signal: controller.signal,
      headers: {
        ...accessHeaders(),
        Authorization: `Bearer ${identity.key}`,
        "Content-Type": "image/jpeg",
      },
      body: bytes,
    });
    const data = await response.json();
    if (data.access) await dispatchAccess(data.access);
    if (!response.ok)
      throw new ApiError(
        data.error ?? t("Could not save your photo. Please try again."),
        response.status,
      );
    if (!isAvatarPhoto(data.photo))
      throw new Error(t("Could not save your photo. Please try again."));
    return data.photo;
  } finally {
    clearTimeout(timer);
  }
}
