// Aggregates individually-attributed goals across a tournament's matches
// into a scorer leaderboard ("golden boot"). Goals recorded without a
// playerId (an unassigned/team goal) still count toward team scores
// elsewhere (standings.js) but are deliberately excluded here — there's no
// scorer to credit.
export function computeGoldenBoot(matches) {
  const tally = new Map(); // playerId -> { playerId, playerName, teamId, goals }

  for (const match of matches) {
    for (const goal of match.goals || []) {
      if (!goal.playerId) continue;
      const existing = tally.get(goal.playerId) || {
        playerId: goal.playerId,
        playerName: goal.playerName,
        teamId: goal.teamId,
        goals: 0,
      };
      existing.goals += 1;
      // Keep the most recently-seen name/team, in case a typo was fixed or
      // (rare, but possible with manual data entry) a player moved teams
      // mid-tournament.
      if (goal.playerName) existing.playerName = goal.playerName;
      if (goal.teamId) existing.teamId = goal.teamId;
      tally.set(goal.playerId, existing);
    }
  }

  return Array.from(tally.values()).sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    return (a.playerName || "").localeCompare(b.playerName || "");
  });
}
