import { useStore } from "zustand";
import React, { useCallback, useLayoutEffect, useRef } from "react";
import type { Panel } from "../../shared/tickets";
import { TicketPanel } from "./components";
import type { PendingMarks } from "./pendingMarks";

export function LiveTicket({
  panel,
  index,
  count,
  marks,
  pending,
  onMark,
  onWin,
}: {
  panel: Panel;
  index: number;
  count: number;
  marks: Record<string, boolean>;
  pending: PendingMarks;
  onMark?: (panel: number, cell: number) => void;
  onWin?: () => void;
}) {
  const edits = useStore(pending.store, () => pending.get(index));
  // Retain the optimistic colour until React has committed the server snapshot.
  // Network completion alone must not flash the old mark for a frame.
  useLayoutEffect(() => {
    for (const [cell, edit] of Object.entries(edits)) {
      if (edit.confirmed && !!marks[`${index}:${cell}`] === edit.marked)
        pending.settle(index, Number(cell), edit.id);
    }
  }, [edits, marks, pending, index]);
  const actions = useRef({ onMark, onWin });
  actions.current = { onMark, onWin };
  const mark = useCallback(
    (cell: number) => actions.current.onMark?.(index, cell),
    [index],
  );
  const win = useCallback(() => actions.current.onWin?.(), []);
  const merged = { ...marks };
  for (const [cell, edit] of Object.entries(edits))
    merged[`${index}:${cell}`] = edit.marked;
  return (
    <TicketPanel
      compact
      panel={panel}
      index={index}
      count={count}
      marks={merged}
      saved={!Object.values(edits).some((edit) => !edit.confirmed)}
      onMark={onMark ? mark : undefined}
      onWin={onWin ? win : undefined}
    />
  );
}
