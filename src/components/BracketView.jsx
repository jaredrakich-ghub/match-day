import { useMemo } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { knockoutRoundLabel } from "../lib/roundLabels.js";
import { matchWinner } from "../lib/knockout.js";

function placeholderLabel(source, poolIds) {
  if (!source) return "TBD";
  if (source.type === "poolRank") {
    const index = poolIds.indexOf(source.poolId);
    const poolLetter = index >= 0 ? String.fromCharCode(65 + index) : "?";
    return `${source.rank === 1 ? "Winner" : `#${source.rank}`} Pool ${poolLetter}`;
  }
  return "Winner of previous match";
}

function BracketSlot({ teamId, teamsById, source, poolIds, isWinner }) {
  if (!teamId) {
    return <div className="bracket-slot tbd">{placeholderLabel(source, poolIds)}</div>;
  }
  return <div className={`bracket-slot${isWinner ? " winner" : ""}`}>{teamsById[teamId]?.name || "Unknown"}</div>;
}

export default function BracketView() {
  const { tournament, teams, teamsById, knockoutRounds } = useOutletContext();

  const poolIds = useMemo(() => [...new Set(teams.map((t) => t.poolId).filter(Boolean))].sort(), [teams]);

  if (tournament.status === "setup") {
    return <div className="empty-state">Generate fixtures from the Setup tab first.</div>;
  }
  if (knockoutRounds.length === 0) {
    return <div className="empty-state">This tournament has no knockout stage — the pool table decides the winner.</div>;
  }

  return (
    <div className="bracket">
      {knockoutRounds.map((round, roundIndex) => (
        <div key={roundIndex} className="bracket-round">
          <p className="bracket-round-title">{knockoutRoundLabel(roundIndex, knockoutRounds.length)}</p>
          {round.map((match) => {
            const winner = matchWinner(match);
            const playable = match.teamAId && match.teamBId;
            const body = (
              <div className="bracket-match">
                <BracketSlot teamId={match.teamAId} teamsById={teamsById} source={match.teamASource} poolIds={poolIds} isWinner={winner === match.teamAId} />
                <BracketSlot teamId={match.teamBId} teamsById={teamsById} source={match.teamBSource} poolIds={poolIds} isWinner={winner === match.teamBId} />
              </div>
            );
            return playable ? (
              <Link key={match.id} to={`/t/${tournament.id}/match/${match.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {body}
                {match.status === "final" && (
                  <p className="text-soft text-sm" style={{ textAlign: "center", margin: "4px 0 0" }}>
                    {match.scoreA} – {match.scoreB}
                    {match.manualWinnerTeamId ? " (pens)" : ""}
                  </p>
                )}
              </Link>
            ) : (
              <div key={match.id}>{body}</div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
