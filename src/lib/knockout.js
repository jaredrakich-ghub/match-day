import { generateId } from "./id.js";

// Builds the ordered list of qualifying "slots" a knockout bracket needs,
// before any pool has actually finished — e.g. for 2 pools advancing top 2:
// [PoolA#1, PoolB#1, PoolA#2, PoolB#2]. Grouped by rank first (all the pool
// winners, then all the runners-up, ...) so pool winners face weaker
// opposition early, the same convention used in most youth cup draws.
export function buildQualifierSlots(pools, advancePerPool) {
  const slots = [];
  for (let rank = 1; rank <= advancePerPool; rank++) {
    for (const pool of pools) {
      slots.push({ poolId: pool.poolId, rank });
    }
  }
  return slots;
}

// Standard recursive tournament-seeding order: for a bracket of size n
// (a power of two), returns the seed numbers (1-indexed, 1 = strongest) in
// bracket-slot order, e.g. seedOrder(4) -> [1, 4, 2, 3] meaning match 1 is
// seed 1 v seed 4, match 2 is seed 2 v seed 3. This is what keeps the top
// two seeds apart until the final.
function seedOrder(n) {
  let seeds = [1];
  while (seeds.length < n) {
    const size = seeds.length * 2;
    const next = [];
    for (const s of seeds) {
      next.push(s, size + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Best-effort pass to stop two qualifiers from the same pool meeting in the
// bracket's first round, by swapping one side of a clashing pair with a
// same-position slot from a later, non-clashing pair. Not a hard guarantee —
// with very few pools (e.g. only one pool advancing 4+ teams) a same-pool
// meeting can be mathematically unavoidable, and this simply leaves those in
// place.
function avoidSamePoolFirstRound(slots) {
  const result = [...slots];
  for (let i = 0; i < result.length; i += 2) {
    const a = result[i];
    const b = result[i + 1];
    if (a?.type !== "team" || b?.type !== "team" || a.source.poolId !== b.source.poolId) continue;
    for (let j = i + 2; j < result.length; j += 2) {
      const c = result[j];
      const d = result[j + 1];
      if (c?.type === "team" && c.source.poolId !== a.source.poolId) {
        [result[i + 1], result[j]] = [result[j], result[i + 1]];
        break;
      }
      if (d?.type === "team" && d.source.poolId !== a.source.poolId) {
        [result[i + 1], result[j + 1]] = [result[j + 1], result[i + 1]];
        break;
      }
    }
  }
  return result;
}

// Builds the full single-elimination bracket structure from a qualifier
// slot list (see buildQualifierSlots). Each match records *where* its two
// teams come from (`teamASource`/`teamBSource`) rather than a resolved team
// id, so the bracket can be generated and displayed (as "Winner of Pool A",
// "Runner-up Pool B", "Winner of QF1", ...) before pool play or earlier
// rounds have actually finished. A qualifier count that isn't a power of
// two gets byes for the top seeds, resolved immediately (a bye never
// becomes a playable match — its recipient advances straight into the next
// round).
export function buildBracketTemplate(qualifierSlots) {
  const n = qualifierSlots.length;
  if (n < 2) return { rounds: [] };

  const bracketSize = nextPowerOfTwo(n);
  const order = seedOrder(bracketSize);
  let slots = order.map((seed) =>
    seed <= n ? { type: "team", source: { type: "poolRank", ...qualifierSlots[seed - 1] } } : { type: "bye" }
  );
  slots = avoidSamePoolFirstRound(slots);

  const rounds = [];
  let current = slots;
  let roundIndex = 0;
  while (current.length > 1) {
    const matches = [];
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      const left = current[i];
      const right = current[i + 1];
      if (left.type === "bye" && right.type === "bye") {
        next.push({ type: "bye" });
      } else if (left.type === "bye") {
        next.push(right);
      } else if (right.type === "bye") {
        next.push(left);
      } else {
        const matchId = generateId();
        matches.push({ id: matchId, round: roundIndex, slot: matches.length, teamASource: left.source, teamBSource: right.source });
        next.push({ type: "team", source: { type: "winnerOf", matchId } });
      }
    }
    if (matches.length > 0) {
      rounds.push(matches);
      roundIndex += 1;
    }
    current = next;
  }
  return { rounds };
}

function resolveSource(source, standingsByPool, resultsByMatchId) {
  if (!source) return null;
  if (source.type === "poolRank") {
    const rows = standingsByPool[source.poolId] || [];
    return rows[source.rank - 1]?.teamId ?? null;
  }
  if (source.type === "winnerOf") {
    return resultsByMatchId[source.matchId] ?? null;
  }
  if (source.type === "team") return source.teamId;
  return null;
}

// Fills in the actual teamAId/teamBId for a single stored match, given the
// current pool standings and any knockout results known so far. A match
// whose teams aren't decided yet resolves to `null` — the UI shows that as
// "TBD" / "Winner of ...". Works on any match with teamASource/teamBSource
// fields, whether it came straight out of buildBracketTemplate or back out
// of Firestore as a flat list — resolution only ever looks at that one
// match's sources, not its position in a round.
export function resolveMatchTeams(match, { standingsByPool = {}, resultsByMatchId = {} } = {}) {
  return {
    ...match,
    teamAId: resolveSource(match.teamASource, standingsByPool, resultsByMatchId),
    teamBId: resolveSource(match.teamBSource, standingsByPool, resultsByMatchId),
  };
}

// Same as resolveMatchTeams, applied across a whole bracket template's
// nested round structure (the shape buildBracketTemplate returns).
export function resolveBracket(bracketTemplate, context = {}) {
  return {
    rounds: bracketTemplate.rounds.map((round) => round.map((match) => resolveMatchTeams(match, context))),
  };
}

// The winning team of a completed knockout match. Knockout matches can't
// end level, so a match that finished as a draw on the scoreboard needs an
// explicit `manualWinnerTeamId` (e.g. after a penalty shootout the app
// doesn't simulate) before it counts as decided.
export function matchWinner(match) {
  if (match.status !== "final") return null;
  if (match.manualWinnerTeamId) return match.manualWinnerTeamId;
  if (match.scoreA > match.scoreB) return match.teamAId;
  if (match.scoreB > match.scoreA) return match.teamBId;
  return null;
}

// Builds `resultsByMatchId` for resolveBracket from a flat list of knockout
// matches that have already been played (or partially played).
export function buildResultsByMatchId(knockoutMatches) {
  const results = {};
  for (const match of knockoutMatches) {
    const winner = matchWinner(match);
    if (winner) results[match.id] = winner;
  }
  return results;
}
