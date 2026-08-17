import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this as a project site at /match-day/, not the
  // domain root, so built asset URLs need that prefix baked in. Doesn't
  // affect `npm run dev` in a way that matters — Vite serves under the same
  // base locally too. Update this (and the deploy workflow / repo name) if
  // the app ends up published under a different repo name.
  base: "/match-day/",
  plugins: [react()],
  test: {
    // "node" by default keeps the pure-logic tests (the majority — pools,
    // fixtures, standings, knockout, awards) fast and dependency-light —
    // component tests opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock at the top of the file instead
    // of paying that cost globally.
    environment: "node",
    // Scoped to src/ so a plain `npm test` never picks up the Firebase
    // emulator integration tests in firebase-tests/ — those need the
    // emulators running and are run separately via `npm run test:emulator`
    // (see vitest.emulator.config.js).
    include: ["src/**/*.{test,spec}.{js,jsx}"],
  },
});
