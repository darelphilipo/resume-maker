import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // `__explore.test.tsx` and `__scratch.test.ts` are deprecated stubs (their
    // regressions now live in BasicsForm.test.tsx and computePages.test.ts).
    // File deletion is unavailable in this runner, so they are excluded rather
    // than left as test files with no suite.
    exclude: [
      "e2e/**",
      "node_modules/**",
      "src/components/editor/__explore.test.tsx",
      "src/lib/pagination/__scratch.test.ts",
    ],
    // One jsdom per worker instead of one per file keeps the suite fast while
    // preserving per-file isolation.
    pool: "vmThreads",
  },
});
