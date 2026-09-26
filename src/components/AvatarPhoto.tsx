import React, { useState } from "react";
import { Image } from "react-native";
import { isAvatarPhoto } from "../../shared/avatarPhoto";
import { API_URL } from "../api";
/** Bundled artwork remains underneath until the remote thumbnail is decoded. */
export function AvatarPhoto({
  photo,
  size,
}: {
  photo?: string | null;
  size: number;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!isAvatarPhoto(photo) || failed === photo) return null;
  return (
    <Image
      key={photo}
      accessible={false}
      source={{ uri: `${API_URL}/v2/avatars/${photo}.jpg` }}
      fadeDuration={0}
      resizeMode="cover"
      onError={() => setFailed(photo)}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    />
  );
}
