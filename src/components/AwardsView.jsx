import { useOutletContext } from "react-router-dom";
import { Award } from "lucide-react";

export default function AwardsView() {
  const { teamsById, goldenBoot } = useOutletContext();

  if (goldenBoot.length === 0) {
    return <div className="empty-state">No goals recorded with a scorer yet — attribute a goal from the score entry screen to see the leaderboard.</div>;
  }

  const topScore = goldenBoot[0].goals;

  return (
    <div className="stack">
      <p className="section-title">Golden boot</p>
      <div className="stack" style={{ gap: 8 }}>
        {goldenBoot.map((row) => (
          <div key={row.playerId} className="card row-between" style={{ padding: "10px 14px" }}>
            <div className="row" style={{ gap: 10 }}>
              {row.goals === topScore && <Award size={18} color="var(--amber-dark)" />}
              <div>
                <div style={{ fontWeight: 700 }}>{row.playerName || "Unnamed player"}</div>
                <div className="text-soft text-sm">{teamsById[row.teamId]?.name || ""}</div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{row.goals}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
