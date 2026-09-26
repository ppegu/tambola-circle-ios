export type PendingMark = { id: string; marked: boolean; confirmed?: boolean };
export type PanelMarks = Readonly<Record<string, PendingMark>>;
const EMPTY: PanelMarks = Object.freeze({});

/** Only the touched panel subscribes to optimistic edits; app navigation never does. */
export class PendingMarks {
  readonly store = createStore(
    subscribeWithSelector(() => ({}) as Record<number, PanelMarks>),
  );
  get = (panel: number): PanelMarks => this.store.getState()[panel] ?? EMPTY;
  subscribe(panel: number, listener: () => void) {
    return this.store.subscribe((state) => state[panel] ?? EMPTY, listener);
  }
  set(panel: number, cell: number, mark: PendingMark) {
    this.store.setState({ [panel]: { ...this.get(panel), [cell]: mark } });
  }
  confirm(panel: number, cell: number, id: string) {
    const mark = this.get(panel)[cell];
    if (mark?.id === id) this.set(panel, cell, { ...mark, confirmed: true });
  }
  settle(panel: number, cell: number, id: string) {
    if (this.get(panel)[cell]?.id !== id) return;
    const next = { ...this.get(panel) };
    delete next[cell];
    this.store.setState({ [panel]: Object.keys(next).length ? next : EMPTY });
  }
  clear() {
    this.store.setState({}, true);
  }
}
import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from "zustand/middleware";
