import { generateId } from "./id.js";

// Standard round-robin ("circle method") pairing within a single pool: every
// team plays every other team exactly once. Returns matches tagged with a
// `round` number such that no team appears twice within the same round —
// useful for scheduling, since pools usually play simultaneously on
// different pitches and "round 1 everywhere, then round 2 everywhere" is
// how a tournament day actually runs.
//
// An odd number of teams gets a bye worked into the rotation (a team sits
// out for exactly one round each) so the round structure still holds; the
// bye itself is never returned as a match.
export function generateRoundRobinRounds(teamIds) {
  if (teamIds.length < 2) return [];
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null); // bye placeholder

  const n = teams.length;
  const rounds = [];
  let arr = [...teams];
  for (let round = 0; round < n - 1; round++) {
    const roundMatches = [];
    for (let i = 0; i < n / 2; i++) {
      const teamA = arr[i];
      const teamB = arr[n - 1 - i];
      if (teamA !== null && teamB !== null) {
        roundMatches.push({ teamAId: teamA, teamBId: teamB, round });
      }
    }
    rounds.push(roundMatches);
    // Rotate everything except the fixed first element — the standard
    // circle-method step that produces a new, previously-unseen pairing
    // each round.
    arr = [arr[0], arr[arr.length - 1], ...arr.slice(1, -1)];
  }
  return rounds;
}

// Builds the full pool-stage fixture list across every pool, interleaved by
// round (round 1 of every pool, then round 2 of every pool, ...) so the
// generated schedule matches how a tournament day actually plays out across
// several pitches at once.
export function generatePoolFixtures(pools) {
  // pools: [{ poolId, teamIds }]
  const perPool = pools.map((pool) => ({
    poolId: pool.poolId,
    rounds: generateRoundRobinRounds(pool.teamIds),
  }));
  const maxRounds = Math.max(0, ...perPool.map((p) => p.rounds.length));

  const fixtures = [];
  let order = 0;
  for (let round = 0; round < maxRounds; round++) {
    for (const pool of perPool) {
      const roundMatches = pool.rounds[round] || [];
      for (const match of roundMatches) {
        fixtures.push({
          id: generateId(),
          stage: "pool",
          poolId: pool.poolId,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          round,
          order: order++,
          status: "scheduled",
          // 0, not null — score fields use Firestore's atomic increment() for
          // concurrency-safe "+1" taps from multiple devices (see
          // adjustScore in tournaments.js), which needs a numeric starting
          // value to increment from.
          scoreA: 0,
          scoreB: 0,
          goals: [],
        });
      }
    }
  }
  return fixtures;
}
