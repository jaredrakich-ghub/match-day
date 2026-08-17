// Computes a points table from a set of teams and their matches. Only
// matches with status "final" count — scheduled or still-live matches don't
// affect the table yet, so it always reflects results that are actually in.
export function computeStandings(teamIds, matches, pointsRules = { win: 3, draw: 1, loss: 0 }) {
  const table = new Map(
    teamIds.map((teamId) => [
      teamId,
      { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    ])
  );

  for (const match of matches) {
    if (match.status !== "final") continue;
    if (!table.has(match.teamAId) || !table.has(match.teamBId)) continue;
    const a = table.get(match.teamAId);
    const b = table.get(match.teamBId);
    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;

    a.played += 1;
    b.played += 1;
    a.goalsFor += scoreA;
    a.goalsAgainst += scoreB;
    b.goalsFor += scoreB;
    b.goalsAgainst += scoreA;

    if (scoreA > scoreB) {
      a.won += 1;
      a.points += pointsRules.win;
      b.lost += 1;
      b.points += pointsRules.loss;
    } else if (scoreB > scoreA) {
      b.won += 1;
      b.points += pointsRules.win;
      a.lost += 1;
      a.points += pointsRules.loss;
    } else {
      a.drawn += 1;
      b.drawn += 1;
      a.points += pointsRules.draw;
      b.points += pointsRules.draw;
    }
  }

  const rows = Array.from(table.values()).map((row) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
  }));

  return sortStandings(rows, matches);
}

// Tiebreak order: points, then goal difference, then goals for, then the
// head-to-head result between exactly the two tied teams (if they played
// each other), then team id — a final, arbitrary-but-stable tiebreak so the
// table never silently reshuffles two genuinely-tied teams between renders.
export function sortStandings(rows, matches = []) {
  return [...rows].sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.goalDifference !== x.goalDifference) return y.goalDifference - x.goalDifference;
    if (y.goalsFor !== x.goalsFor) return y.goalsFor - x.goalsFor;
    const h2h = headToHeadResult(x.teamId, y.teamId, matches);
    if (h2h !== 0) return h2h;
    return String(x.teamId).localeCompare(String(y.teamId));
  });
}

// Returns negative if teamXId ranks above teamYId (X won their meeting),
// positive if Y ranks above X, or 0 if they haven't played a final match
// against each other (or it was a draw — draws don't break the tie).
function headToHeadResult(teamXId, teamYId, matches) {
  const match = matches.find(
    (m) =>
      m.status === "final" &&
      ((m.teamAId === teamXId && m.teamBId === teamYId) || (m.teamAId === teamYId && m.teamBId === teamXId))
  );
  if (!match) return 0;
  const xIsA = match.teamAId === teamXId;
  const xScore = xIsA ? match.scoreA : match.scoreB;
  const yScore = xIsA ? match.scoreB : match.scoreA;
  if (xScore === yScore) return 0;
  return xScore > yScore ? -1 : 1;
}
