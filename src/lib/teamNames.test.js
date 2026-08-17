import { describe, expect, it } from "vitest";
import { pickRandomNames } from "./teamNames.js";

describe("pickRandomNames", () => {
  it("returns the requested count of unique names when the list is big enough", () => {
    const list = ["a", "b", "c", "d", "e"];
    const names = pickRandomNames(list, 3);
    expect(names.length).toBe(3);
    expect(new Set(names).size).toBe(3);
    for (const n of names) expect(list).toContain(n);
  });

  it("returns an empty list for count 0 or negative", () => {
    expect(pickRandomNames(["a", "b"], 0)).toEqual([]);
    expect(pickRandomNames(["a", "b"], -1)).toEqual([]);
  });

  it("never repeats a plain name within one pass, even across many calls", () => {
    const list = ["a", "b", "c"];
    for (let i = 0; i < 20; i++) {
      const names = pickRandomNames(list, 3);
      expect(new Set(names).size).toBe(3);
    }
  });

  it("cycles with a suffix rather than falling short when count exceeds the list", () => {
    const list = ["a", "b"];
    const names = pickRandomNames(list, 5);
    expect(names.length).toBe(5);
    expect(new Set(names).size).toBe(5); // still all unique
    // First two are plain (no suffix), the rest carry a cycle suffix.
    const plain = names.filter((n) => list.includes(n));
    expect(plain.length).toBe(2);
  });
});
