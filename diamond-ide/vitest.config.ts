import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      enabled: true,
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["**/*.test.ts", "**/node_modules/**"],
      thresholds: {
        lines: 10,
        branches: 10,
        functions: 10,
        statements: 10
      }
    }
  }
});
