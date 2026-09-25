import { describe, expect, it } from 'vitest';
import { callParts } from '../shared/callPhrase';

describe('digit then whole-number calls', () => {
  it.each([[23, 'two three', 'twenty three'], [10, 'one zero', 'ten'], [11, 'one one', 'eleven'], [70, 'seven zero', 'seventy'], [90, 'nine zero', 'ninety'],
    [7, null, 'single number seven'], [9, null, 'single number nine'], [1, null, 'single number one']])('speaks %i in the requested order', (n, digits, full) => {
      expect(callParts(n as number)).toEqual({ digits, full });
    });
  it('rejects numbers outside the board', () => {
    for (const n of [0, 91, -1, 1.5]) expect(() => callParts(n)).toThrow();
  });
});
