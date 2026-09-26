/** Fixed caller controls; the 90-number board receives every remaining pixel. */
export function callerLayout(
  width: number,
  height: number,
  audioError = false,
) {
  const padding = Math.max(8, Math.min(14, width * 0.028));
  const speedTop = padding + 62,
    currentTop = speedTop + 49;
  const currentHeight = Math.max(82, Math.min(140, height * 0.19));
  const actionTop = currentTop + currentHeight + 2;
  const boardTop = actionTop + 44 + 34 + (audioError ? 28 : 0);
  const boardWidth = width - padding * 2,
    board = Math.max(90, height - boardTop - padding);
  const cellHeight = (board - 4) / 9;
  return {
    scale: Math.min(width / 576, height / 860),
    padding,
    speedTop,
    currentTop,
    currentHeight,
    actionTop,
    boardTop,
    boardWidth,
    board,
    boardLeft: padding,
    cellHeight,
    numberFont: Math.max(
      10,
      Math.min(24, ((boardWidth - 4) / 10) * 0.53, cellHeight * 0.58),
    ),
  };
}
