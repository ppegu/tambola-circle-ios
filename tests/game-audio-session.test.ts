import { describe, expect, it, vi } from "vitest";
import { createAudioSessionController } from "../src/audioSessionController";
const audio = { setAudioActive: vi.fn(async (_: boolean) => {}) };
const setGameAudioActive = createAudioSessionController(audio);
describe("game audio session ownership", () => {
  it("serializes leaving/re-entering a game", async () => {
    audio.setAudioActive.mockClear();
    await Promise.all([
      setGameAudioActive(true),
      setGameAudioActive(false),
      setGameAudioActive(true),
    ]);
    expect(audio.setAudioActive.mock.calls.map((call) => call[0])).toEqual([
      true,
      false,
      true,
    ]);
    await setGameAudioActive(false);
  });
  it("can reactivate after a native audio-session failure", async () => {
    audio.setAudioActive.mockRejectedValueOnce(new Error("interrupted"));
    await expect(setGameAudioActive(true)).rejects.toThrow("interrupted");
    await expect(setGameAudioActive(true)).resolves.toBeUndefined();
    await setGameAudioActive(false);
  });
});
