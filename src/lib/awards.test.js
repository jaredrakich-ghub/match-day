import { describe, expect, it } from "vitest";
import { computeGoldenBoot } from "./awards.js";

function goal(playerId, playerName, teamId) {
  return { playerId, playerName, teamId };
}

describe("computeGoldenBoot", () => {
  it("tallies goals per player across matches", () => {
    const matches = [
      { goals: [goal("p1", "Alex", "teamA"), goal("p1", "Alex", "teamA")] },
      { goals: [goal("p2", "Sam", "teamB")] },
    ];
    const table = computeGoldenBoot(matches);
    expect(table[0]).toMatchObject({ playerId: "p1", goals: 2 });
    expect(table[1]).toMatchObject({ playerId: "p2", goals: 1 });
  });

  it("sorts by goals descending even when the higher scorer's name is alphabetically later", () => {
    const matches = [
      { goals: [goal("p1", "Zoe", "teamA"), goal("p1", "Zoe", "teamA")] },
      { goals: [goal("p2", "Amy", "teamB")] },
    ];
    const table = computeGoldenBoot(matches);
    expect(table.map((r) => r.playerId)).toEqual(["p1", "p2"]);
  });

  it("breaks a goals tie alphabetically by name", () => {
    const matches = [{ goals: [goal("p1", "Zoe", "teamA"), goal("p2", "Amy", "teamB")] }];
    const table = computeGoldenBoot(matches);
    expect(table.map((r) => r.playerName)).toEqual(["Amy", "Zoe"]);
  });

  it("excludes unassigned (team) goals with no playerId", () => {
    const matches = [{ goals: [{ playerId: null, teamId: "teamA" }, goal("p1", "Alex", "teamA")] }];
    const table = computeGoldenBoot(matches);
    expect(table.length).toBe(1);
    expect(table[0].playerId).toBe("p1");
  });

  it("returns an empty list when there are no matches or goals", () => {
    expect(computeGoldenBoot([])).toEqual([]);
    expect(computeGoldenBoot([{ goals: [] }])).toEqual([]);
  });
});
