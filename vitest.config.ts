import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // scripts/*.test.mjs run under `node --test` (npm run test:scripts).
    exclude: [...configDefaults.exclude, "scripts/**"],
    setupFiles: ["./tests/setup.ts"],
  },
});
