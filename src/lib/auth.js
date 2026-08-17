// Thin wrapper around Firebase Auth (anonymous sign-in only). Match Day has
// no login screen — a device gets signed in silently on first load, and
// access to a given tournament comes from knowing its join code/link, not
// from who's signed in. Kept separate from the components that use it so
// the rest of the app deals with plain functions/callbacks, not Firebase's
// API shape directly.
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebaseClient.js";

// Ensures this device has an anonymous Firebase Auth session, creating one
// silently if needed. Safe to call multiple times — Firebase Auth persists
// the session locally, so this is a no-op on every load after the first.
export async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
}

// Calls `callback(user)` immediately with the current auth state, and again
// whenever it changes. `user` is null only very briefly, before the initial
// anonymous sign-in completes. Returns the unsubscribe function.
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
