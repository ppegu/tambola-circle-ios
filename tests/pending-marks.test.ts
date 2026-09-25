import { describe, expect, it, vi } from 'vitest';
import { PendingMarks } from '../src/online/pendingMarks';

describe('optimistic ticket marks', () => {
  it('notifies only the affected ticket, preserving other snapshot identities', () => {
    const marks = new PendingMarks(), first = vi.fn(), second = vi.fn();
    marks.subscribe(0, first); marks.subscribe(1, second);
    const unchanged = marks.get(1);
    marks.set(0, 12, { id: 'a', marked: true });
    expect(first).toHaveBeenCalledOnce(); expect(second).not.toHaveBeenCalled();
    expect(marks.get(1)).toBe(unchanged);
  });
  it('never erases a later rapid toggle when an earlier request settles', () => {
    const marks = new PendingMarks();
    marks.set(0, 12, { id: 'first', marked: true });
    marks.set(0, 12, { id: 'second', marked: false });
    marks.settle(0, 12, 'first');
    expect(marks.get(0)[12]).toEqual({ id: 'second', marked: false });
    marks.settle(0, 12, 'second'); expect(marks.get(0)).toEqual({});
  });
  it('retains acknowledged colour until the server snapshot has rendered', () => {
    const marks = new PendingMarks();
    marks.set(0, 3, { id: 'one', marked: true }); marks.confirm(0, 3, 'one');
    expect(marks.get(0)[3]).toEqual({ id: 'one', marked: true, confirmed: true });
    marks.set(0, 3, { id: 'two', marked: false }); marks.confirm(0, 3, 'one');
    expect(marks.get(0)[3]).toEqual({ id: 'two', marked: false });
  });
  it('clears edits between rounds without stale completions affecting new edits', () => {
    const marks = new PendingMarks(), changed = vi.fn();
    const unsubscribe = marks.subscribe(1, changed);
    marks.set(1, 26, { id: 'old', marked: true }); marks.clear();
    expect(marks.get(1)).toEqual({});
    marks.set(1, 26, { id: 'new', marked: true }); marks.settle(1, 26, 'old');
    expect(marks.get(1)[26]?.id).toBe('new');
    unsubscribe(); changed.mockClear(); marks.clear(); expect(changed).not.toHaveBeenCalled();
  });
});
