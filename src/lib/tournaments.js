// Firestore data layer for tournaments, teams, and matches. Uses live
// onSnapshot listeners throughout (not fetch-once) because Match Day's
// whole point is several devices — different pitches, one organizer's
// tablet — watching and editing the same tournament at once.
//
// Access model: there's no per-user membership list. Anyone who has a
// tournament's join code (or a link containing its id) can read and write
// it — see firestore.rules for how that's scoped (readable/writable if you
// know the exact id, but the collection can never be listed/enumerated, so
// a code or link is genuinely required to find a tournament at all). That's
// a deliberate simplicity trade-off for a one-day event run by a trusted
// group, not an oversight.
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebaseClient.js";
import { generateId, generateJoinCode } from "./id.js";
import { generatePoolFixtures } from "./fixtures.js";
import { buildQualifierSlots, buildBracketTemplate } from "./knockout.js";

const TOURNAMENTS = "tournaments";
const JOIN_CODES = "joinCodes";

// A save failing is rare, but worth explaining in plain terms rather than a
// raw error — the organizer can't do anything about a stack trace, but
// "you're offline" or "that code doesn't exist" is actionable.
export function describeSaveError(err) {
  if (err?.code === "permission-denied") {
    return "Couldn't save — this tournament may have been deleted.";
  }
  if (err?.code === "unavailable") {
    return "You're offline — changes will sync once you're back online.";
  }
  return "Changes aren't saving right now — don't close this tab until this is resolved.";
}

// --- Tournaments ------------------------------------------------------

export async function createTournament({ name, date, pointsRules, sport = "football", type = "other", teamNameSource = "custom" }) {
  const tournamentRef = doc(collection(db, TOURNAMENTS));

  // Generate a join code that isn't already taken. Collisions are very
  // unlikely (30^6 possible codes) but checked for anyway rather than
  // assumed away — a silent collision would let two unrelated tournaments
  // share a code.
  let joinCode;
  let joinCodeRef;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateJoinCode();
    const candidateRef = doc(db, JOIN_CODES, candidate);
    const existing = await getDoc(candidateRef);
    if (!existing.exists()) {
      joinCode = candidate;
      joinCodeRef = candidateRef;
      break;
    }
  }
  if (!joinCode) throw new Error("Couldn't generate a unique join code — please try again.");

  const tournament = {
    name: name.trim(),
    date: date || null,
    joinCode,
    createdAt: serverTimestamp(),
    // sport is Football-only for now, but kept as an explicit field (not
    // assumed) since the setup flow already asks for it and more sports are
    // a plausible later addition. type/teamNameSource drive which list
    // "Auto-add teams" pulls from in the setup wizard — see teamNames.js.
    sport,
    type,
    teamNameSource,
    pointsRules: pointsRules || { win: 3, draw: 1, loss: 0 },
    poolConfig: null,
    status: "setup",
  };

  const batch = writeBatch(db);
  batch.set(tournamentRef, tournament);
  batch.set(joinCodeRef, { tournamentId: tournamentRef.id });
  await batch.commit();

  return { id: tournamentRef.id, ...tournament };
}

export async function getTournamentIdByJoinCode(code) {
  const snap = await getDoc(doc(db, JOIN_CODES, code.trim().toUpperCase()));
  return snap.exists() ? snap.data().tournamentId : null;
}

