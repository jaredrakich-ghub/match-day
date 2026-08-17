import { useOutletContext } from "react-router-dom";
import StandingsTable from "./StandingsTable.jsx";
import MatchCard from "./MatchCard.jsx";

export default function PoolsView() {
  const { tournament, teamsById, pools, poolMatches, standingsByPool } = useOutletContext();

  if (tournament.status === "setup") {
    return <div className="empty-state">Pools haven't been generated yet — finish the Setup tab first.</div>;
  }

  return (
    <div className="stack">
      {pools.map((pool, i) => (
        <div key={pool.poolId} className="card stack">
          <p className="section-title" style={{ margin: 0 }}>
            Pool {String.fromCharCode(65 + i)}
          </p>
          <StandingsTable rows={standingsByPool[pool.poolId] || []} teamsById={teamsById} />
          <div className="stack" style={{ gap: 8 }}>
            {poolMatches
              .filter((m) => m.poolId === pool.poolId)
              .map((m) => (
                <MatchCard key={m.id} match={m} teamsById={teamsById} tournamentId={tournament.id} subtitle={`Round ${m.round + 1}`} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
