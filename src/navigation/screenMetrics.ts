import type { Metrics } from 'react-native-safe-area-context';

// Each RNN screen is a separate React root. Without a seed the safe-area
// provider renders no children until its native measurement arrives. Reuse a
// measured root of the same window width, then let native measurements refine it.
const measured = new Map<boolean, Metrics>();

export function rememberScreenMetrics(immersive: boolean, metrics: Metrics) {
  measured.set(immersive, metrics);
}

export function initialScreenMetrics(immersive: boolean, width: number): Metrics | undefined {
  const same = measured.get(immersive);
  if (same?.frame.width === width) return same;
  const other = measured.get(!immersive);
  if (immersive && other?.frame.width === width) {
    return { frame: other.frame, insets: { top: 0, right: 0, bottom: 0, left: 0 } };
  }
  return undefined;
}
