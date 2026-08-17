import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import MatchCard from "./MatchCard.jsx";
import { knockoutRoundLabel } from "../lib/roundLabels.js";

export default function FixturesList() {
  const { tournament, teams, teamsById, poolMatches, knockoutMatches, knockoutRounds } = useOutletContext();
  const [poolFilter, setPoolFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const poolIds = useMemo(() => [...new Set(teams.map((t) => t.poolId).filter(Boolean))].sort(), [teams]);

  const matchesTeamFilter = (m) => teamFilter === "all" || m.teamAId === teamFilter || m.teamBId === teamFilter;

  const upcomingPoolMatches = poolMatches.filter(
    (m) => m.status !== "final" && (poolFilter === "all" || m.poolId === poolFilter) && matchesTeamFilter(m)
  );
  const upcomingKnockoutMatches = knockoutMatches.filter(
    (m) => m.status !== "final" && m.teamAId && m.teamBId && poolFilter === "all" && matchesTeamFilter(m)
  );

  const noFixturesYet = tournament.status === "setup";

  return (
    <div className="stack">
      {noFixturesYet ? (
        <div className="empty-state">Fixtures haven't been generated yet — finish the Setup tab first.</div>
      ) : (
        <>
          <div className="row">
            <select className="select" value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)}>
              <option value="all">All pools</option>
              {poolIds.map((poolId, i) => (
                <option key={poolId} value={poolId}>
                  Pool {String.fromCharCode(65 + i)}
                </option>
              ))}
            </select>
            <select className="select" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {upcomingPoolMatches.length === 0 && upcomingKnockoutMatches.length === 0 && (
            <div className="empty-state">No upcoming fixtures match this filter — check the Results tab.</div>
          )}

          {upcomingPoolMatches.length > 0 && (
            <div className="stack">
              <p className="section-title">Pool stage</p>
              {upcomingPoolMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  teamsById={teamsById}
                  tournamentId={tournament.id}
                  subtitle={`Pool ${String.fromCharCode(65 + poolIds.indexOf(m.poolId))} · Round ${m.round + 1}`}
                />
              ))}
            </div>
          )}

          {upcomingKnockoutMatches.length > 0 && (
            <div className="stack">
              <p className="section-title">Knockout stage</p>
              {upcomingKnockoutMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  teamsById={teamsById}
                  tournamentId={tournament.id}
                  subtitle={knockoutRoundLabel(m.round, knockoutRounds.length)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
