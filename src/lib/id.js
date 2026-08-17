// Generates a unique id for a new tournament/team/player/match. Uses the
// browser's built-in crypto.randomUUID() when available — a real,
// collision-resistant UUID, not a dependency — which matters here because
// ids sync across devices via Firestore, where two devices landing on the
// same short random id would be a real (if currently unlikely) risk with a
// naive Math.random()-based approach.
//
// Falls back to a timestamp-mixed random string for environments where
// crypto.randomUUID isn't available — notably, it requires a "secure
// context" (HTTPS or localhost), so this matters if the app were ever
// served over plain HTTP on a non-localhost origin.
export function generateId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Short, human-typeable join code for sharing a tournament with other
// devices (e.g. "PLUM42"). Deliberately excludes visually-ambiguous
// characters (0/O, 1/I/L) since this gets read off one phone screen and
// typed into another, often outdoors in bright sun.
const JOIN_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}
