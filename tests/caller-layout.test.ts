import { describe, expect, it } from "vitest";
import { callerLayout } from "../src/callerLayout";
describe("fixed offline caller layout", () => {
  it.each([
    [320, 480],
    [375, 623],
    [390, 700],
    [430, 820],
    [576, 900],
  ])("fits every section and all 90 cells in %s × %s", (width, height) => {
    for (const audioError of [false, true]) {
      const l = callerLayout(width, height, audioError);
      expect(l.actionTop).toBeGreaterThanOrEqual(
        l.currentTop + l.currentHeight,
      );
      expect(l.boardTop).toBeGreaterThan(l.actionTop + 44);
      expect(l.boardTop + l.board + l.padding).toBeCloseTo(height);
      expect(l.boardLeft).toBeGreaterThanOrEqual(8);
      expect(l.boardLeft + l.boardWidth + l.padding).toBeCloseTo(width);
      expect(l.cellHeight * 9 + 4).toBeCloseTo(l.board);
      expect(l.numberFont).toBeGreaterThanOrEqual(10);
      expect(l.numberFont).toBeLessThan(l.cellHeight);
    }
  });
});
