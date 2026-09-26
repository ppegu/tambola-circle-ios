import { expect, it } from "vitest";
import { roundStatus } from "../src/online/roundStatus";

it("distinguishes unplayed, live, cancelled, interrupted and won rounds", () => {
  expect(roundStatus("lobby", 0).title).toBe("Not started");
  expect(roundStatus("live", 12).title).toBe("Round in progress");
  expect(roundStatus("claim", 67).title).toBe("Checking full house");
  expect(roundStatus("finished", 0, "host_ended").title).toBe(
    "Cancelled by captain",
  );
  expect(roundStatus("finished", 12, "host_ended").title).toBe(
    "Ended by captain",
  );
  expect(roundStatus("finished", 0, "not_enough_ready_players").title).toBe(
    "Round cancelled",
  );
  expect(roundStatus("finished", 70, "verification_error").title).toBe(
    "Round interrupted",
  );
  expect(roundStatus("finished", 90, "numbers_exhausted").title).toBe(
    "No winner",
  );
  expect(roundStatus("finished", 88, "auto_verified", "Asha")).toMatchObject({
    title: "Asha won!",
    detail: "Full house verified",
  });
});
