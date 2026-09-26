import { describe, expect, it } from "vitest";
import {
  initialScreenMetrics,
  rememberScreenMetrics,
} from "../src/navigation/screenMetrics";

describe("native screen safe-area handoff", () => {
  it("reuses measured insets for a new root without carrying them across window widths", () => {
    const metrics = {
      frame: { x: 0, y: 0, width: 360, height: 780 },
      insets: { top: 28, bottom: 24, left: 0, right: 0 },
    };
    rememberScreenMetrics(false, metrics);
    expect(initialScreenMetrics(false, 360)).toEqual(metrics);
    expect(initialScreenMetrics(false, 800)).toBeUndefined();
  });
  it("seeds immersive roots without status/navigation padding and preserves normal metrics", () => {
    rememberScreenMetrics(false, {
      frame: { x: 0, y: 0, width: 390, height: 820 },
      insets: { top: 28, bottom: 24, left: 0, right: 0 },
    });
    expect(initialScreenMetrics(true, 390)?.insets).toEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
    const live = {
      frame: { x: 0, y: 0, width: 390, height: 868 },
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    };
    rememberScreenMetrics(true, live);
    expect(initialScreenMetrics(true, 390)).toEqual(live);
    expect(initialScreenMetrics(false, 390)?.insets.top).toBe(28);
  });
});
