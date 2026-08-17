import { useEffect, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { Plus, X, Shuffle, RotateCcw, Sparkles } from "lucide-react";
import {
  addTeam,
  addTeamsBatch,
  deleteTeam,
  assignTeamsToPools,
  generatePoolStage,
  generateKnockoutStage,
  deleteAllMatches,
  updateTournament,
} from "../lib/tournaments.js";
import { assignPools, suggestNumPools } from "../lib/pools.js";
import { pickRandomNames } from "../lib/teamNames.js";
import { COUNTRIES } from "../lib/countries.js";
import { CLUBS } from "../lib/clubs.js";

const NAME_SOURCES = { countries: COUNTRIES, clubs: CLUBS };
const NAME_SOURCE_LABEL = { countries: "countries", clubs: "clubs" };

export default function SetupWizard() {
  const { tournament, teams, teamsById, poolMatches, knockoutMatches } = useOutletContext();
  const navigate = useNavigate();
  const [newTeamName, setNewTeamName] = useState("");
  const [autoAddCount, setAutoAddCount] = useState(8);
  const [autoAdding, setAutoAdding] = useState(false);
  const [numPools, setNumPools] = useState(1);
  const [advancePerPool, setAdvancePerPool] = useState(1);
  const [poolsPreview, setPoolsPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fixturesGenerated = tournament.status !== "setup";

  useEffect(() => {
    if (fixturesGenerated || teams.length === 0) return;
    setNumPools((prev) => (prev >= 1 && prev <= teams.length ? prev : suggestNumPools(teams.length)));
  }, [teams.length, fixturesGenerated]);

  useEffect(() => {
    if (fixturesGenerated || teams.length === 0) return;
    shufflePools(numPools);
    // Only re-shuffle when the pool count or the team roster changes, not
    // every render — a manual swap (movePreviewTeam) shouldn't get undone
    // by this effect re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPools, teams.length, fixturesGenerated]);

  function shufflePools(count = numPools) {
    const shuffled = [...teams.map((t) => t.id)].sort(() => Math.random() - 0.5);
    setPoolsPreview(assignPools(shuffled, Math.max(1, Math.min(count, teams.length))));
  }

  function movePreviewTeam(teamId, targetPoolIndex) {
    setPoolsPreview((prev) => {
      const next = prev.map((pool) => pool.filter((id) => id !== teamId));
      next[targetPoolIndex] = [...next[targetPoolIndex], teamId];
      return next;
    });
  }

  async function handleAddTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    const name = newTeamName;
    setNewTeamName("");
    await addTeam(tournament.id, { name });
  }

  // "Auto-add teams" — instant convenience for World Cup/Champions League
  // style tournaments, not a hard requirement: it just fills in N teams
  // named from countries.js/clubs.js so the organizer isn't stuck typing
  // "Team 1", "Team 2"... Any team can still be renamed afterward (Teams
  // tab) if a kid wants a specific one.
  const nameSourceList = NAME_SOURCES[tournament.teamNameSource];
  async function handleAutoAdd() {
    if (!nameSourceList || autoAddCount <= 0) return;
    setAutoAdding(true);
    try {
      const existingNames = new Set(teams.map((t) => t.name));
      const available = nameSourceList.filter((n) => !existingNames.has(n));
      const names = pickRandomNames(available.length > 0 ? available : nameSourceList, autoAddCount);
      await addTeamsBatch(tournament.id, names);
    } finally {
      setAutoAdding(false);
    }
  }

  const maxAdvance = poolsPreview.length > 0 ? Math.min(...poolsPreview.map((p) => p.length)) : 1;

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const pools = poolsPreview.map((teamIds, i) => ({ poolId: `pool-${i + 1}`, teamIds }));
      const assignments = pools.flatMap((p) => p.teamIds.map((teamId) => ({ teamId, poolId: p.poolId })));
      await assignTeamsToPools(tournament.id, assignments);
      await generatePoolStage(tournament.id, pools, { numPools: pools.length, advancePerPool });
      if (advancePerPool > 0 && pools.length >= 1) {
        await generateKnockoutStage(tournament.id, pools, advancePerPool);
      }
      navigate("../fixtures");
    } catch {
      setError("Couldn't generate fixtures — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "This deletes all fixtures, scores, and goals recorded so far. Team names and players are kept. Continue?"
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const allMatchIds = [...poolMatches, ...knockoutMatches].map((m) => m.id);
      if (allMatchIds.length > 0) await deleteAllMatches(tournament.id, allMatchIds);
      await updateTournament(tournament.id, { status: "setup", poolConfig: null });
    } finally {
      setBusy(false);
    }
  }

  if (fixturesGenerated) {
    return (
      <div className="stack">
        <div className="card stack">
          <p className="section-title" style={{ margin: 0 }}>
            Tournament generated
          </p>
          <p style={{ margin: 0 }}>
            {tournament.poolConfig?.numPools} pool{tournament.poolConfig?.numPools === 1 ? "" : "s"}, {teams.length} teams
            {tournament.poolConfig?.advancePerPool > 0 ? `, top ${tournament.poolConfig.advancePerPool} per pool advance to the knockout stage` : ""}.
          </p>
          <p className="text-soft text-sm" style={{ margin: 0 }}>
            See the Fixtures, Pools, and Bracket tabs. Add players to teams any time from the Teams tab.
          </p>
        </div>
        <button className="btn btn-danger btn-block" onClick={handleReset} disabled={busy}>
          <RotateCcw size={16} />
          Start over (clears fixtures &amp; scores)
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card stack">
        <p className="section-title" style={{ margin: 0 }}>
          Teams ({teams.length})
        </p>
        {teams.length > 0 && (
          <div className="chip-row">
            {teams.map((team) => (
              <span key={team.id} className="chip">
                {team.name}
                <button
                  aria-label={`Remove ${team.name}`}
                  onClick={() => deleteTeam(tournament.id, team.id)}
                  style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form className="row" onSubmit={handleAddTeam}>
          <input
            className="input"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Add a team name"
          />
          <button type="submit" className="btn btn-icon btn-primary" aria-label="Add team" disabled={!newTeamName.trim()}>
            <Plus size={18} />
          </button>
        </form>

        {nameSourceList && (
          <div className="row" style={{ paddingTop: 4, borderTop: "1px solid var(--border)" }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="autoAddCount">Number of teams to auto-add</label>
              <input
                id="autoAddCount"
                type="number"
                min="1"
                className="input"
                value={autoAddCount}
                onChange={(e) => setAutoAddCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <button className="btn btn-accent" style={{ marginTop: 20 }} onClick={handleAutoAdd} disabled={autoAdding} type="button">
              <Sparkles size={16} />
              {autoAdding ? "Adding…" : `Auto-add from ${NAME_SOURCE_LABEL[tournament.teamNameSource]}`}
            </button>
          </div>
        )}
      </div>

      {teams.length >= 2 && (
        <div className="card stack">
          <p className="section-title" style={{ margin: 0 }}>
            Pools
          </p>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="numPools">Number of pools</label>
              <input
                id="numPools"
                type="number"
                min="1"
                max={teams.length}
                className="input"
                value={numPools}
                onChange={(e) => setNumPools(Math.max(1, Math.min(teams.length, Number(e.target.value) || 1)))}
              />
            </div>
            <button className="btn btn-sm" style={{ marginTop: 20 }} onClick={() => shufflePools(numPools)} type="button">
              <Shuffle size={14} />
              Shuffle
            </button>
          </div>

          <div className="stack">
            {poolsPreview.map((teamIds, poolIndex) => (
              <div key={poolIndex} className="card" style={{ padding: 10 }}>
                <p className="text-sm" style={{ fontWeight: 700, margin: "0 0 6px" }}>
                  Pool {String.fromCharCode(65 + poolIndex)}
                </p>
                <div className="stack" style={{ gap: 6 }}>
                  {teamIds.map((teamId) => (
                    <div key={teamId} className="row-between">
                      <span>{teamsById[teamId]?.name}</span>
                      <select
                        className="select"
                        style={{ width: "auto", minHeight: 32, padding: "4px 8px" }}
                        value={poolIndex}
                        onChange={(e) => movePreviewTeam(teamId, Number(e.target.value))}
                      >
                        {poolsPreview.map((_, i) => (
                          <option key={i} value={i}>
                            Pool {String.fromCharCode(65 + i)}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="field">
            <label htmlFor="advance">Teams advancing per pool to the knockout stage</label>
            <select
              id="advance"
              className="select"
              value={advancePerPool}
              onChange={(e) => setAdvancePerPool(Number(e.target.value))}
            >
              <option value={0}>No knockout stage — pools decide it</option>
              {Array.from({ length: maxAdvance }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </div>

          {error && <p style={{ color: "var(--loss)" }}>{error}</p>}

          <button className="btn btn-accent btn-block" onClick={handleGenerate} disabled={busy}>
            {busy ? "Generating…" : "Generate fixtures"}
          </button>
        </div>
      )}

      {teams.length < 2 && <div className="empty-state">Add at least 2 teams to generate fixtures.</div>}
    </div>
  );
}
