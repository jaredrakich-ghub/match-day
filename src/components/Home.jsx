import { Link } from "react-router-dom";
import { PlusCircle, KeyRound, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { getRecentTournaments, forgetTournament } from "../lib/recentTournaments.js";

export default function Home() {
  const [recent, setRecent] = useState(getRecentTournaments());

  function handleForget(id) {
    forgetTournament(id);
    setRecent(getRecentTournaments());
  }

  return (
    <div className="stack">
      <div className="stack" style={{ gap: 8 }}>
        <Link to="/new" className="btn btn-primary btn-block">
          <PlusCircle size={18} />
          New tournament
        </Link>
        <Link to="/join" className="btn btn-block">
          <KeyRound size={18} />
          Join with a code
        </Link>
      </div>

      {recent.length > 0 && (
        <div className="stack">
          <p className="section-title">Your tournaments</p>
          {recent.map((t) => (
            <div key={t.id} className="row" style={{ gap: 8 }}>
              <Link to={`/t/${t.id}`} className="match-card row-between" style={{ flex: 1 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="text-soft text-sm">
                    Code {t.joinCode}
                    {t.date ? ` · ${t.date}` : ""}
                  </div>
                </div>
                <ChevronRight size={18} className="text-soft" />
              </Link>
              <button
                className="btn btn-icon"
                aria-label={`Remove ${t.name} from this device`}
                onClick={() => handleForget(t.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {recent.length === 0 && (
        <div className="empty-state">
          <p>No tournaments on this device yet. Create one, or join with a code someone shared with you.</p>
        </div>
      )}
    </div>
  );
}
