export const ALL_NUMBERS = Array.from({ length: 90 }, (_, i) => i + 1);

/** Inject a uniform integer source; picking from the remaining set never repeats. */
export function drawNumber(history: readonly number[], randomInt: (max: number) => number): number | null {
  const called = new Set(history);
  const remaining = ALL_NUMBERS.filter(n => !called.has(n));
  if (!remaining.length) return null;
  const index = randomInt(remaining.length);
  if (!Number.isInteger(index) || index < 0 || index >= remaining.length) throw new Error('Invalid random index');
  return remaining[index]!;
}

export function isHistory(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= 90 && new Set(value).size === value.length &&
    value.every(n => Number.isInteger(n) && n >= 1 && n <= 90);
}

/** Rejection sampling avoids the modulo bias of a random byte % remaining. */
export function uniformInt(max: number, getByte: () => number): number {
  if (!Number.isInteger(max) || max < 1 || max > 256) throw new Error('Invalid random range');
  const limit = 256 - (256 % max);
  let byte: number;
  do { byte = getByte(); } while (byte >= limit);
  return byte % max;
}
