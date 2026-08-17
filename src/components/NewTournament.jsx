import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trophy, Shield, Sparkles, Globe2 } from "lucide-react";
import { createTournament, describeSaveError } from "../lib/tournaments.js";
import { rememberTournament } from "../lib/recentTournaments.js";

const TYPES = [
  { id: "world-cup", label: "World Cup", icon: Globe2, teamNameSource: "countries", defaultName: "World Cup" },
  { id: "champions-league", label: "Champions League", icon: Shield, teamNameSource: "clubs", defaultName: "Champions League" },
  { id: "other", label: "Other", icon: Sparkles, teamNameSource: null, defaultName: "" },
];

function StepHeader({ onBack, title, step, totalSteps }) {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <button onClick={onBack} className="row text-soft text-sm" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <ChevronLeft size={16} /> Back
      </button>
      <div className="row-between">
        <h1 style={{ fontSize: 20, margin: 0 }}>{title}</h1>
        <span className="text-soft text-sm">
          Step {step} of {totalSteps}
        </span>
      </div>
    </div>
  );
}

function OptionCard({ icon: Icon, label, sublabel, onClick }) {
  return (
    <button onClick={onClick} className="card row" style={{ width: "100%", textAlign: "left", cursor: "pointer", gap: 14 }}>
      <div className="center" style={{ width: 40, height: 40, borderRadius: 10, background: "#eceef4", flexShrink: 0 }}>
        <Icon size={20} color="var(--navy)" />
      </div>
      <div>
        <div style={{ fontWeight: 700 }}>{label}</div>
        {sublabel && (
          <div className="text-soft text-sm" style={{ margin: 0 }}>
            {sublabel}
          </div>
        )}
      </div>
    </button>
  );
}

export default function NewTournament() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = sport, 1 = type, 2 = details
  const [type, setType] = useState(null);
  const [teamNameSource, setTeamNameSource] = useState("custom");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [win, setWin] = useState(3);
  const [draw, setDraw] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function selectType(t) {
    setType(t.id);
    setTeamNameSource(t.teamNameSource || "custom");
    setName(t.defaultName);
    setStep(2);
  }

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
        sport: "football",
        type,
        teamNameSource,
      });
      rememberTournament({ id: tournament.id, name: tournament.name, joinCode: tournament.joinCode, date: tournament.date });
      navigate(`/t/${tournament.id}/setup`);
    } catch (err) {
      setError(describeSaveError(err));
      setSaving(false);
    }
  }

  if (step === 0) {
    return (
      <div className="stack">
        <StepHeader onBack={() => navigate("/")} title="Sport" step={1} totalSteps={3} />
        <OptionCard icon={Trophy} label="Football" sublabel="More sports coming later" onClick={() => setStep(1)} />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="stack">
        <StepHeader onBack={() => setStep(0)} title="Tournament type" step={2} totalSteps={3} />
        {TYPES.map((t) => (
          <OptionCard
            key={t.id}
            icon={t.icon}
            label={t.label}
            sublabel={
              t.teamNameSource === "countries"
                ? "Teams can be auto-named after real countries"
                : t.teamNameSource === "clubs"
                  ? "Teams can be auto-named after real football clubs"
                  : "Name it yourself"
            }
            onClick={() => selectType(t)}
          />
        ))}
      </div>
    );
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <StepHeader onBack={() => setStep(1)} title="Tournament details" step={3} totalSteps={3} />

      <div className="field">
        <label htmlFor="name">Tournament name</label>
        <input
          id="name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Under-9s Summer Cup"
          required
          autoFocus={type === "other"}
        />
      </div>

      {type === "other" && (
        <div className="field">
          <label htmlFor="teamNameSource">How should teams be named?</label>
          <select id="teamNameSource" className="select" value={teamNameSource} onChange={(e) => setTeamNameSource(e.target.value)}>
            <option value="custom">I'll type each team's name</option>
            <option value="countries">Auto-name from countries</option>
            <option value="clubs">Auto-name from football clubs</option>
          </select>
        </div>
      )}

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
