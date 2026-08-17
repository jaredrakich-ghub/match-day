import { describe, expect, it } from "vitest";
import { assignPools, suggestNumPools, swapPoolTeams } from "./pools.js";

describe("suggestNumPools", () => {
  it("keeps small tournaments as a single pool", () => {
    expect(suggestNumPools(4)).toBe(1);
    expect(suggestNumPools(5)).toBe(1);
  });

  it("prefers an exact fit of 3-5 teams per pool", () => {
    expect(suggestNumPools(8)).toBe(2); // 2x4
    expect(suggestNumPools(9)).toBe(3); // 3x3
    expect(suggestNumPools(12)).toBe(3); // 3x4
    expect(suggestNumPools(16)).toBe(4); // 4x4
  });

  it("falls back to the closest-to-4 average when there's no exact fit", () => {
    expect(suggestNumPools(7)).toBe(2); // 3.5 avg, closer to 4 than a single pool of 7
  });
});

describe("assignPools", () => {
  it("distributes teams evenly, spreading remainders across the first pools", () => {
    const teams = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const pools = assignPools(teams, 3);
    expect(pools.map((p) => p.length)).toEqual([4, 3, 3]);
  });

  it("includes every team exactly once", () => {
    const teams = Array.from({ length: 11 }, (_, i) => `t${i}`);
    const pools = assignPools(teams, 4);
    const flat = pools.flat();
    expect(flat.length).toBe(teams.length);
    expect(new Set(flat).size).toBe(teams.length);
  });

  it("throws for an invalid pool count", () => {
    expect(() => assignPools(["a"], 0)).toThrow();
  });
});

describe("swapPoolTeams", () => {
  it("swaps two teams between pools", () => {
    const pools = [
      ["a", "b"],
      ["c", "d"],
    ];
    const result = swapPoolTeams(pools, "a", "c");
    expect(result[0]).toEqual(["c", "b"]);
    expect(result[1]).toEqual(["a", "d"]);
  });

  it("does not mutate the input", () => {
    const pools = [["a", "b"], ["c", "d"]];
    swapPoolTeams(pools, "a", "c");
    expect(pools[0]).toEqual(["a", "b"]);
  });

  it("is a no-op when either team can't be found", () => {
    const pools = [["a", "b"], ["c", "d"]];
    const result = swapPoolTeams(pools, "a", "zzz");
    expect(result).toEqual(pools);
  });
});
