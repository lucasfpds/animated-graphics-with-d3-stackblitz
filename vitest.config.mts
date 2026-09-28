import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // `scripts/**` cobre o runner do CLI do Next, que decide Turbopack vs
    // webpack conforme o ambiente (fora do coverage, que é focado em `src`).
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
    // Os testes validam atributos, textos e ARIA — nunca nomes de classes
    // gerados por CSS Modules, portanto o processamento de CSS é dispensável.
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/index.ts",
        "src/app/**",
        "src/types/**",
        "src/**/*.d.ts",
      ],
    },
  },
});
