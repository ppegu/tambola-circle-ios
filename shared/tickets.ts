export type Panel = (number | null)[][];
export type StripKind = "half" | "full";
export type RandomInt = (max: number) => number;

// The default RNG runs in the Worker. Native clients receive server-generated tickets.
declare const crypto: { getRandomValues<T extends Uint32Array>(array: T): T };
export const secureInt: RandomInt = (max) => {
  if (!Number.isInteger(max) || max < 1)
    throw new Error("Invalid random range");
  const limit = Math.floor(0x100000000 / max) * max;
  const bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0]! >= limit);
  return bytes[0]! % max;
};
export function shuffled<T>(values: readonly T[], random: RandomInt): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/** Allocate a complete 90-number strip, then arrange five numbers in each row. */
export function generateStrip(
  kind: StripKind,
  random: RandomInt = secureInt,
): Panel[] {
  let counts: number[][] = [];
  for (let attempt = 0; attempt < 1000; attempt++) {
    counts = Array.from({ length: 6 }, () => Array<number>(9).fill(1));
    const remaining = Array<number>(6).fill(6);
    let valid = true;
    for (const col of shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8], random)) {
      const extra = col === 0 ? 3 : col === 8 ? 5 : 4;
      for (let n = 0; n < extra; n++) {
        const candidates = remaining
          .map((v, i) => i)
          .filter((i) => remaining[i]! > 0 && counts[i]![col]! < 3);
        if (!candidates.length) {
          valid = false;
          break;
        }
        const index = candidates[random(candidates.length)]!;
        counts[index]![col]!++;
        remaining[index]!--;
      }
      if (!valid) break;
    }
    if (valid && remaining.every((n) => n === 0)) break;
    if (attempt === 999) throw new Error("Could not allocate ticket strip");
  }
  const panels: Panel[] = counts.map((count) => {
    const panel: Panel = Array.from({ length: 3 }, () =>
      Array<number | null>(9).fill(null),
    );
    const capacity = [5, 5, 5];
    const cols = shuffled([0, 1, 2, 3, 4, 5, 6, 7, 8], random).sort(
      (a, b) => count[b]! - count[a]!,
    );
    const fill = (index: number): boolean => {
      if (index === 9) return capacity.every((n) => n === 0);
      const col = cols[index]!,
        size = count[col]!;
      const options =
        size === 3
          ? [[0, 1, 2]]
          : size === 2
            ? [
                [0, 1],
                [0, 2],
                [1, 2],
              ]
            : [[0], [1], [2]];
      for (const rows of shuffled(options, random)) {
        if (rows.some((row) => capacity[row] === 0)) continue;
        for (const row of rows) {
          capacity[row]!--;
          panel[row]![col] = 0;
        }
        if (fill(index + 1)) return true;
        for (const row of rows) {
          capacity[row]!++;
          panel[row]![col] = null;
        }
      }
      return false;
    };
    if (!fill(0)) throw new Error("Could not arrange ticket rows");
    return panel;
  });
  for (let col = 0; col < 9; col++) {
    const low = col === 0 ? 1 : col * 10,
      length = col === 0 ? 9 : col === 8 ? 11 : 10;
    const pool = shuffled(
      Array.from({ length }, (_, i) => low + i),
      random,
    );
    for (const panel of panels) {
      const rows = [0, 1, 2].filter((row) => panel[row]![col] !== null);
      const numbers = pool.splice(0, rows.length).sort((a, b) => a - b);
      rows.forEach((row, index) => {
        panel[row]![col] = numbers[index]!;
      });
    }
  }
  return shuffled(panels, random).slice(0, kind === "half" ? 3 : 6);
}
