import { isAvatarPhoto, MAX_AVATAR_BYTES } from "../../shared/avatarPhoto";
import { RoomError } from "./room-engine";

// Validate the encoded dimensions before storing; reject EXIF/location metadata.
export function validateAvatarJpeg(bytes: Uint8Array): void {
  const fail = () => {
    throw new RoomError(400, "Choose a valid photo.");
  };
  if (
    bytes.length < 20 ||
    bytes.length > MAX_AVATAR_BYTES ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    fail();
  let dimensions = false,
    scan = false;
  for (let i = 2; i + 3 < bytes.length;) {
    if (bytes[i++] !== 255) fail();
    while (bytes[i] === 255) i++;
    const marker = bytes[i++]!;
    if (marker === 0xda) {
      scan = true;
      break;
    }
    const length = bytes[i]! * 256 + bytes[i + 1]!;
    if (length < 2 || i + length > bytes.length || marker === 0xe1) fail();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) fail();
      const height = bytes[i + 3]! * 256 + bytes[i + 4]!,
        width = bytes[i + 5]! * 256 + bytes[i + 6]!;
      if (width < 1 || height < 1 || width > 512 || height > 512) fail();
      dimensions = true;
    }
    i += length;
  }
  if (!dimensions || !scan) fail();
}
export async function assertAvatarOwner(
  env: Env,
  value: unknown,
  owner: string,
): Promise<void> {
  if (value === null || value === undefined) return;
  if (
    !isAvatarPhoto(value) ||
    !(await env.DB.prepare(
      "SELECT id FROM online_avatars WHERE id=? AND device_hash=?",
    )
      .bind(value, owner)
      .first())
  )
    throw new RoomError(400, "Choose a photo from your gallery.");
}
export async function uploadAvatar(
  request: Request,
  env: Env,
  deviceHash: string,
) {
  if (request.headers.get("Content-Type") !== "image/jpeg")
    throw new RoomError(415, "Choose a JPEG photo.");
  const reader = request.body?.getReader();
  if (!reader) throw new RoomError(400, "Choose a photo.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > MAX_AVATAR_BYTES) {
        await reader.cancel();
        throw new RoomError(
          413,
          "This photo is too large. Choose another photo.",
        );
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  validateAvatarJpeg(bytes);
  const id = crypto.randomUUID();
  await env.AVATARS.put(id + ".jpg", bytes, {
    httpMetadata: {
      contentType: "image/jpeg",
      cacheControl: "public, max-age=31536000, immutable",
    },
  });
  try {
    await env.DB.prepare(
      "INSERT INTO online_avatars(id,device_hash,created_at) VALUES(?,?,?)",
    )
      .bind(id, deviceHash, Date.now())
      .run();
  } catch (error) {
    await env.AVATARS.delete(id + ".jpg");
    throw error;
  }
  return Response.json({ photo: id }, { status: 201 });
}
export async function avatarImage(env: Env, id: string) {
  if (!isAvatarPhoto(id)) throw new RoomError(404, "Photo unavailable.");
  const object = await env.AVATARS.get(id + ".jpg");
  if (!object) throw new RoomError(404, "Photo unavailable.");
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
