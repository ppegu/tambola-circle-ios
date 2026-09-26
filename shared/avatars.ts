// Stable IDs: the original six portraits followed by nine new portraits.
export const AVATAR_COUNT = 15;
export function isAvatarId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < AVATAR_COUNT
  );
}
export const AVATAR_LABELS = [
  "Pink sari",
  "Blue polo",
  "Green blouse and glasses",
  "Golden sari",
  "Yellow shirt and glasses",
  "Teal shirt and moustache",
  "Navy turban",
  "Blue blouse and curls",
  "Red hoodie",
  "Teal kurta and glasses",
  "Lavender scarf",
  "Yellow shirt and ponytail",
  "Purple polo",
  "Coral blouse",
  "Green kurta",
] as const;
