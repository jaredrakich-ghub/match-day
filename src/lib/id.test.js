import { describe, expect, it } from "vitest";
import { generateId, generateJoinCode } from "./id.js";

describe("generateId", () => {
  it("generates unique, non-empty ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id.length).toBeGreaterThan(0);
  });
});

describe("generateJoinCode", () => {
  it("generates a code of the requested length using only unambiguous characters", () => {
    const code = generateJoinCode(6);
    expect(code.length).toBe(6);
    expect(code).not.toMatch(/[01OIL]/);
  });

  it("is very unlikely to collide across many codes", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateJoinCode()));
    expect(codes.size).toBeGreaterThan(190);
  });
});
