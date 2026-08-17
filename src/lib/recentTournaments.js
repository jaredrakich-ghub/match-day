// Remembers which tournaments this device has created or joined, so the
// Home screen can list them without needing a Firestore query — there
// isn't one to run: tournaments are only ever reachable by a known id/join
// code (see tournaments.js / firestore.rules), by design, so "which
// tournaments do I know about" has to live locally, per device.
const STORAGE_KEY = "match-day:recent-tournaments";
const MAX_REMEMBERED = 20;

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage can be unavailable (private browsing, quota) — losing
    // the remembered list isn't fatal, a tournament stays reachable by its
    // join code either way.
  }
}

export function getRecentTournaments() {
  return readAll();
}

// Records/updates a tournament in the local "recent" list. Called whenever
// this device creates, joins, or opens a tournament.
export function rememberTournament({ id, name, joinCode, date }) {
  const entries = readAll().filter((t) => t.id !== id);
  entries.unshift({ id, name, joinCode, date, lastOpenedAt: Date.now() });
  writeAll(entries.slice(0, MAX_REMEMBERED));
}

export function forgetTournament(id) {
  writeAll(readAll().filter((t) => t.id !== id));
}
