// Picks `count` unique random names from a source list (countries.js /
// clubs.js) — used by "Auto-add teams" in the setup wizard. Fisher-Yates
// shuffle then take the front `count`, rather than repeated random picks
// with a rejection loop, so it can't degrade into a long retry loop as
// `count` approaches the list's length.
//
// If `count` exceeds the list (a big tournament, a short list), it cycles
// back through a second shuffled pass with " II", " III", ... appended —
// still every team gets *a* name rather than silently creating fewer teams
// than asked for.
export function pickRandomNames(sourceList, count) {
  if (count <= 0) return [];
  const names = [];
  let round = 0;
  while (names.length < count) {
    const shuffled = shuffle(sourceList);
    const suffix = round === 0 ? "" : ` ${toRoman(round + 1)}`;
    for (const name of shuffled) {
      if (names.length >= count) break;
      names.push(`${name}${suffix}`);
    }
    round += 1;
  }
  return names;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function toRoman(n) {
  return ROMAN_NUMERALS[n - 1] || `${n}`;
}
