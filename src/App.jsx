import { Routes, Route, Link } from "react-router-dom";
import { Trophy } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import { useAuthUser } from "./hooks/useAuthUser.js";
import Home from "./components/Home.jsx";
import NewTournament from "./components/NewTournament.jsx";
import JoinTournament from "./components/JoinTournament.jsx";
import TournamentShell from "./components/TournamentShell.jsx";
import SetupWizard from "./components/SetupWizard.jsx";
import FixturesList from "./components/FixturesList.jsx";
import ResultsList from "./components/ResultsList.jsx";
import PoolsView from "./components/PoolsView.jsx";
import BracketView from "./components/BracketView.jsx";
import AwardsView from "./components/AwardsView.jsx";
import TeamsManager from "./components/TeamsManager.jsx";
import ScoreEntry from "./components/ScoreEntry.jsx";

export default function App() {
  const { loading, error } = useAuthUser();

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <Link to="/" className="app-title">
              <Trophy size={20} strokeWidth={2.5} />
              Match Day
            </Link>
          </div>
        </header>
        <main className="app-main">
          {loading ? (
            <LoadingScreen label="Connecting…" />
          ) : error ? (
            <div className="card">
              <p>Couldn't connect — check your internet connection and reload.</p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/new" element={<NewTournament />} />
              <Route path="/join" element={<JoinTournament />} />
              <Route path="/t/:tournamentId" element={<TournamentShell />}>
                <Route index element={<SetupWizard />} />
                <Route path="setup" element={<SetupWizard />} />
                <Route path="fixtures" element={<FixturesList />} />
                <Route path="results" element={<ResultsList />} />
                <Route path="pools" element={<PoolsView />} />
                <Route path="bracket" element={<BracketView />} />
                <Route path="awards" element={<AwardsView />} />
                <Route path="teams" element={<TeamsManager />} />
                <Route path="match/:matchId" element={<ScoreEntry />} />
              </Route>
            </Routes>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
