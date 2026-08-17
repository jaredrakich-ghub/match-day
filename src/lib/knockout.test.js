import { describe, expect, it } from "vitest";
import {
  buildQualifierSlots,
  buildBracketTemplate,
  resolveBracket,
  matchWinner,
  buildResultsByMatchId,
} from "./knockout.js";

describe("buildQualifierSlots", () => {
  it("groups by rank first, then pool order", () => {
    const pools = [{ poolId: "A" }, { poolId: "B" }];
    const slots = buildQualifierSlots(pools, 2);
    expect(slots).toEqual([
      { poolId: "A", rank: 1 },
      { poolId: "B", rank: 1 },
      { poolId: "A", rank: 2 },
      { poolId: "B", rank: 2 },
    ]);
  });
});

describe("buildBracketTemplate", () => {
  it("builds a single final match for 2 qualifiers", () => {
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }], 1);
    const bracket = buildBracketTemplate(slots);
    expect(bracket.rounds.length).toBe(1);
    expect(bracket.rounds[0].length).toBe(1);
  });

  it("builds semis + final for 4 qualifiers, with no round left unplayed", () => {
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }], 2);
    const bracket = buildBracketTemplate(slots);
    expect(bracket.rounds.map((r) => r.length)).toEqual([2, 1]);
  });

  it("resolves byes automatically for a non-power-of-two qualifier count", () => {
    // 3 qualifiers -> bracket size 4 -> one bye. Only 1 real match in round 0,
    // then the final in round 1 (the bye recipient waits for round 1).
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }, { poolId: "C" }], 1);
    const bracket = buildBracketTemplate(slots);
    expect(bracket.rounds.map((r) => r.length)).toEqual([1, 1]);
  });

  it("every team-sourced match slot references a distinct pool/rank exactly once", () => {
    const pools = [{ poolId: "A" }, { poolId: "B" }, { poolId: "C" }, { poolId: "D" }];
    const slots = buildQualifierSlots(pools, 1);
    const bracket = buildBracketTemplate(slots);
    const round0Sources = bracket.rounds[0].flatMap((m) => [m.teamASource, m.teamBSource]);
    const poolIds = round0Sources.map((s) => s.poolId).sort();
    expect(poolIds).toEqual(["A", "B", "C", "D"]);
  });

  it("avoids same-pool meetings in round 0 where mathematically possible", () => {
    const pools = [{ poolId: "A" }, { poolId: "B" }];
    const slots = buildQualifierSlots(pools, 2); // A1,B1,A2,B2 -> 4 qualifiers, 2 pools
    const bracket = buildBracketTemplate(slots);
    for (const match of bracket.rounds[0]) {
      expect(match.teamASource.poolId).not.toBe(match.teamBSource.poolId);
    }
  });

  it("returns no rounds for fewer than 2 qualifiers", () => {
    expect(buildBracketTemplate([{ poolId: "A", rank: 1 }]).rounds).toEqual([]);
  });
});

describe("resolveBracket", () => {
  it("resolves poolRank sources from standings and winnerOf sources from results", () => {
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }], 1);
    const bracket = buildBracketTemplate(slots); // single final match
    const standingsByPool = {
      A: [{ teamId: "teamA1" }],
      B: [{ teamId: "teamB1" }],
    };
    const resolved = resolveBracket(bracket, { standingsByPool });
    expect(resolved.rounds[0][0].teamAId).toBe("teamA1");
    expect(resolved.rounds[0][0].teamBId).toBe("teamB1");
  });

  it("resolves to null (TBD) when standings aren't known yet", () => {
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }], 1);
    const bracket = buildBracketTemplate(slots);
    const resolved = resolveBracket(bracket, { standingsByPool: {} });
    expect(resolved.rounds[0][0].teamAId).toBeNull();
  });

  it("propagates a winner into the next round via winnerOf", () => {
    const slots = buildQualifierSlots([{ poolId: "A" }, { poolId: "B" }], 2);
    const bracket = buildBracketTemplate(slots); // 2 semis + 1 final
    const semi1 = bracket.rounds[0][0];
    const resultsByMatchId = { [semi1.id]: "winnerTeam" };
    const resolved = resolveBracket(bracket, { resultsByMatchId });
    const final = resolved.rounds[1][0];
    expect([final.teamAId, final.teamBId]).toContain("winnerTeam");
  });
});

describe("matchWinner", () => {
  it("returns the higher-scoring team for a decisive final match", () => {
    const match = { status: "final", teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 1 };
    expect(matchWinner(match)).toBe("a");
  });

  it("returns null for a match that isn't final yet", () => {
    expect(matchWinner({ status: "live", teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 1 })).toBeNull();
  });

  it("returns null for a level knockout match with no manual winner recorded", () => {
    const match = { status: "final", teamAId: "a", teamBId: "b", scoreA: 1, scoreB: 1 };
    expect(matchWinner(match)).toBeNull();
  });

  it("prefers manualWinnerTeamId (e.g. a penalty shootout) over the scoreboard", () => {
    const match = { status: "final", teamAId: "a", teamBId: "b", scoreA: 1, scoreB: 1, manualWinnerTeamId: "b" };
    expect(matchWinner(match)).toBe("b");
  });
});

describe("buildResultsByMatchId", () => {
  it("only includes matches with a decided winner", () => {
    const matches = [
      { id: "m1", status: "final", teamAId: "a", teamBId: "b", scoreA: 2, scoreB: 0 },
      { id: "m2", status: "scheduled", teamAId: "c", teamBId: "d", scoreA: null, scoreB: null },
    ];
    expect(buildResultsByMatchId(matches)).toEqual({ m1: "a" });
  });
});
