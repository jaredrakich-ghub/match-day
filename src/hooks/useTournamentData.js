import { useEffect, useMemo, useState } from "react";
import { subscribeTournament, subscribeTeams, subscribeMatches } from "../lib/tournaments.js";
import { computeStandings } from "../lib/standings.js";
import { resolveMatchTeams, buildResultsByMatchId } from "../lib/knockout.js";
import { computeGoldenBoot } from "../lib/awards.js";

// Stable reference (module-level, not recreated per render) so it's safe as
// a useMemo dependency below — `tournament?.pointsRules || DEFAULT_POINTS`
// would otherwise be a fresh object every render whenever pointsRules
// itself is missing, defeating the memoization entirely.
const DEFAULT_POINTS_RULES = { win: 3, draw: 1, loss: 0 };

// Subscribes to a tournament's live data and derives every view the app
// needs from it (standings, golden boot, resolved knockout matchups) —
// centralized here so every screen sees the same numbers instead of each
// re-implementing its own slice of the same computation.
export function useTournamentData(tournamentId) {
  const [tournament, setTournament] = useState(undefined); // undefined = loading, null = not found
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    if (!tournamentId) return undefined;
    setTournament(undefined);
    const unsubTournament = subscribeTournament(tournamentId, setTournament);
    const unsubTeams = subscribeTeams(tournamentId, setTeams);
    const unsubMatches = subscribeMatches(tournamentId, setMatches);
    return () => {
      unsubTournament();
      unsubTeams();
      unsubMatches();
    };
  }, [tournamentId]);

  const teamsById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams]);

  const pools = useMemo(() => {
    const poolIds = [...new Set(teams.map((t) => t.poolId).filter(Boolean))].sort();
    return poolIds.map((poolId) => ({
      poolId,
      teamIds: teams.filter((t) => t.poolId === poolId).map((t) => t.id),
    }));
  }, [teams]);

  const poolMatches = useMemo(() => matches.filter((m) => m.stage === "pool").sort((a, b) => a.order - b.order), [matches]);
  const knockoutMatchesRaw = useMemo(
    () => matches.filter((m) => m.stage === "knockout").sort((a, b) => a.order - b.order),
    [matches]
  );

  const pointsRules = tournament?.pointsRules || DEFAULT_POINTS_RULES;

  const standingsByPool = useMemo(() => {
    const result = {};
    for (const pool of pools) {
      result[pool.poolId] = computeStandings(
        pool.teamIds,
        poolMatches.filter((m) => m.poolId === pool.poolId),
        pointsRules
      );
    }
    return result;
  }, [pools, poolMatches, pointsRules]);

  const resultsByMatchId = useMemo(() => buildResultsByMatchId(knockoutMatchesRaw), [knockoutMatchesRaw]);

  // A pool's standings shouldn't feed the bracket until the pool is
  // actually finished — computeStandings always returns a fully-ranked
  // table even at 0 games played (ties broken alphabetically by team id),
  // so without this a knockout match would resolve to "Lions v Tigers" the
  // instant fixtures are generated, before a single pool match is played.
  // standingsByPool itself stays live/partial for the Pools tab (that's the
  // point of showing it during the pool stage); this is a bracket-only view
  // of it.
  const standingsByPoolForBracket = useMemo(() => {
    const result = {};
    for (const pool of pools) {
      const finished = poolMatches.some((m) => m.poolId === pool.poolId) && poolMatches.filter((m) => m.poolId === pool.poolId).every((m) => m.status === "final");
      if (finished) result[pool.poolId] = standingsByPool[pool.poolId];
    }
    return result;
  }, [pools, poolMatches, standingsByPool]);

  // Knockout matches with teamAId/teamBId filled in — either frozen on the
  // doc already (see updateMatch in tournaments.js) or, for matches not yet
  // scored, resolved live once their pool(s) are finished/earlier rounds
  // are decided.
  const knockoutMatches = useMemo(
    () =>
      knockoutMatchesRaw.map((match) =>
        match.teamAId && match.teamBId
          ? match
          : resolveMatchTeams(match, { standingsByPool: standingsByPoolForBracket, resultsByMatchId })
      ),
    [knockoutMatchesRaw, standingsByPoolForBracket, resultsByMatchId]
  );

  const knockoutRounds = useMemo(() => {
    const rounds = [];
    for (const match of knockoutMatches) {
      rounds[match.round] = rounds[match.round] || [];
      rounds[match.round][match.slot] = match;
    }
    return rounds.map((round) => round.filter(Boolean));
  }, [knockoutMatches]);

  const goldenBoot = useMemo(() => computeGoldenBoot(matches), [matches]);

  return {
    loading: tournament === undefined,
    notFound: tournament === null,
    tournament,
    teams,
    teamsById,
    pools,
    poolMatches,
    knockoutMatches,
    knockoutRounds,
    standingsByPool,
    goldenBoot,
    pointsRules,
  };
}
