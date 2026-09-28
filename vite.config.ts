/// <reference types="vitest/config" />

import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    // Os testes validam atributos, textos e ARIA — nunca nomes de classes
    // gerados por CSS Modules, portanto o processamento de CSS é dispensável.
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/main.ts",
        "src/types/**",
        "src/**/*.d.ts",
      ],
    },
  },
});
