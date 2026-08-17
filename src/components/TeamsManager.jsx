import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { updateTeam, deleteTeam, addPlayer, removePlayer } from "../lib/tournaments.js";

function PlayerRow({ tournamentId, team, player }) {
  return (
    <div className="row-between text-sm">
      <span>
        {player.number ? `#${player.number} ` : ""}
        {player.name}
      </span>
      <button className="btn btn-icon btn-sm" aria-label={`Remove ${player.name}`} onClick={() => removePlayer(tournamentId, team, player.id)}>
        <X size={14} />
      </button>
    </div>
  );
}

function AddPlayerForm({ tournamentId, team }) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await addPlayer(tournamentId, team, { name, number: number ? Number(number) : null });
    setName("");
    setNumber("");
  }

  return (
    <form className="row" onSubmit={handleSubmit}>
      <input className="input" style={{ width: 60, flex: "0 0 60px" }} placeholder="#" value={number} onChange={(e) => setNumber(e.target.value)} />
      <input className="input" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
      <button type="submit" className="btn btn-icon btn-primary" aria-label="Add player" disabled={!name.trim()}>
        <Plus size={16} />
      </button>
    </form>
  );
}

export default function TeamsManager() {
  const { tournament, teams } = useOutletContext();
  const canDeleteTeams = tournament.status === "setup";

  return (
    <div className="stack">
      {teams.length === 0 && <div className="empty-state">No teams yet — add some from the Setup tab.</div>}
      {teams.map((team) => (
        <div key={team.id} className="card stack">
          <div className="row-between">
            <input
              className="input"
              style={{ fontWeight: 700 }}
              defaultValue={team.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== team.name) {
                  updateTeam(tournament.id, team.id, { name: e.target.value.trim() });
                }
              }}
            />
            {canDeleteTeams && (
              <button className="btn btn-icon" aria-label={`Delete ${team.name}`} onClick={() => deleteTeam(tournament.id, team.id)}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="stack" style={{ gap: 6 }}>
            <p className="section-title" style={{ margin: 0 }}>
              Players ({(team.players || []).length})
            </p>
            {(team.players || []).map((player) => (
              <PlayerRow key={player.id} tournamentId={tournament.id} team={team} player={player} />
            ))}
            <AddPlayerForm tournamentId={tournament.id} team={team} />
          </div>
        </div>
      ))}
    </div>
  );
}
