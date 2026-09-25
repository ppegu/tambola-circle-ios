import { describe, expect, it } from 'vitest';
import { drawNumber, isHistory, uniformInt, ALL_NUMBERS } from '../src/game';
import { isPreferences, DEFAULT_PREFERENCES } from '../shared/preferences';

describe('number caller', () => {
  it('draws all ninety numbers exactly once and then finishes', () => {
    const history: number[] = [];
    for (let i = 0; i < 90; i++) history.push(drawNumber(history, max => (i * 13) % max)!);
    expect([...history].sort((a, b) => a - b)).toEqual(ALL_NUMBERS);
    expect(drawNumber(history, () => { throw new Error('must not draw'); })).toBeNull();
  });
  it('can reach both ends of the board and the last remaining number', () => {
    expect(drawNumber([], () => 0)).toBe(1);
    expect(drawNumber([], n => n - 1)).toBe(90);
    expect(drawNumber(ALL_NUMBERS.filter(n => n !== 43), () => 0)).toBe(43);
  });
  it('rejects biased random bytes before selecting a number', () => {
    const bytes = [255, 180, 179];
    expect(uniformInt(90, () => bytes.shift()!)).toBe(89);
  });
  it('rejects corrupted saved games', () => {
    for (const value of [[1, 1], [0], [91], [1.5], ['1'], null, {}]) expect(isHistory(value)).toBe(false);
    expect(isHistory([69, 23, 43])).toBe(true);
    expect(isHistory([])).toBe(true);
  });
  it('strictly validates cloud preferences', () => {
    expect(isPreferences(DEFAULT_PREFERENCES)).toBe(true);
    expect(isPreferences({ ...DEFAULT_PREFERENCES, voice: 'female' })).toBe(true);
    expect(isPreferences({ ...DEFAULT_PREFERENCES, voice: 'unknown' })).toBe(false);
    expect(DEFAULT_PREFERENCES.callPause).toBe(1);
    for (const callPause of [0.5, 1, 1.5, 2]) expect(isPreferences({ ...DEFAULT_PREFERENCES, callPause })).toBe(true);
    for (const callPause of [-1, 0, 0.75, 3, '1', null]) expect(isPreferences({ ...DEFAULT_PREFERENCES, callPause })).toBe(false);
    for (const value of [{ auto: true, speed: 0, sound: true }, { ...DEFAULT_PREFERENCES, admin: true },
      { ...DEFAULT_PREFERENCES, sound: 'yes' }, null]) expect(isPreferences(value)).toBe(false);
  });
});
