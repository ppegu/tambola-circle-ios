import CircleDevice from "../../modules/circle-device";

export function getRandomBytes(size: number): Uint8Array {
  if (!Number.isInteger(size) || size < 0 || size > 1024)
    throw new RangeError("Invalid random byte count");
  const hex = CircleDevice.randomHex(size);
  if (hex.length !== size * 2 || !/^[a-f0-9]*$/.test(hex))
    throw new Error("Secure random source failed");
  return Uint8Array.from({ length: size }, (_, i) =>
    parseInt(hex.slice(i * 2, i * 2 + 2), 16),
  );
}
export const randomUUID = (): string => CircleDevice.randomUUID();
