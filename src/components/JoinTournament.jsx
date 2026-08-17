import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { getTournamentIdByJoinCode } from "../lib/tournaments.js";

export default function JoinTournament() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const tournamentId = await getTournamentIdByJoinCode(code);
      if (!tournamentId) {
        setError("No tournament found with that code — double check it and try again.");
        setLoading(false);
        return;
      }
      navigate(`/t/${tournamentId}`);
    } catch {
      setError("Couldn't look that up — check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <Link to="/" className="row text-soft text-sm" style={{ textDecoration: "none" }}>
        <ChevronLeft size={16} /> Back
      </Link>
      <h1 style={{ fontSize: 20, margin: 0 }}>Join a tournament</h1>
      <p className="text-soft">Ask the organizer for the 6-character code.</p>

      <div className="field">
        <label htmlFor="code">Join code</label>
        <input
          id="code"
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. PLUM42"
          maxLength={8}
          style={{ textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}
          autoFocus
          required
        />
      </div>

      {error && <p style={{ color: "var(--loss)" }}>{error}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={loading || !code.trim()}>
        {loading ? "Looking up…" : "Join"}
      </button>
    </form>
  );
}
