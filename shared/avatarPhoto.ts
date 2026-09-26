/** Opaque server-owned photo identity; never accept an arbitrary image URL. */
export function isAvatarPhoto(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      value,
    )
  );
}
export const MAX_AVATAR_BYTES = 256 * 1024;
/** Native pickers return bounded standard base64; React Native lacks typed atob. */
export function avatarBytes(base64: string): Uint8Array {
  if (
    !base64.length ||
    base64.length % 4 ||
    base64.length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    throw new Error("Invalid photo data.");
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const bytes = new Uint8Array(
    (base64.length / 4) * 3 -
      (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0),
  );
  if (bytes.length > MAX_AVATAR_BYTES) throw new Error("Photo too large.");
  for (let i = 0, out = 0; i < base64.length; i += 4) {
    const bits =
      (alphabet.indexOf(base64[i]!) << 18) |
      (alphabet.indexOf(base64[i + 1]!) << 12) |
      (Math.max(0, alphabet.indexOf(base64[i + 2]!)) << 6) |
      Math.max(0, alphabet.indexOf(base64[i + 3]!));
    if (out < bytes.length) bytes[out++] = (bits >>> 16) & 255;
    if (out < bytes.length) bytes[out++] = (bits >>> 8) & 255;
    if (out < bytes.length) bytes[out++] = bits & 255;
  }
  return bytes;
}
