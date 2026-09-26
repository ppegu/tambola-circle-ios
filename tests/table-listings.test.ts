import { describe, expect, it } from "vitest";
import {
  listingMembers,
  pastGame,
  pastGameDetails,
} from "../server/src/table-listings";
import { createRoom, joinRoom } from "../server/src/room-engine";
import { DEFAULT_TABLE_CONFIG, type OnlineProfile } from "../shared/online";

const player = (id: string): OnlineProfile => ({
  id,
  name: `Player ${id}`,
  mobile: "+15550001001",
  mobileSource: "device_selected",
  verificationStatus: "unverified",
});
function room() {
  let state = createRoom(
    "table",
    "A family circle",
    "123456",
    "private-invite",
    player("host"),
    DEFAULT_TABLE_CONFIG,
    1,
  ).state;
  for (const id of ["a", "b", "c", "d", "e"])
    state = joinRoom(state, player(id), 1).state;
  return state;
}

describe("table list read model", () => {
  it("keeps table artwork in lists and archived games with a fallback for old tables", () => {
    const s = room();
    delete s.tableAvatarId;
    expect(listingMembers(s).tableAvatarId).toBe(0);
    s.tableAvatarId = 18;
    expect(listingMembers(s).tableAvatarId).toBe(18);
    expect(pastGame(s).tableAvatarId).toBe(18);
  });
  it("counts current lobby members while limiting the avatar preview", () => {
    const s = room();
    s.members.b!.left = true;
    s.members.c!.removed = true;
    const data = listingMembers(s);
    expect(data.playerCount).toBe(4);
    expect(data.players.map((p) => p.id)).toEqual(["host", "a", "d", "e"]);
    expect(JSON.stringify(data)).not.toContain("mobile");
  });
  it("keeps the round roster for live and past games, excluding watching hosts", () => {
    const s = room();
    s.phase = "live";
    s.roster = ["a", "b"];
    s.members.b!.left = true;
    expect(listingMembers(s).playerCount).toBe(2);
    s.phase = "finished";
    s.result = { winner: "a", reason: "full_house_verified", at: 1000 };
    expect(pastGame(s)).toMatchObject({
      round: 1,
      completed: true,
      winnerName: "Player a",
      endedAt: 1000,
      playerCount: 2,
    });
  });
  it("returns only played tickets and does not expose contact or invite details", () => {
    const s = room();
    s.phase = "finished";
    s.roster = ["a"];
    s.calls = [23, 45];
    s.result = { winner: null, reason: "ended_by_host", at: 1000 };
    s.members.a!.marks = { "0:1": true };
    const data = pastGameDetails(s);
    expect(data.calls).toEqual([23, 45]);
    expect(data.game.completed).toBe(false);
    expect(data.tickets).toHaveLength(1);
    expect(data.tickets[0]!.marks).toEqual({ "0:1": true });
    expect(JSON.stringify(data)).not.toContain("+1555");
    expect(JSON.stringify(data)).not.toContain("private-invite");
    expect(JSON.stringify(data)).not.toContain("onlineUntil");
  });
});
