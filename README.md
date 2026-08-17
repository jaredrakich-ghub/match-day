# Match Day

A tournament-day app for kids' football — enter your teams, generate pools
and a knockout bracket, record scores and who scored, and watch fixtures,
results, standings, the bracket, and a golden boot leaderboard update live
across every device following along.

## How it's put together

- **The rules** (`src/lib/pools.js`, `fixtures.js`, `standings.js`,
  `knockout.js`, `awards.js`) — pool assignment, round-robin fixture
  generation, the points table, knockout bracket seeding/progression, and
  the golden boot leaderboard. Plain functions, no React or Firebase
  involved, each with its own test file — this is where the actual
  tournament logic lives and where the test coverage is concentrated.
- **The screens** (`src/components/`) — one component per tab (Setup,
  Fixtures, Results, Pools, Bracket, Awards, Teams) plus score entry.
- **App state** (`src/hooks/useTournamentData.js`) — subscribes to a
  tournament's teams and matches and derives everything the screens need
  (standings, golden boot, resolved bracket matchups) from them.
- **Firebase** (`src/lib/firebaseClient.js`, `auth.js`, `tournaments.js`) —
  live Firestore sync across devices and anonymous sign-in. No separate
  backend server; the browser talks to Firestore directly, and
  `firestore.rules` is what governs access.

```
match-day/
├── firestore.rules          Database security rules (deployed separately — see below)
├── firebase.json / .firebaserc   Local emulator config
├── src/
│   ├── main.jsx                Boots React + routing
│   ├── App.jsx                  Top-level routes
│   ├── components/              Screens
│   ├── hooks/                   Derived app state
│   └── lib/                     The rules, plus Firebase/storage plumbing
```

## Access model — how a tournament is shared

There's no login screen and no per-user accounts. A device signs in
anonymously (silently, on first load) and gets a 6-character **join code**
when it creates a tournament — sharing that code (or the link it's part of)
with other devices is what lets an organizer's tablet and, say, two other
parents scoring pitches at the same time all see and edit the same
tournament live.

That means **anyone with the code/link can view and edit** — there are no
roles or permissions beyond that. It's a deliberate trade-off for a one-day
event run by a trusted group, not an oversight; see the comments in
`firestore.rules` and `src/lib/tournaments.js` for the reasoning and exactly
what it does and doesn't expose (short version: a tournament is only ever
reachable by an id/code someone already has — the app never lets a client
list or browse other people's tournaments).

## One-time Firebase setup

The app won't connect to anything real until you do this once (local
development against the emulator, below, doesn't need it):

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Authentication → Get started → Sign-in method → Anonymous** —
   enable it. This is the only sign-in method the app uses.
3. **Build → Firestore Database → Create database** — start in production
   mode (the rules in this repo are what actually govern access).
4. **Project settings → General → Your apps → Add app → Web** — register
   the app and copy the `firebaseConfig` object it gives you.
5. Paste those values into `src/lib/firebaseClient.js`, replacing the
   `REPLACE_ME` placeholders.
6. Deploy the security rules (not part of the automated deploy below —
   done by hand, whenever they change):

   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

## Running it locally

You'll need [Node.js](https://nodejs.org) 22 or later.

```bash
npm install     # downloads dependencies into node_modules
npm run dev     # starts a local dev server against your real Firebase project
```

To develop without a real Firebase project at all, run the local emulator
suite instead (two terminals):

```bash
npm run emulators      # starts local Firestore + Auth emulators
npm run dev:emulator   # starts the dev server pointed at them, not the cloud
```

Open the URL Vite prints. Changes to any file under `src/` reload
automatically.

## Testing

```bash
npm test   # pure-logic tests (pools, fixtures, standings, knockout, awards) — fast, no dependencies running
```

These are the tests that matter most here — they're what verify pool
assignment, round-robin fixture generation, the points table, and knockout
bracket seeding/progression are actually correct. Runs automatically in CI
on every push (see `.github/workflows/deploy.yml`).

## Building for real deployment

```bash
npm run build     # outputs a production-ready static site into dist/
npm run preview   # lets you check the production build locally
```

## Deployment

Pushing to `main` automatically builds and deploys to GitHub Pages (see
`.github/workflows/deploy.yml`) once tests pass — enable it once under the
repo's **Settings → Pages → Source: GitHub Actions**.

`vite.config.js` serves the built app from `/match-day/` (a GitHub Pages
project site path) and `manifest.webmanifest` assumes the same — update both
together if the repo ends up with a different name.

## Known limitations (v1)

- **Knockout seeding** uses a standard "top seeds kept apart, pool winners
  face weaker opposition early" convention with a best-effort pass to avoid
  same-pool rematches in round 1 — it isn't guaranteed to avoid one in every
  configuration (e.g. a single pool advancing 4+ teams). See the comments in
  `src/lib/knockout.js`.
- **Editing after fixtures are generated** is limited — team names and
  rosters can be edited any time, but changing pool assignments or the
  number of teams requires "Start over" on the Setup tab, which clears all
  scores and goals recorded so far.
- **No offline queueing beyond Firestore's own local cache** — Firestore's
  persistent cache means a brief connection drop won't lose an in-progress
  edit, but this isn't a fully offline-first app; it needs to reach Firebase
  at some point to sync.
