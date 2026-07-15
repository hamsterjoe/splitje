import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/domain/billing/**/*.ts"],
      exclude: [
        "src/domain/billing/**/*.test.ts",
        "src/domain/billing/types.ts",
      ],
      reporter: ["text", "html", "json-summary"],
    },
  },
});