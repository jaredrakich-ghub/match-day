import { useEffect, useState } from "react";
import { ensureSignedIn, onAuthChange } from "../lib/auth.js";

// Signs this device in anonymously (once) and tracks the resulting auth
// state. Every screen that touches Firestore waits on `loading` first —
// writes before the anonymous session exists would just fail the security
// rules' `isSignedIn()` check.
export function useAuthUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setLoading(false);
    });
    ensureSignedIn().catch((err) => {
      setError(err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading, error };
}
