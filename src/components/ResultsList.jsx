import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import MatchCard from "./MatchCard.jsx";
import { knockoutRoundLabel } from "../lib/roundLabels.js";

export default function ResultsList() {
  const { teams, teamsById, tournament, poolMatches, knockoutMatches, knockoutRounds } = useOutletContext();

  const poolIds = useMemo(() => [...new Set(teams.map((t) => t.poolId).filter(Boolean))].sort(), [teams]);

  const finishedPool = [...poolMatches].filter((m) => m.status === "final").reverse();
  const finishedKnockout = [...knockoutMatches].filter((m) => m.status === "final").reverse();

  if (finishedPool.length === 0 && finishedKnockout.length === 0) {
    return <div className="empty-state">No results yet — scores you enter will show up here.</div>;
  }

  return (
    <div className="stack">
      {finishedKnockout.length > 0 && (
        <div className="stack">
          <p className="section-title">Knockout stage</p>
          {finishedKnockout.map((m) => (
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
      {finishedPool.length > 0 && (
        <div className="stack">
          <p className="section-title">Pool stage</p>
          {finishedPool.map((m) => (
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
    </div>
  );
}
