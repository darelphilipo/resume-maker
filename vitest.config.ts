import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // `__explore.test.tsx` is a deprecated stub (its regression now lives in
    // BasicsForm.test.tsx). File deletion is unavailable in this runner, so it
    // is excluded rather than left as a test file with no suite.
    exclude: ["e2e/**", "node_modules/**", "src/components/editor/__explore.test.tsx"],
    // One jsdom per worker instead of one per file keeps the suite fast while
    // preserving per-file isolation.
    pool: "vmThreads",
  },
});
