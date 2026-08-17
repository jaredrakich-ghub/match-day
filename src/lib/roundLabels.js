const ROUND_NAMES = ["Final", "Semi-final", "Quarter-final"];

// Human label for a knockout round, counting backwards from the final (the
// last round) — "Round 3 of 4" means nothing to a parent on the sideline,
// "Semi-final" does. Falls back to "Round N" for earlier rounds in a bigger
// bracket than these names cover.
export function knockoutRoundLabel(round, totalRounds) {
  const fromEnd = totalRounds - 1 - round;
  return ROUND_NAMES[fromEnd] || `Round ${round + 1}`;
}
