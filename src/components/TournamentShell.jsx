import { Fragment, useEffect } from "react";
import { useParams, Outlet, NavLink } from "react-router-dom";
import { Settings, CalendarDays, ClipboardList, Layers, GitBranch, Award, Users, Share2 } from "lucide-react";
import { useTournamentData } from "../hooks/useTournamentData.js";
import { rememberTournament } from "../lib/recentTournaments.js";
import LoadingScreen from "./LoadingScreen.jsx";

const TABS = [
  { to: "setup", label: "Setup", icon: Settings },
  { to: "fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "results", label: "Results", icon: ClipboardList },
  { to: "pools", label: "Pools", icon: Layers },
  { to: "bracket", label: "Bracket", icon: GitBranch },
  { to: "awards", label: "Awards", icon: Award },
  { to: "teams", label: "Teams", icon: Users },
];

export default function TournamentShell() {
  const { tournamentId } = useParams();
  const data = useTournamentData(tournamentId);
  const { tournament, loading, notFound } = data;

  useEffect(() => {
    if (tournament) {
      rememberTournament({ id: tournament.id, name: tournament.name, joinCode: tournament.joinCode, date: tournament.date });
    }
  }, [tournament]);

  if (loading) return <LoadingScreen label="Loading tournament…" />;
  if (notFound) {
    return (
      <div className="empty-state">
        <p>Couldn't find that tournament. It may have been deleted, or the link is wrong.</p>
      </div>
    );
  }

  return (
    // The tab bar is a sibling of .stack, not nested inside it — .stack
    // gets the settle-in transform animation on route change (see
    // index.css), and a `transform` on an ancestor makes it the containing
    // block for any `position: fixed` descendant. Nesting the tab bar
    // inside would silently turn "fixed to the viewport" into "fixed to
    // this div", pinning it to the wrong place the instant that animation
    // runs (found the hard way — see the design-pass verification).
    <Fragment>
      <div className="stack">
        <div className="row-between">
          <div>
            <h1 style={{ fontSize: 20, margin: 0 }}>{tournament.name}</h1>
            {tournament.date && <p className="text-soft text-sm" style={{ margin: 0 }}>{tournament.date}</p>}
          </div>
          <button
            className="chip"
            onClick={() => {
              const url = `${window.location.origin}${import.meta.env.BASE_URL}t/${tournament.id}`;
              navigator.clipboard?.writeText(url).catch(() => {});
            }}
            title="Copy a link to share with other devices"
          >
            <Share2 size={14} />
            {tournament.joinCode}
          </button>
        </div>

        <Outlet context={data} />
      </div>

      <nav className="tab-bar">
        <div className="tab-bar-inner">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `tab-link${isActive ? " active" : ""}`}>
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </Fragment>
  );
}
