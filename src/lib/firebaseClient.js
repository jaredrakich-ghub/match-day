// Firebase project setup for Match Day. This config is not a secret — it's
// meant to be visible in client-side code (Firebase's actual security lives
// in Firestore security rules, not in hiding these values), so it's fine to
// commit directly rather than route through environment variables.
//
// *** REPLACE THIS BEFORE DEPLOYING ***
// These are placeholder values. Create your own Firebase project (see
// README.md "One-time Firebase setup") and paste its config here — the app
// will not connect to anything real until you do. Local development against
// the emulator (`npm run dev:emulator`, see below) works without this.
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// The emulator (firebase.json/.firebaserc) is pinned to the demo project id
// "demo-match-day-test" in `singleProjectMode` — the SDK has to be
// initialized with that *exact* project id to talk to it (a "demo-" prefix
// is what tells Firebase this is a fake, emulator-only project, so no real
// apiKey is needed either). Real deploys never take this branch.
const isEmulator = import.meta.env.VITE_USE_EMULATOR === "true";

const firebaseConfig = isEmulator
  ? { apiKey: "demo-key", authDomain: "localhost", projectId: "demo-match-day-test" }
  : {
      apiKey: "REPLACE_ME",
      authDomain: "REPLACE_ME.firebaseapp.com",
      projectId: "REPLACE_ME",
      storageBucket: "REPLACE_ME.firebasestorage.app",
      messagingSenderId: "REPLACE_ME",
      appId: "REPLACE_ME",
    };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Persistent local cache means unsent writes (a score entered, a goal
// logged) are safe on disk, not just in memory, if the connection drops
// mid-match — a phone on a sideline with patchy signal is exactly what this
// app is for, same reasoning as Bench Buddy's firebaseClient.js.
//
// persistentMultipleTabManager (rather than the single-tab version) so
// someone who accidentally has the app open in two tabs on the same device
// doesn't silently lose persistence in the second one.
//
// Firestore's persistent cache needs IndexedDB, which only exists in a real
// browser — falls back to the plain in-memory client under Node (tests).
const hasIndexedDb = typeof indexedDB !== "undefined";
export const db = hasIndexedDb
  ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
  : getFirestore(app);

// Local development against the Firestore/Auth emulators (no real Firebase
// project needed) — set VITE_USE_EMULATOR=true, e.g. via `npm run
// dev:emulator` alongside `npm run emulators`. Never true in a production
// build.
if (isEmulator) {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
