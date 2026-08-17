// Splits teams into pools and suggests a sensible pool count. Deliberately
// has no opinion on *which* teams end up together beyond even distribution —
// the caller decides the input order (e.g. shuffle first for random
// assignment), which keeps this function deterministic and easy to test.

// Suggests a pool count for a given number of teams, aiming for pools of
// 3-5 teams — small enough that a single round-robin fits in a tournament
// day, large enough that a pool table means something. Prefers an exact fit
// within that range; falls back to whichever pool count keeps average pool
// size closest to 4.
export function suggestNumPools(numTeams) {
  if (numTeams <= 5) return 1;
  for (let size = 5; size >= 3; size--) {
    if (numTeams % size === 0) return numTeams / size;
  }
  let best = 1;
  let bestDiff = Infinity;
  for (let n = 2; n <= Math.ceil(numTeams / 3); n++) {
    const diff = Math.abs(numTeams / n - 4);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = n;
    }
  }
  return best;
}

// Distributes team ids across `numPools` pools as evenly as possible (pool
// sizes differ by at most 1). Round-robin dealing (team i goes to pool
// i % numPools) rather than chunking front-to-back, so any "extra" teams
// spread across the first pools instead of all landing in one oversized
// pool.
export function assignPools(teamIds, numPools) {
  if (numPools < 1) throw new Error("numPools must be at least 1");
  const pools = Array.from({ length: numPools }, () => []);
  teamIds.forEach((teamId, i) => {
    pools[i % numPools].push(teamId);
  });
  return pools;
}

// Swaps two teams between pools (or moves a team into another pool, if
// toTeamId is omitted) — the manual-override escape hatch for when the
// auto-assignment isn't what the organizer wants (e.g. keeping two
// same-school teams apart). Returns a new pools array; does not mutate the
// input.
export function swapPoolTeams(pools, fromTeamId, toTeamId) {
  const next = pools.map((pool) => [...pool]);
  const fromPoolIndex = next.findIndex((pool) => pool.includes(fromTeamId));
  const toPoolIndex = next.findIndex((pool) => pool.includes(toTeamId));
  if (fromPoolIndex === -1 || toPoolIndex === -1 || fromPoolIndex === toPoolIndex) {
    return next;
  }
  const fromIndex = next[fromPoolIndex].indexOf(fromTeamId);
  const toIndex = next[toPoolIndex].indexOf(toTeamId);
  next[fromPoolIndex][fromIndex] = toTeamId;
  next[toPoolIndex][toIndex] = fromTeamId;
  return next;
}
