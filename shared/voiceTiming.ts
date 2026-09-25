import durations from './voiceTiming.json';

/** Preserve clear speech even when a host selects the shortest call interval. */
export function numberCallDelayMs(number: number, intervalSeconds: number): number {
  const duration = (durations as Record<string, number>)[String(number)] ?? 0;
  return Math.max(intervalSeconds * 1000, duration + 250);
}
