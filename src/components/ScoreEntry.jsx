import { useMemo, useState } from "react";
import { useOutletContext, useParams, Link } from "react-router-dom";
import { ChevronLeft, Plus, X, Play, CheckCircle2, RotateCcw } from "lucide-react";
import { recordGoal, undoGoal, updateMatch } from "../lib/tournaments.js";
import { knockoutRoundLabel } from "../lib/roundLabels.js";

function GoalPicker({ team, onPick, onClose }) {
  return (
    <div className="card stack" style={{ padding: 10, background: "#f6f7fb" }}>
      <div className="row-between">
        <p className="text-sm" style={{ fontWeight: 700, margin: 0 }}>
          Who scored for {team?.name}?
        </p>
        <button className="btn btn-icon" onClick={onClose} aria-label="Cancel">
          <X size={16} />
        </button>
      </div>
      <div className="chip-row">
        {(team?.players || []).map((player) => (
          <button key={player.id} className="chip" style={{ border: "none", cursor: "pointer" }} onClick={() => onPick(player)}>
            {player.number ? `#${player.number} ` : ""}
            {player.name}
          </button>
        ))}
        <button className="chip" style={{ border: "none", cursor: "pointer" }} onClick={() => onPick(null)}>
          No scorer recorded
        </button>
      </div>
      {(team?.players || []).length === 0 && (
        <p className="text-soft text-sm" style={{ margin: 0 }}>
          No players added for this team yet — add them from the Teams tab, or just record the goal.
        </p>
      )}
    </div>
  );
}

function TeamScoreColumn({ side, team, score, goals, onAddGoal, onUndoGoal }) {
  const [picking, setPicking] = useState(false);
  const teamGoals = goals.filter((g) => g.teamId === team?.id);

  return (
    <div className="stack" style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontWeight: 700, margin: 0, textAlign: "center" }}>{team?.name || "TBD"}</p>
      <p style={{ fontSize: 40, fontWeight: 800, margin: 0, textAlign: "center", color: "var(--navy)" }}>{score}</p>

      {!picking ? (
        <button className="btn btn-accent btn-block" onClick={() => setPicking(true)} disabled={!team}>
          <Plus size={16} /> Goal
        </button>
      ) : (
        <GoalPicker
          team={team}
          onClose={() => setPicking(false)}
          onPick={(player) => {
            onAddGoal(side, { teamId: team.id, playerId: player?.id || null, playerName: player?.name || null });
            setPicking(false);
          }}
        />
      )}

      {teamGoals.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          {teamGoals.map((goal, i) => (
            <div key={i} className="row-between text-sm">
              <span>⚽ {goal.playerName || "Unassigned"}</span>
              <button
                className="btn btn-icon btn-sm"
                aria-label="Remove this goal"
                onClick={() => onUndoGoal(side, goal)}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScoreEntry() {
  const { tournament, teamsById, poolMatches, knockoutMatches, knockoutRounds } = useOutletContext();
  const { matchId } = useParams();
  const [pendingWinner, setPendingWinner] = useState(null);
  const [error, setError] = useState(null);

  const match = useMemo(
    () => poolMatches.find((m) => m.id === matchId) || knockoutMatches.find((m) => m.id === matchId),
    [poolMatches, knockoutMatches, matchId]
  );

  if (!match) {
    return (
      <div className="stack">
        <Link to="../fixtures" className="row text-soft text-sm" style={{ textDecoration: "none" }}>
          <ChevronLeft size={16} /> Back to fixtures
        </Link>
        <div className="empty-state">Couldn't find that match.</div>
      </div>
    );
  }

  const teamA = teamsById[match.teamAId];
  const teamB = teamsById[match.teamBId];
  const isDraw = match.scoreA === match.scoreB;
  const needsWinnerPick = match.stage === "knockout" && isDraw;

  async function handleAddGoal(side, goal) {
    setError(null);
    try {
      await recordGoal(tournament.id, match.id, side, goal);
    } catch {
      setError("Couldn't save that goal — check your connection and try again.");
    }
  }

  async function handleUndoGoal(side, goal) {
    setError(null);
    try {
      await undoGoal(tournament.id, match.id, side, goal);
    } catch {
      setError("Couldn't undo that goal — check your connection and try again.");
    }
  }

  async function handleSetStatus(status) {
    setError(null);
    const updates = { status };
    if (status === "final" && match.stage === "knockout") {
      updates.teamAId = match.teamAId;
      updates.teamBId = match.teamBId;
      if (isDraw) {
        if (!pendingWinner) return; // the winner picker below handles prompting
        updates.manualWinnerTeamId = pendingWinner;
      }
    }
    try {
      await updateMatch(tournament.id, match.id, updates);
      setPendingWinner(null);
    } catch {
      setError("Couldn't update the match — check your connection and try again.");
    }
  }

  const subtitle =
    match.stage === "pool"
      ? `Pool stage · Round ${match.round + 1}`
      : knockoutRoundLabel(match.round, knockoutRounds.length);

  return (
    <div className="stack">
      <Link to="../fixtures" className="row text-soft text-sm" style={{ textDecoration: "none" }}>
        <ChevronLeft size={16} /> Back
      </Link>

      <div className="row-between">
        <p className="text-soft text-sm" style={{ margin: 0 }}>
          {subtitle}
        </p>
        {match.status === "final" ? (
          <span className="badge badge-final">Final</span>
        ) : match.status === "live" ? (
          <span className="badge badge-live">Live</span>
        ) : (
          <span className="badge badge-scheduled">Upcoming</span>
        )}
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <TeamScoreColumn side="A" team={teamA} score={match.scoreA} goals={match.goals || []} onAddGoal={handleAddGoal} onUndoGoal={handleUndoGoal} />
        <p style={{ fontWeight: 800, color: "var(--ink-soft)", marginTop: 40 }}>–</p>
        <TeamScoreColumn side="B" team={teamB} score={match.scoreB} goals={match.goals || []} onAddGoal={handleAddGoal} onUndoGoal={handleUndoGoal} />
      </div>

      {error && <p style={{ color: "var(--loss)" }}>{error}</p>}

      <div className="stack">
        {match.status === "scheduled" && (
          <button className="btn btn-primary btn-block" onClick={() => handleSetStatus("live")}>
            <Play size={16} /> Start match
          </button>
        )}

        {match.status !== "final" && needsWinnerPick && (
          <div className="card stack" style={{ padding: 12 }}>
            <p className="text-sm" style={{ fontWeight: 700, margin: 0 }}>
              Level score — who won (e.g. on penalties)?
            </p>
            <div className="row">
              <button className="btn" style={{ flex: 1 }} onClick={() => setPendingWinner(match.teamAId)}>
                {pendingWinner === match.teamAId ? "✓ " : ""}
                {teamA?.name}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setPendingWinner(match.teamBId)}>
                {pendingWinner === match.teamBId ? "✓ " : ""}
                {teamB?.name}
              </button>
            </div>
          </div>
        )}

        {match.status !== "final" && (
          <button
            className="btn btn-accent btn-block"
            onClick={() => handleSetStatus("final")}
            disabled={needsWinnerPick && !pendingWinner}
          >
            <CheckCircle2 size={16} /> Mark final
          </button>
        )}

        {match.status === "final" && (
          <button className="btn btn-block" onClick={() => handleSetStatus("live")}>
            <RotateCcw size={16} /> Reopen to correct
          </button>
        )}
      </div>
    </div>
  );
}
