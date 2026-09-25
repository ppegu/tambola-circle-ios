import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncementPlayer } from '../src/announcementPlayer';
import { CALL_PAUSES } from '../shared/preferences';

function setup() {
  const clips: { id: number; end: () => void; fail: () => void; stop: ReturnType<typeof vi.fn> }[] = [];
  const error = vi.fn();
  const player = createAnnouncementPlayer((id, end, fail) => {
    const stop = vi.fn(); clips.push({ id, end, fail, stop }); return stop;
  }, error);
  return { player, clips, error };
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('announcement sequencing', () => {
  it.each(CALL_PAUSES)('waits exactly %s seconds AFTER the digits finish', pause => {
    const { player, clips } = setup();
    player.speak({ digits: 1, full: 2 }, pause);
    vi.advanceTimersByTime(4000); // A slow digit clip must finish first.
    expect(clips.map(c => c.id)).toEqual([1]);
    clips[0]!.end();
    expect(clips[0]!.stop).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(pause * 1000 - 1);
    expect(player.isSpeaking()).toBe(true); // Includes silence; auto cannot advance.
    expect(clips).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(clips.map(c => c.id)).toEqual([1, 2]);
    expect(player.isSpeaking()).toBe(true);
    clips[1]!.end();
    expect(player.isSpeaking()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels pending full numbers on pause, mute, settings change, or unmount', () => {
    const { player, clips } = setup();
    player.speak({ digits: 1, full: 2 }, 1);
    clips[0]!.end();
    vi.advanceTimersByTime(500);
    player.stop();
    vi.advanceTimersByTime(20000);
    expect(clips).toHaveLength(1);
    expect(player.isSpeaking()).toBe(false);
  });
  it('ignores duplicate and stale completion/error events when a new call replaces the old one', () => {
    const { player, clips, error } = setup();
    player.speak({ digits: 1, full: 2 }, 1);
    player.speak({ digits: 3, full: 4 }, 2);
    clips[0]!.end(); clips[0]!.fail();
    clips[1]!.end(); clips[1]!.end();
    vi.advanceTimersByTime(1999);
    expect(clips.map(c => c.id)).toEqual([1, 3]);
    vi.advanceTimersByTime(1);
    expect(clips.map(c => c.id)).toEqual([1, 3, 4]);
    clips[2]!.end();
    expect(error).not.toHaveBeenCalled();
    expect(player.isSpeaking()).toBe(false);
  });
  it('plays single digits once with no extra pause', () => {
    const { player, clips } = setup();
    player.speak({ full: 7 }, 1);
    clips[0]!.end();
    vi.advanceTimersByTime(10000);
    expect(clips.map(c => c.id)).toEqual([7]);
    expect(player.isSpeaking()).toBe(false);
  });
  it('recovers from playback failures and missing completion events', () => {
    const { player, clips, error } = setup();
    player.speak({ digits: 1, full: 2 }, 1);
    clips[0]!.fail();
    expect(player.isSpeaking()).toBe(false);
    player.speak({ digits: 3, full: 4 }, 1);
    vi.advanceTimersByTime(15000);
    expect(player.isSpeaking()).toBe(false);
    expect(clips.map(c => c.id)).toEqual([1, 3]);
    expect(error).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
