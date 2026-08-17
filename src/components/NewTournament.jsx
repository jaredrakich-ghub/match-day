import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { createTournament, describeSaveError } from "../lib/tournaments.js";
import { rememberTournament } from "../lib/recentTournaments.js";

export default function NewTournament() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [win, setWin] = useState(3);
  const [draw, setDraw] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const tournament = await createTournament({
        name,
        date,
        pointsRules: { win: Number(win), draw: Number(draw), loss: 0 },
      });
      rememberTournament({ id: tournament.id, name: tournament.name, joinCode: tournament.joinCode, date: tournament.date });
      navigate(`/t/${tournament.id}/setup`);
    } catch (err) {
      setError(describeSaveError(err));
      setSaving(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Link to="/" className="row text-soft text-sm" style={{ textDecoration: "none" }}>
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 style={{ fontSize: 20, margin: 0 }}>New tournament</h1>

      <div className="field">
        <label htmlFor="name">Tournament name</label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Under-9s Summer Cup"
          required
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="date">Date (optional)</label>
        <input id="date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="card stack">
        <p className="section-title" style={{ margin: 0 }}>
          Points for pool matches
        </p>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="win">Win</label>
            <input id="win" type="number" min="0" className="input" value={win} onChange={(e) => setWin(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="draw">Draw</label>
            <input id="draw" type="number" min="0" className="input" value={draw} onChange={(e) => setDraw(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="loss">Loss</label>
            <input id="loss" type="number" className="input" value={0} disabled />
          </div>
        </div>
      </div>

      {error && <p style={{ color: "var(--loss)" }}>{error}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={saving || !name.trim()}>
        {saving ? "Creating…" : "Create tournament"}
      </button>
    </form>
  );
}
