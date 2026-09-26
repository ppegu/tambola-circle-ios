import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  avatarBytes,
  isAvatarPhoto,
  MAX_AVATAR_BYTES,
} from "../shared/avatarPhoto";
import { isInviteMobile } from "../shared/invitations";
import { validateAvatarJpeg } from "../server/src/avatar-photos";

describe("photo and invite boundaries", () => {
  it("decodes native base64 without atob for all padding sizes and rejects oversized or malformed data", () => {
    for (const length of [1, 2, 3, 4, 128, MAX_AVATAR_BYTES]) {
      const source = randomBytes(length);
      expect(Buffer.from(avatarBytes(source.toString("base64")))).toEqual(
        source,
      );
    }
    for (const value of [
      "",
      "a",
      "AAAA===",
      "http://x",
      "ab c",
      randomBytes(MAX_AVATAR_BYTES + 1).toString("base64"),
    ])
      expect(() => avatarBytes(value)).toThrow();
  });
  it("accepts only opaque photo IDs and complete ten-digit matches", () => {
    expect(isAvatarPhoto("581d9a89-1f69-4b49-b0f3-7d56d9c3c319")).toBe(true);
    for (const value of ["https://evil/image.jpg", "../secrets", null, "x"])
      expect(isAvatarPhoto(value)).toBe(false);
    expect(isInviteMobile("9876543210")).toBe(true);
    for (const value of [
      "98765",
      "98765432100",
      "+919876543210",
      "%123456789",
      "123 456789",
      null,
    ])
      expect(isInviteMobile(value)).toBe(false);
  });
  it("rejects executable content, EXIF, oversized dimensions, truncated JPEG and excessive uploads", () => {
    // SOI, a small SOF marker, SOS and EOI. Decoder integration uses real JPEGs.
    const jpeg = new Uint8Array([
      255, 216, 255, 192, 0, 17, 8, 2, 0, 2, 0, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0,
      255, 218, 0, 2, 255, 217,
    ]);
    expect(() => validateAvatarJpeg(jpeg)).not.toThrow();
    const big = jpeg.slice();
    big[7] = 3;
    const exif = new Uint8Array([
      ...jpeg.slice(0, 2),
      255,
      225,
      0,
      4,
      0,
      0,
      ...jpeg.slice(2),
    ]);
    for (const value of [
      new TextEncoder().encode("<svg onload=alert(1)>"),
      big,
      exif,
      jpeg.slice(0, -2),
      new Uint8Array(MAX_AVATAR_BYTES + 1),
    ])
      expect(() => validateAvatarJpeg(value)).toThrow();
  });
});
