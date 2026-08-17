import { describe, expect, it } from "vitest";
import { computeStandings } from "./standings.js";

function match(teamAId, teamBId, scoreA, scoreB, status = "final") {
  return { teamAId, teamBId, scoreA, scoreB, status };
}

describe("computeStandings", () => {
  it("awards 3 points for a win, 1 for a draw, 0 for a loss", () => {
    const matches = [match("a", "b", 2, 0), match("a", "c", 1, 1)];
    const table = computeStandings(["a", "b", "c"], matches);
    const a = table.find((r) => r.teamId === "a");
    const b = table.find((r) => r.teamId === "b");
    const c = table.find((r) => r.teamId === "c");

    expect(a.points).toBe(4); // win + draw
    expect(a.won).toBe(1);
    expect(a.drawn).toBe(1);
    expect(b.points).toBe(0);
    expect(b.lost).toBe(1);
    expect(c.points).toBe(1);
    expect(c.drawn).toBe(1);
  });

  it("respects custom points rules", () => {
    const matches = [match("a", "b", 1, 1)];
    const table = computeStandings(["a", "b"], matches, { win: 3, draw: 1, loss: 0 });
    expect(table[0].points).toBe(1);
  });

  it("ignores matches that aren't final yet", () => {
    const matches = [match("a", "b", 5, 0, "live"), match("a", "b", 2, 2, "scheduled")];
    const table = computeStandings(["a", "b"], matches);
    expect(table.every((r) => r.played === 0)).toBe(true);
  });

  it("tracks goals for/against and goal difference", () => {
    const matches = [match("a", "b", 3, 1)];
    const table = computeStandings(["a", "b"], matches);
    const a = table.find((r) => r.teamId === "a");
    expect(a.goalsFor).toBe(3);
    expect(a.goalsAgainst).toBe(1);
    expect(a.goalDifference).toBe(2);
  });

  it("sorts by points, then goal difference, then goals for", () => {
    const matches = [
      match("a", "x", 5, 0), // a: 3pts, +5 GD
      match("b", "x", 1, 0), // b: 3pts, +1 GD
      match("c", "x", 0, 0), // c: 1pt
    ];
    const table = computeStandings(["a", "b", "c", "x"], matches);
    expect(table.map((r) => r.teamId).slice(0, 3)).toEqual(["a", "b", "c"]);
  });

  it("breaks a points/GD/GF tie using head-to-head result", () => {
    // a and b finish level on points (3), goal difference (0) and goals for
    // (1) — a beat b 1-0 head-to-head, so a should rank above b despite the
    // table otherwise being identical.
    const matches = [
      match("a", "b", 1, 0),
      match("a", "x", 0, 1),
      match("b", "y", 0, 1),
    ];
    const table = computeStandings(["a", "b", "x", "y"], matches);
    const aIndex = table.findIndex((r) => r.teamId === "a");
    const bIndex = table.findIndex((r) => r.teamId === "b");
    expect(aIndex).toBeLessThan(bIndex);
  });

  it("falls back to team id when nothing else breaks the tie", () => {
    const table = computeStandings(["zeta", "alpha"], []);
    expect(table.map((r) => r.teamId)).toEqual(["alpha", "zeta"]);
  });
});
