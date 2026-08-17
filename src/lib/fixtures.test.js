import { describe, expect, it } from "vitest";
import { generateRoundRobinRounds, generatePoolFixtures } from "./fixtures.js";

describe("generateRoundRobinRounds", () => {
  it("pairs every team with every other team exactly once (even count)", () => {
    const rounds = generateRoundRobinRounds(["a", "b", "c", "d"]);
    const matches = rounds.flat();
    expect(matches.length).toBe(6); // C(4,2)

    const pairs = new Set(matches.map((m) => [m.teamAId, m.teamBId].sort().join("-")));
    expect(pairs.size).toBe(6);
    expect(pairs.has("a-b")).toBe(true);
    expect(pairs.has("c-d")).toBe(true);
  });

  it("never repeats a team within the same round", () => {
    const rounds = generateRoundRobinRounds(["a", "b", "c", "d", "e", "f"]);
    for (const round of rounds) {
      const teamsInRound = round.flatMap((m) => [m.teamAId, m.teamBId]);
      expect(new Set(teamsInRound).size).toBe(teamsInRound.length);
    }
  });

  it("handles an odd number of teams with a bye, still covering every pair", () => {
    const rounds = generateRoundRobinRounds(["a", "b", "c", "d", "e"]);
    const matches = rounds.flat();
    expect(matches.length).toBe(10); // C(5,2)
    const pairs = new Set(matches.map((m) => [m.teamAId, m.teamBId].sort().join("-")));
    expect(pairs.size).toBe(10);
  });

  it("returns nothing for fewer than 2 teams", () => {
    expect(generateRoundRobinRounds(["a"])).toEqual([]);
    expect(generateRoundRobinRounds([])).toEqual([]);
  });
});

describe("generatePoolFixtures", () => {
  it("generates a full round-robin per pool with unique ids and sequential order", () => {
    const pools = [
      { poolId: "A", teamIds: ["a1", "a2", "a3"] },
      { poolId: "B", teamIds: ["b1", "b2"] },
    ];
    const fixtures = generatePoolFixtures(pools);

    expect(fixtures.length).toBe(3 + 1); // C(3,2) + C(2,1)
    expect(new Set(fixtures.map((f) => f.id)).size).toBe(fixtures.length);
    expect(fixtures.map((f) => f.order)).toEqual([...fixtures.keys()]);
    expect(fixtures.every((f) => f.status === "scheduled")).toBe(true);
    expect(fixtures.every((f) => f.goals.length === 0)).toBe(true);
  });

  it("interleaves rounds across pools rather than finishing one pool first", () => {
    const pools = [
      { poolId: "A", teamIds: ["a1", "a2", "a3", "a4"] },
      { poolId: "B", teamIds: ["b1", "b2", "b3", "b4"] },
    ];
    const fixtures = generatePoolFixtures(pools);
    // Pool A's round-0 matches should appear before pool B's round-1 matches.
    const lastPoolARound0Order = Math.max(
      ...fixtures.filter((f) => f.poolId === "A" && f.round === 0).map((f) => f.order)
    );
    const firstPoolBRound1Order = Math.min(
      ...fixtures.filter((f) => f.poolId === "B" && f.round === 1).map((f) => f.order)
    );
    expect(lastPoolARound0Order).toBeLessThan(firstPoolBRound1Order);
  });
});
