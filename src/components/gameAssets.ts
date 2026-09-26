import { Image } from "react-native";

// Small, pre-cropped native resources. Keep requires static for Metro packaging.
export const avatarImages = [
  require("../../assets/game-v3/native/avatar-0.png"),
  require("../../assets/game-v3/native/avatar-1.png"),
  require("../../assets/game-v3/native/avatar-2.png"),
  require("../../assets/game-v3/native/avatar-3.png"),
  require("../../assets/game-v3/native/avatar-4.png"),
  require("../../assets/game-v3/native/avatar-5.png"),
  require("../../assets/game-v3/native/avatar-6.png"),
  require("../../assets/game-v3/native/avatar-7.png"),
  require("../../assets/game-v3/native/avatar-8.png"),
  require("../../assets/game-v3/native/avatar-9.png"),
  require("../../assets/game-v3/native/avatar-10.png"),
  require("../../assets/game-v3/native/avatar-11.png"),
  require("../../assets/game-v3/native/avatar-12.png"),
  require("../../assets/game-v3/native/avatar-13.png"),
  require("../../assets/game-v3/native/avatar-14.png"),
];
export const iconImages = [
  require("../../assets/game-v3/native/icon-0.png"),
  require("../../assets/game-v3/native/icon-1.png"),
  require("../../assets/game-v3/native/icon-2.png"),
  require("../../assets/game-v3/native/icon-3.png"),
  require("../../assets/game-v3/native/icon-4.png"),
  require("../../assets/game-v3/native/icon-5.png"),
  require("../../assets/game-v3/native/icon-6.png"),
  require("../../assets/game-v3/native/icon-7.png"),
  require("../../assets/game-v3/native/icon-8.png"),
];
export const coinImages = [
  require("../../assets/game-v3/native/coins-0.png"),
  require("../../assets/game-v3/native/coins-1.png"),
  require("../../assets/game-v3/native/coins-2.png"),
];
export const logoImage = require("../../assets/game-v3/native/logo.png");
export const heroImage = require("../../assets/game-v3/native/hero.png");
export const hubBannerImage = require("../../assets/game-v3/native/hub-banner.png");
let warming: Promise<unknown> | undefined;
export function warmGameArtwork() {
  // Release assets are local; Metro serves development assets over HTTP.
  // Warm small recurring images without delaying navigation on a network request.
  return (warming ??= Promise.allSettled(
    [
      ...avatarImages,
      ...iconImages,
      ...coinImages,
      logoImage,
      heroImage,
      hubBannerImage,
    ].map((asset) => {
      const uri = Image.resolveAssetSource(asset)?.uri;
      return uri ? Image.prefetch(uri) : Promise.resolve(false);
    }),
  ));
}
