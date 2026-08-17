import { Link } from "react-router-dom";

function statusBadge(status) {
  if (status === "final") return <span className="badge badge-final">Final</span>;
  if (status === "live") return <span className="badge badge-live">Live</span>;
  return <span className="badge badge-scheduled">Upcoming</span>;
}

export default function MatchCard({ match, teamsById, tournamentId, subtitle }) {
  const teamAName = teamsById[match.teamAId]?.name || "TBD";
  const teamBName = teamsById[match.teamBId]?.name || "TBD";
  const scored = match.status !== "scheduled";
  const playable = match.teamAId && match.teamBId;

  const content = (
    <>
      <div className="match-card-teams">
        <span>{teamAName}</span>
        {scored ? (
          <span className="match-card-score">
            {match.scoreA} – {match.scoreB}
          </span>
        ) : (
          <span className="text-soft text-sm">vs</span>
        )}
        <span style={{ textAlign: "right" }}>{teamBName}</span>
      </div>
      <div className="match-card-meta">
        <span>{subtitle}</span>
        {statusBadge(match.status)}
      </div>
    </>
  );

  if (!playable) {
    return <div className="match-card" style={{ opacity: 0.6, cursor: "default" }}>{content}</div>;
  }

  return (
    <Link to={`/t/${tournamentId}/match/${match.id}`} className="match-card">
      {content}
    </Link>
  );
}