export function subscribeTournament(tournamentId, callback) {
  return onSnapshot(doc(db, TOURNAMENTS, tournamentId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function updateTournament(tournamentId, updates) {
  await updateDoc(doc(db, TOURNAMENTS, tournamentId), updates);
}

export async function deleteTournament(tournamentId) {
  // Doesn't clean up the joinCodes entry or teams/matches subcollections —
  // Firestore doesn't cascade-delete subcollections, and a stray unreachable
  // subcollection under a deleted parent id is harmless (nothing can list
  // its way to it, and it costs nothing while unused). A full cleanup job is
  // easy to add later if that ever matters; not worth batching client-side
  // deletes of a potentially large match list into this call today.
  await deleteDoc(doc(db, TOURNAMENTS, tournamentId));
}

// --- Teams --------------------------------------------------------------

function teamsCollection(tournamentId) {
  return collection(db, TOURNAMENTS, tournamentId, "teams");
}

export function subscribeTeams(tournamentId, callback) {
  return onSnapshot(teamsCollection(tournamentId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addTeam(tournamentId, { name, color }) {
  const ref = doc(teamsCollection(tournamentId));
  const team = { name: name.trim(), color: color || null, poolId: null, players: [] };
  await setDoc(ref, team);
  return { id: ref.id, ...team };
}

// Creates several teams in one batch — used by "Auto-add teams" in the
// setup wizard (a name per team, e.g. from countries.js/clubs.js) so N
// teams show up together rather than as N separate round trips.
export async function addTeamsBatch(tournamentId, names) {
  const batch = writeBatch(db);
  const created = names.map((name) => {
    const ref = doc(teamsCollection(tournamentId));
    const team = { name, color: null, poolId: null, players: [] };
    batch.set(ref, team);
    return { id: ref.id, ...team };
  });
  await batch.commit();
  return created;
}

export async function updateTeam(tournamentId, teamId, updates) {
  await updateDoc(doc(teamsCollection(tournamentId), teamId), updates);
}

export async function deleteTeam(tournamentId, teamId) {
  await deleteDoc(doc(teamsCollection(tournamentId), teamId));
}

export async function setTeamPlayers(tournamentId, teamId, players) {
  await updateDoc(doc(teamsCollection(tournamentId), teamId), { players });
}

export async function addPlayer(tournamentId, team, { name, number }) {
  const player = { id: generateId(), name: name.trim(), number: number || null };
  await setTeamPlayers(tournamentId, team.id, [...(team.players || []), player]);
  return player;
}

export async function removePlayer(tournamentId, team, playerId) {
  await setTeamPlayers(
    tournamentId,
    team.id,
    (team.players || []).filter((p) => p.id !== playerId)
  );
}

// Writes each team's poolId in a single batch — used after pool assignment
// (auto or manually adjusted) is confirmed in the setup wizard.
export async function assignTeamsToPools(tournamentId, poolAssignments) {
  // poolAssignments: [{ teamId, poolId }]
  const batch = writeBatch(db);
  for (const { teamId, poolId } of poolAssignments) {
    batch.update(doc(teamsCollection(tournamentId), teamId), { poolId });
  }
  await batch.commit();
}

// --- Matches --------------------------------------------------------------

function matchesCollection(tournamentId) {
  return collection(db, TOURNAMENTS, tournamentId, "matches");
}

export function subscribeMatches(tournamentId, callback) {
  return onSnapshot(matchesCollection(tournamentId), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// Generates the full pool-stage fixture list and writes it in one batch,
// then marks the tournament as being in the pools stage. Firestore batches
// cap at 500 writes — comfortably more than any youth tournament's fixture
// count, so no chunking needed.
export async function generatePoolStage(tournamentId, pools, poolConfig) {
  const fixtures = generatePoolFixtures(pools);
  const batch = writeBatch(db);
  for (const fixture of fixtures) {
    batch.set(doc(matchesCollection(tournamentId), fixture.id), fixture);
  }
  batch.update(doc(db, TOURNAMENTS, tournamentId), { poolConfig, status: "pools" });
  await batch.commit();
  return fixtures;
}

// Builds the knockout bracket template (see knockout.js) and writes each
// match as a document with `teamASource`/`teamBSource` recorded but no
// `teamAId`/`teamBId` — those are resolved live, client-side, from current
// standings/results (see resolveMatchTeams in knockout.js and
// useTournamentData) rather than written and kept in sync, the same
// "derive, don't duplicate" approach standings.js uses for the points
// table.
export async function generateKnockoutStage(tournamentId, pools, advancePerPool) {
  const qualifierSlots = buildQualifierSlots(pools, advancePerPool);
  const bracketTemplate = buildBracketTemplate(qualifierSlots);
  const batch = writeBatch(db);
  let order = 0;
  for (const round of bracketTemplate.rounds) {
    for (const match of round) {
      batch.set(doc(matchesCollection(tournamentId), match.id), {
        id: match.id,
        stage: "knockout",
        round: match.round,
        slot: match.slot,
        teamASource: match.teamASource,
        teamBSource: match.teamBSource,
        scoreA: 0,
        scoreB: 0,
        goals: [],
        status: "scheduled",
        order: order++,
      });
    }
  }
  batch.update(doc(db, TOURNAMENTS, tournamentId), { status: "knockout" });
  await batch.commit();
  return bracketTemplate;
}

// Score entry: updates a match's score/goals/status. For a knockout match,
// pass the currently-resolved teamAId/teamBId back in `updates` alongside
// the score — they aren't stored otherwise (see generateKnockoutStage), so
// this is what freezes "who actually played" onto the record at the moment
// it's scored, rather than leaving it to keep re-deriving from standings
// that could in principle still change later (e.g. a corrected pool score).
export async function updateMatch(tournamentId, matchId, updates) {
  await updateDoc(doc(matchesCollection(tournamentId), matchId), updates);
}

// Records a goal for `side` ("A" or "B") and bumps that side's score by one,
// in the same action — the app has no separate raw "+1" control, so every
// point on the scoreboard always corresponds to exactly one entry in
// `goals` (with a scorer, or explicitly recorded as unassigned), and the
// two can never quietly drift apart.
//
// Uses Firestore's atomic increment()/arrayUnion() rather than a
// read-then-write from local state — two devices tapping "+Goal" for the
// same team at the same moment both land correctly instead of one
// overwriting the other's increment.
export async function recordGoal(tournamentId, matchId, side, { teamId, playerId = null, playerName = null }) {
  const scoreField = side === "A" ? "scoreA" : "scoreB";
  await updateDoc(doc(matchesCollection(tournamentId), matchId), {
    [scoreField]: increment(1),
    goals: arrayUnion({ teamId, playerId, playerName }),
  });
}

// Undoes one recorded goal (a misclick) — needs the exact goal object as
// currently stored (arrayRemove matches by deep equality) plus which side's
// score it counted against.
export async function undoGoal(tournamentId, matchId, side, goal) {
  const scoreField = side === "A" ? "scoreA" : "scoreB";
  await updateDoc(doc(matchesCollection(tournamentId), matchId), {
    [scoreField]: increment(-1),
    goals: arrayRemove(goal),
  });
}

export async function deleteAllMatches(tournamentId, matchIds) {
  const batch = writeBatch(db);
  for (const id of matchIds) {
    batch.delete(doc(matchesCollection(tournamentId), id));
  }
  await batch.commit();
}
